import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import {
  listCustomTemplates,
  createCustomTemplate,
  updateCustomTemplate,
  deleteCustomTemplate,
  canDeleteCustomTemplate,
  createItem,
} from "@/lib/item";
import type { TemplateField } from "@/db/schema";

vi.mock("@/db/client", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "@/db/client";

const mockGetDb = vi.mocked(getDb);

const mockFields: TemplateField[] = [
  { key: "brand", label: "Brand", type: "text" },
  { key: "model", label: "Model", type: "text" },
];

describe("listCustomTemplates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns custom templates for a home", async () => {
    const mockTemplates = [
      {
        id: "custom-1",
        homeId: "home-1",
        name: "Appliance",
        category: "appliance",
        fields: mockFields,
        isBuiltIn: false,
      },
    ];

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockTemplates),
          }),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await listCustomTemplates("home-1");

    expect(result).toEqual(mockTemplates);
  });
});

describe("createCustomTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a custom template with fields", async () => {
    const newTemplate = {
      id: "custom-1",
      homeId: "home-1",
      name: "Appliance",
      category: "appliance",
      description: "Home appliances",
      fields: mockFields,
      isBuiltIn: false,
    };

    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([newTemplate]),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await createCustomTemplate({
      homeId: "home-1",
      name: "Appliance",
      category: "appliance",
      description: "Home appliances",
      fields: mockFields,
    });

    expect(result).toEqual(newTemplate);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it("creates a template with dropdown field options", async () => {
    const fieldsWithOptions: TemplateField[] = [
      { key: "size", label: "Size", type: "select", options: ["Small", "Medium", "Large"] },
    ];

    const newTemplate = {
      id: "custom-2",
      homeId: "home-1",
      name: "Clothing",
      category: "clothing",
      fields: fieldsWithOptions,
      isBuiltIn: false,
    };

    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([newTemplate]),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await createCustomTemplate({
      homeId: "home-1",
      name: "Clothing",
      category: "clothing",
      fields: fieldsWithOptions,
    });

    expect(result.fields).toEqual(fieldsWithOptions);
  });
});

describe("updateCustomTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates a custom template name", async () => {
    const updatedTemplate = {
      id: "custom-1",
      homeId: "home-1",
      name: "Updated Appliance",
      category: "appliance",
      fields: mockFields,
      isBuiltIn: false,
    };

    const mockDb = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedTemplate]),
          }),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await updateCustomTemplate("custom-1", { name: "Updated Appliance" });

    expect(result?.name).toBe("Updated Appliance");
  });

  it("updates template fields", async () => {
    const newFields: TemplateField[] = [
      { key: "brand", label: "Brand", type: "text" },
      { key: "year", label: "Year", type: "number" },
    ];

    const updatedTemplate = {
      id: "custom-1",
      homeId: "home-1",
      name: "Appliance",
      category: "appliance",
      fields: newFields,
      isBuiltIn: false,
    };

    const mockDb = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedTemplate]),
          }),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await updateCustomTemplate("custom-1", { fields: newFields });

    expect(result?.fields).toEqual(newFields);
  });
});

describe("canDeleteCustomTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns canDelete: true when no items use the template", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await canDeleteCustomTemplate("custom-1");

    expect(result).toEqual({ canDelete: true });
  });

  it("returns canDelete: false when items use the template", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "item-1" }]),
          }),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await canDeleteCustomTemplate("custom-1");

    expect(result).toEqual({
      canDelete: false,
      reason: "Cannot delete template: items are using it",
    });
  });
});

describe("deleteCustomTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes a custom template when no items use it", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    await deleteCustomTemplate("custom-1");

    expect(mockDb.delete).toHaveBeenCalled();
  });

  it("throws when items are using the template", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "item-1" }]),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    await expect(deleteCustomTemplate("custom-1")).rejects.toThrow(
      "Cannot delete template: items are using it",
    );
  });
});

describe("createItem with custom template", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an item from a custom template", async () => {
    const newItem = {
      id: "item-1",
      homeId: "home-1",
      templateId: "custom-1",
      name: "My Appliance",
      roomId: "room-1",
      fields: { brand: "Samsung", model: "RF28" },
    };

    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([newItem]),
        }),
      }),
    };
    mockGetDb.mockResolvedValue(mockDb as any);

    const result = await createItem({
      homeId: "home-1",
      templateId: "custom-1",
      name: "My Appliance",
      roomId: "room-1",
      fields: { brand: "Samsung", model: "RF28" },
    });

    expect(result).toEqual(newItem);
    expect(result.templateId).toBe("custom-1");
  });
});
