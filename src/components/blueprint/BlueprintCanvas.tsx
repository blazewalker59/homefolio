import { useCallback, useEffect, useRef, useState } from "react";
import { Stage, Layer, Line, Rect, Circle, Text, Transformer } from "react-konva";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Frame, MousePointer2, Square, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import {
  createShapeFn,
  updateShapeFn,
  deleteShapeFn,
  setShapeRoomFn,
  createRoomForShapeFn,
} from "@/server/shape";
import { ROOM_CATEGORIES } from "@/lib/room-categories";
import type { InferSelectModel } from "drizzle-orm";
import type { shapes as shapesTable, rooms as roomsTable, ShapePoint } from "@/db/schema";

type Shape = InferSelectModel<typeof shapesTable>;
type Room = InferSelectModel<typeof roomsTable>;

const GRID = 24; // world units per grid cell
const MIN_SCALE = 0.3;
const MAX_SCALE = 3;
const SAVE_DEBOUNCE_MS = 600;

const snap = (v: number) => Math.round(v / GRID) * GRID;
const flatten = (pts: ShapePoint[]) => pts.flatMap((p) => [p.x, p.y]);

type Tool = "select" | "draw";
type SaveStatus = "idle" | "saving" | "saved";

/** Squared distance from point p to segment ab. */
function distToSegmentSq(p: ShapePoint, a: ShapePoint, b: ShapePoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + t * dx;
  const cy = a.y + t * dy;
  return (p.x - cx) ** 2 + (p.y - cy) ** 2;
}

/** Index at which to insert a new vertex so it lands on the edge nearest `p`. */
function nearestEdgeInsertIndex(points: ShapePoint[], p: ShapePoint): number {
  let best = { dist: Infinity, index: points.length };
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const d = distToSegmentSq(p, a, b);
    if (d < best.dist) best = { dist: d, index: i + 1 };
  }
  return best.index;
}

/** A rectangle's four corners as a closed polygon, in world units. */
function rectPoints(x0: number, y0: number, x1: number, y1: number): ShapePoint[] {
  const left = Math.min(x0, x1);
  const right = Math.max(x0, x1);
  const top = Math.min(y0, y1);
  const bottom = Math.max(y0, y1);
  return [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom },
  ];
}

export default function BlueprintCanvas({
  floorId,
  initialShapes,
  rooms,
  onRoomCreated,
  mode,
  onOpenRoom,
}: {
  floorId: string;
  initialShapes: Shape[];
  rooms: Room[];
  onRoomCreated: (room: Room) => void;
  mode: "edit" | "view";
  onOpenRoom: (roomId: string) => void;
}) {
  const editable = mode === "edit";
  const roomName = (roomId: string | null) =>
    roomId ? (rooms.find((r) => r.id === roomId)?.name ?? "Room") : null;
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [tool, setTool] = useState<Tool>("select");
  const [shapes, setShapes] = useState<Shape[]>(initialShapes);
  const [draft, setDraft] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(
    null,
  );
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // True while the selected shape is being dragged or resized — the vertex
  // handles are drawn from state and would lag the live transform, so we hide
  // them until the gesture ends and the geometry is baked back.
  const [manipulating, setManipulating] = useState(false);

  const nodeRefs = useRef(new Map<string, Konva.Line>());
  const trRef = useRef<Konva.Transformer>(null);

  // Reset shapes / selection when switching floors.
  useEffect(() => {
    setShapes(initialShapes);
    setSelectedId(null);
  }, [initialShapes]);

  // Deselect when the draw tool is active.
  useEffect(() => {
    if (tool === "draw") setSelectedId(null);
  }, [tool]);

  // View mode is read-only: drop any in-progress edit state.
  useEffect(() => {
    if (!editable) {
      setTool("select");
      setSelectedId(null);
      setDraft(null);
    }
  }, [editable]);

  // Attach the bounding-box transformer to the selected shape.
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const node = selectedId ? (nodeRefs.current.get(selectedId) ?? null) : null;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selectedId, shapes]);

  // Track in-flight saves so the status pill reflects the whole batch.
  const inFlight = useRef(0);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const beginSave = useCallback(() => {
    inFlight.current += 1;
    setStatus("saving");
  }, []);
  const endSave = useCallback(() => {
    inFlight.current = Math.max(0, inFlight.current - 1);
    if (inFlight.current === 0) setStatus("saved");
  }, []);

  // Measure the container so the Stage fills it responsively.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Flush any pending debounced saves on unmount.
  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);

  const scheduleSave = useCallback(
    (shapeId: string, points: ShapePoint[]) => {
      const existing = timers.current.get(shapeId);
      if (existing) clearTimeout(existing);
      const t = setTimeout(async () => {
        timers.current.delete(shapeId);
        beginSave();
        try {
          await updateShapeFn({ data: { shapeId, points } });
        } catch (err) {
          alert(err instanceof Error ? err.message : "Failed to save");
        } finally {
          endSave();
        }
      }, SAVE_DEBOUNCE_MS);
      timers.current.set(shapeId, t);
    },
    [beginSave, endSave],
  );

  // ── Zoom ──────────────────────────────────────────────────────────────────
  // Button-only zoom (no wheel/pinch): wheel zoom is too sensitive and feels
  // wrong on touch. Each press steps the scale and keeps the canvas center
  // fixed so content doesn't drift into a corner.
  function zoomButton(factor: number) {
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = stage.scaleX();
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, oldScale * factor));
    if (next === oldScale) return;

    const center = { x: size.width / 2, y: size.height / 2 };
    const worldCenter = {
      x: (center.x - stage.x()) / oldScale,
      y: (center.y - stage.y()) / oldScale,
    };
    stage.scale({ x: next, y: next });
    stage.position({
      x: center.x - worldCenter.x * next,
      y: center.y - worldCenter.y * next,
    });
    setScale(next);
  }

  // ── Fit to content ─────────────────────────────────────────────────────
  // Center the bounding box of all shapes in the viewport, scaling down to fit
  // (with padding) but never zooming past 100%.
  const fitToContent = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || size.width === 0 || size.height === 0 || shapes.length === 0) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const s of shapes) {
      for (const p of s.points) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
    }
    const contentW = Math.max(maxX - minX, GRID);
    const contentH = Math.max(maxY - minY, GRID);
    const pad = 0.85;
    const fit = Math.min((size.width * pad) / contentW, (size.height * pad) / contentH);
    const next = Math.min(1, Math.max(MIN_SCALE, fit));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    stage.scale({ x: next, y: next });
    stage.position({ x: size.width / 2 - cx * next, y: size.height / 2 - cy * next });
    setScale(next);
  }, [shapes, size]);

  // Auto-fit once per mount, as soon as the container is measured and shapes
  // exist. The ref guard keeps it from fighting the user's later pan/zoom.
  const didFitRef = useRef(false);
  useEffect(() => {
    if (didFitRef.current) return;
    if (size.width > 0 && size.height > 0 && shapes.length > 0) {
      fitToContent();
      didFitRef.current = true;
    }
  }, [size, shapes, fitToContent]);

  // ── Drawing rectangles ──────────────────────────────────────────────────
  function worldPointer(): ShapePoint | null {
    const stage = stageRef.current;
    if (!stage) return null;
    const p = stage.getRelativePointerPosition();
    return p ? { x: p.x, y: p.y } : null;
  }

  function handlePointerDown(e: KonvaEventObject<PointerEvent>) {
    if (!editable) return; // view mode: pan only, no draw/select
    const onEmpty = e.target === e.target.getStage();
    if (tool === "select") {
      // Tap/click on empty canvas clears the selection.
      if (onEmpty) setSelectedId(null);
      return;
    }
    // Draw tool: only start a draw when pressing on empty canvas.
    if (!onEmpty) return;
    const p = worldPointer();
    if (!p) return;
    setDraft({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
  }

  function handlePointerMove() {
    if (!draft) return;
    const p = worldPointer();
    if (!p) return;
    setDraft((d) => (d ? { ...d, x1: p.x, y1: p.y } : d));
  }

  async function handlePointerUp() {
    if (!draft) return;
    const points = rectPoints(snap(draft.x0), snap(draft.y0), snap(draft.x1), snap(draft.y1));
    setDraft(null);
    const width = Math.abs(points[1].x - points[0].x);
    const height = Math.abs(points[2].y - points[1].y);
    if (width < GRID || height < GRID) return; // ignore stray clicks / tiny rects

    // Optimistic insert with a temp id; reconcile with the server row.
    const tempId = `temp-${timers.current.size}-${points[0].x}-${points[0].y}`;
    const optimistic = {
      id: tempId,
      points,
      pending: true,
    } as unknown as Shape & { pending: true };
    setShapes((prev) => [...prev, optimistic]);

    beginSave();
    try {
      const created = (await createShapeFn({ data: { floorId, points } })) as Shape;
      setShapes((prev) => prev.map((s) => (s.id === tempId ? created : s)));
    } catch (err) {
      setShapes((prev) => prev.filter((s) => s.id !== tempId));
      alert(err instanceof Error ? err.message : "Failed to create shape");
    } finally {
      endSave();
    }
  }

  // ── Moving shapes ─────────────────────────────────────────────────────────
  function handleDragEnd(shapeId: string, node: Konva.Line) {
    setManipulating(false);
    const dx = snap(node.x());
    const dy = snap(node.y());
    node.position({ x: 0, y: 0 });
    if (dx === 0 && dy === 0) return;
    setShapes((prev) =>
      prev.map((s) => {
        if (s.id !== shapeId) return s;
        const moved = s.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
        scheduleSave(shapeId, moved);
        return { ...s, points: moved };
      }),
    );
  }

  // ── Resizing (bounding-box transformer) ──────────────────────────────────
  function handleTransformEnd(shapeId: string, node: Konva.Line) {
    setManipulating(false);
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const offX = node.x();
    const offY = node.y();
    node.scale({ x: 1, y: 1 });
    node.position({ x: 0, y: 0 });
    setShapes((prev) =>
      prev.map((s) => {
        if (s.id !== shapeId) return s;
        const resized = s.points.map((p) => ({
          x: snap(offX + p.x * scaleX),
          y: snap(offY + p.y * scaleY),
        }));
        scheduleSave(shapeId, resized);
        return { ...s, points: resized };
      }),
    );
  }

  // ── Vertex editing (reshape into L-shapes / polygons) ─────────────────────
  function setVertex(shapeId: string, index: number, pos: ShapePoint, persist: boolean) {
    setShapes((prev) =>
      prev.map((s) => {
        if (s.id !== shapeId) return s;
        const points = s.points.map((p, i) => (i === index ? pos : p));
        if (persist) scheduleSave(shapeId, points);
        return { ...s, points };
      }),
    );
  }

  function handleAddVertex(shapeId: string, e: KonvaEventObject<MouseEvent | TouchEvent>) {
    e.cancelBubble = true;
    const stage = stageRef.current;
    const rel = stage?.getRelativePointerPosition();
    if (!rel) return;
    const click = { x: snap(rel.x), y: snap(rel.y) };
    setSelectedId(shapeId);
    setShapes((prev) =>
      prev.map((s) => {
        if (s.id !== shapeId) return s;
        const at = nearestEdgeInsertIndex(s.points, click);
        const points = [...s.points.slice(0, at), click, ...s.points.slice(at)];
        scheduleSave(shapeId, points);
        return { ...s, points };
      }),
    );
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(
    async (shapeId: string) => {
      const isPending = (s?: Shape) => (s as { pending?: boolean } | undefined)?.pending === true;
      if (isPending(shapes.find((s) => s.id === shapeId))) return; // not yet persisted
      setShapes((prev) => prev.filter((s) => s.id !== shapeId));
      setSelectedId((cur) => (cur === shapeId ? null : cur));
      beginSave();
      try {
        await deleteShapeFn({ data: { shapeId } });
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to delete shape");
      } finally {
        endSave();
      }
    },
    [shapes, beginSave, endSave],
  );

  // Delete / Backspace removes the selected shape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        handleDelete(selectedId);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, handleDelete]);

  const selectedShape = selectedId ? (shapes.find((s) => s.id === selectedId) ?? null) : null;

  // ── Room linking ──────────────────────────────────────────────────────────
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomCategory, setNewRoomCategory] = useState<string>("other");
  const [linkBusy, setLinkBusy] = useState(false);

  // Reset the link panel whenever the selection changes.
  useEffect(() => {
    setShowCreateRoom(false);
    setNewRoomName("");
    setNewRoomCategory("other");
  }, [selectedId]);

  function applyRoomId(shapeId: string, roomId: string | null) {
    setShapes((prev) => prev.map((s) => (s.id === shapeId ? { ...s, roomId } : s)));
  }

  async function linkExisting(shapeId: string, roomId: string) {
    setLinkBusy(true);
    try {
      await setShapeRoomFn({ data: { shapeId, roomId } });
      applyRoomId(shapeId, roomId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to link room");
    } finally {
      setLinkBusy(false);
    }
  }

  async function unlink(shapeId: string) {
    setLinkBusy(true);
    try {
      await setShapeRoomFn({ data: { shapeId, roomId: null } });
      applyRoomId(shapeId, null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to unlink room");
    } finally {
      setLinkBusy(false);
    }
  }

  async function createAndLink(shapeId: string) {
    const name = newRoomName.trim();
    if (!name) return;
    setLinkBusy(true);
    try {
      const { room } = await createRoomForShapeFn({
        data: { shapeId, name, category: newRoomCategory },
      });
      onRoomCreated(room as Room);
      applyRoomId(shapeId, (room as Room).id);
      setShowCreateRoom(false);
      setNewRoomName("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setLinkBusy(false);
    }
  }

  // Rooms already placed on another shape — excluded from the picker so the
  // user can't trigger the 1 Room ↔ 1 Shape conflict.
  const linkedElsewhere = new Set(
    shapes.filter((s) => s.id !== selectedId && s.roomId).map((s) => s.roomId as string),
  );
  const availableRooms = rooms.filter((r) => !linkedElsewhere.has(r.id));

  const draftRect = draft
    ? {
        x: Math.min(draft.x0, draft.x1),
        y: Math.min(draft.y0, draft.y1),
        width: Math.abs(draft.x1 - draft.x0),
        height: Math.abs(draft.y1 - draft.y0),
      }
    : null;

  // Generous fixed grid region in world units.
  const GRID_W = 3000;
  const GRID_H = 2000;
  const gridLines: number[][] = [];
  for (let x = 0; x <= GRID_W; x += GRID) gridLines.push([x, 0, x, GRID_H]);
  for (let y = 0; y <= GRID_H; y += GRID) gridLines.push([0, y, GRID_W, y]);

  return (
    <div className="relative">
      {/* Editing toolbar — hidden in view mode. */}
      {editable && (
        <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface-strong)]/90 p-1 shadow-sm backdrop-blur">
          <button
            onClick={() => setTool("select")}
            aria-pressed={tool === "select"}
            title="Select & pan"
            className={`rounded-full p-2 transition ${
              tool === "select"
                ? "bg-[var(--lagoon-deep)] text-[var(--on-accent)]"
                : "text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)]"
            }`}
          >
            <MousePointer2 className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            onClick={() => setTool("draw")}
            aria-pressed={tool === "draw"}
            title="Draw a room"
            className={`rounded-full p-2 transition ${
              tool === "draw"
                ? "bg-[var(--lagoon-deep)] text-[var(--on-accent)]"
                : "text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)]"
            }`}
          >
            <Square className="h-4 w-4" strokeWidth={2} />
          </button>
          {selectedId && tool === "select" && (
            <>
              <span className="mx-0.5 h-5 w-px bg-[var(--line)]" aria-hidden="true" />
              <button
                onClick={() => handleDelete(selectedId)}
                title="Delete shape (Del)"
                className="rounded-full p-2 text-[var(--sea-ink-soft)] transition hover:bg-[var(--danger,#c0392b)]/10 hover:text-[var(--danger,#c0392b)]"
              >
                <Trash2 className="h-4 w-4" strokeWidth={2} />
              </button>
            </>
          )}
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface-strong)]/90 p-1 shadow-sm backdrop-blur">
          <button
            onClick={() => zoomButton(1 / 1.2)}
            title="Zoom out"
            className="rounded-full p-2 text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)]"
          >
            <ZoomOut className="h-4 w-4" strokeWidth={2} />
          </button>
          <span className="w-10 text-center text-xs tabular-nums text-[var(--sea-ink-soft)]">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => zoomButton(1.2)}
            title="Zoom in"
            className="rounded-full p-2 text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)]"
          >
            <ZoomIn className="h-4 w-4" strokeWidth={2} />
          </button>
          <span className="mx-0.5 h-5 w-px bg-[var(--line)]" aria-hidden="true" />
          <button
            onClick={fitToContent}
            title="Fit to content"
            className="rounded-full p-2 text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)]"
          >
            <Frame className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="h-[calc(100svh-12rem)] w-full overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] md:h-[calc(100vh-13rem)]"
        // `touchAction: none` stops the browser from scrolling/zooming the page
        // when the user draws or pans on touch — the canvas owns the gesture.
        style={{ cursor: tool === "draw" ? "crosshair" : "default", touchAction: "none" }}
      >
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          draggable={tool === "select"}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <Layer listening={false}>
            {gridLines.map((pts, i) => (
              <Line key={i} points={pts} stroke="rgba(120,140,150,0.18)" strokeWidth={1} />
            ))}
          </Layer>
          <Layer>
            {shapes.map((s) => {
              const pending = (s as { pending?: boolean }).pending === true;
              const isSelected = s.id === selectedId;
              return (
                <Line
                  key={s.id}
                  ref={(node) => {
                    if (node) nodeRefs.current.set(s.id, node);
                    else nodeRefs.current.delete(s.id);
                  }}
                  points={flatten(s.points)}
                  closed
                  fill={s.color ?? "rgba(31,122,140,0.18)"}
                  stroke="var(--lagoon-deep, #1f7a8c)"
                  strokeWidth={isSelected ? 3 : 2}
                  opacity={pending ? 0.5 : 1}
                  draggable={editable && tool === "select" && !pending}
                  onMouseEnter={(e) => {
                    if (!editable && s.roomId) {
                      const c = e.target.getStage()?.container();
                      if (c) c.style.cursor = "pointer";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!editable) {
                      const c = e.target.getStage()?.container();
                      if (c) c.style.cursor = "default";
                    }
                  }}
                  onMouseDown={(e) => {
                    if (editable && tool === "select" && !pending) {
                      e.cancelBubble = true;
                      setSelectedId(s.id);
                    }
                  }}
                  onClick={() => {
                    // View mode: open the linked room.
                    if (!editable && s.roomId) onOpenRoom(s.roomId);
                  }}
                  onTap={() => {
                    if (!editable) {
                      if (s.roomId) onOpenRoom(s.roomId);
                    } else if (tool === "select" && !pending) {
                      setSelectedId(s.id);
                    }
                  }}
                  onDblClick={(e) => {
                    if (editable && tool === "select" && !pending) handleAddVertex(s.id, e);
                  }}
                  onDblTap={(e) => {
                    if (editable && tool === "select" && !pending) handleAddVertex(s.id, e);
                  }}
                  onDragStart={() => setManipulating(true)}
                  onTransformStart={() => setManipulating(true)}
                  onDragEnd={(e) => handleDragEnd(s.id, e.target as Konva.Line)}
                  onTransformEnd={(e) => handleTransformEnd(s.id, e.target as Konva.Line)}
                />
              );
            })}

            {/* Room-name / label text centered on each shape. Non-interactive
                so it never intercepts selection or drags. */}
            {shapes.map((s) => {
              const text = roomName(s.roomId) ?? s.label;
              if (!text) return null;
              const xs = s.points.map((p) => p.x);
              const ys = s.points.map((p) => p.y);
              const minX = Math.min(...xs);
              const maxX = Math.max(...xs);
              const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
              return (
                <Text
                  key={`${s.id}-label`}
                  x={minX}
                  y={cy - 8}
                  width={maxX - minX}
                  align="center"
                  text={text}
                  fontSize={13}
                  fontStyle={s.roomId ? "bold" : "normal"}
                  fill="var(--sea-ink, #1c3a44)"
                  listening={false}
                />
              );
            })}

            {/* Bounding-box resize handles for the selected shape. Snap happens
                on release (in handleTransformEnd), matching move behaviour. */}
            <Transformer
              ref={trRef}
              rotateEnabled={false}
              keepRatio={false}
              ignoreStroke
              anchorSize={9}
              borderStroke="var(--lagoon-deep, #1f7a8c)"
              anchorStroke="var(--lagoon-deep, #1f7a8c)"
            />

            {/* Draggable vertices for the selected shape. Drag to reshape;
                double-click an edge to add a new vertex (carve an L-shape). */}
            {tool === "select" &&
              !manipulating &&
              selectedShape &&
              (selectedShape as { pending?: boolean }).pending !== true &&
              selectedShape.points.map((p, i) => (
                <Circle
                  key={`${selectedShape.id}-v${i}`}
                  x={p.x}
                  y={p.y}
                  radius={6}
                  fill="#ffffff"
                  stroke="var(--lagoon-deep, #1f7a8c)"
                  strokeWidth={2}
                  draggable
                  onDragMove={(e) =>
                    setVertex(selectedShape.id, i, { x: e.target.x(), y: e.target.y() }, false)
                  }
                  onDragEnd={(e) => {
                    const pos = { x: snap(e.target.x()), y: snap(e.target.y()) };
                    e.target.position(pos);
                    setVertex(selectedShape.id, i, pos, true);
                  }}
                />
              ))}

            {draftRect && (
              <Rect
                x={draftRect.x}
                y={draftRect.y}
                width={draftRect.width}
                height={draftRect.height}
                fill="rgba(31,122,140,0.12)"
                stroke="var(--lagoon-deep, #1f7a8c)"
                strokeWidth={1}
                dash={[6, 4]}
              />
            )}
          </Layer>
        </Stage>
      </div>

      {/* Save status — bottom-right, clear of both toolbars on narrow screens. */}
      {status !== "idle" && (
        <span className="pointer-events-none absolute bottom-3 right-3 z-10 rounded-full border border-[var(--line)] bg-[var(--surface-strong)]/90 px-3 py-1 text-xs text-[var(--sea-ink-soft)] backdrop-blur">
          {status === "saving" ? "Saving…" : "Saved"}
        </span>
      )}

      {/* Room-link inspector — appears when a shape is selected. */}
      {tool === "select" &&
        selectedShape &&
        (selectedShape as { pending?: boolean }).pending !== true && (
          <div className="absolute bottom-3 left-3 z-10 w-64 rounded-xl border border-[var(--line)] bg-[var(--surface-strong)]/95 p-3 shadow-lg backdrop-blur">
            <p className="island-kicker mb-2">Room</p>
            {selectedShape.roomId ? (
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-[var(--sea-ink)]">
                  {roomName(selectedShape.roomId)}
                </span>
                <button
                  onClick={() => unlink(selectedShape.id)}
                  disabled={linkBusy}
                  className="shrink-0 rounded-full border border-[var(--line)] px-3 py-1 text-xs font-medium text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)] disabled:opacity-50"
                >
                  Unlink
                </button>
              </div>
            ) : showCreateRoom ? (
              <div className="space-y-2">
                <input
                  autoFocus
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Room name"
                  className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-2 py-1.5 text-sm text-[var(--sea-ink)]"
                />
                <select
                  value={newRoomCategory}
                  onChange={(e) => setNewRoomCategory(e.target.value)}
                  className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-2 py-1.5 text-sm text-[var(--sea-ink)]"
                >
                  {ROOM_CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => createAndLink(selectedShape.id)}
                    disabled={linkBusy || !newRoomName.trim()}
                    className="flex-1 rounded-lg bg-[var(--lagoon-deep)] px-3 py-1.5 text-xs font-semibold text-[var(--on-accent)] transition hover:opacity-90 disabled:opacity-50"
                  >
                    {linkBusy ? "Creating…" : "Create & link"}
                  </button>
                  <button
                    onClick={() => setShowCreateRoom(false)}
                    disabled={linkBusy}
                    className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--sea-ink)] transition hover:bg-[var(--link-bg-hover)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <select
                  value=""
                  disabled={linkBusy}
                  onChange={(e) => e.target.value && linkExisting(selectedShape.id, e.target.value)}
                  className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-2 py-1.5 text-sm text-[var(--sea-ink)] disabled:opacity-50"
                >
                  <option value="">
                    {availableRooms.length ? "Link to an existing room…" : "No unplaced rooms"}
                  </option>
                  {availableRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowCreateRoom(true)}
                  disabled={linkBusy}
                  className="w-full rounded-lg border border-dashed border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--sea-ink-soft)] transition hover:border-[var(--lagoon-deep)] hover:text-[var(--lagoon-deep)] disabled:opacity-50"
                >
                  ＋ New room
                </button>
              </div>
            )}
          </div>
        )}
    </div>
  );
}
