/**
 * Built-in item templates.
 *
 * These templates are seeded into the database on first run. Each template
 * defines a category, description, and a set of fields that items created
 * from it will snapshot.
 */

import type { TemplateField } from "@/db/schema";

export interface BuiltInTemplate {
  name: string;
  category: string;
  description: string;
  fields: TemplateField[];
}

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  {
    name: "Paint",
    category: "paint",
    description: "Paint color and finish information for walls, trim, etc.",
    fields: [
      { key: "brand", label: "Brand", type: "text", required: true },
      { key: "colorName", label: "Color Name", type: "text", required: true },
      { key: "colorCode", label: "Color Code", type: "text" },
      {
        key: "finish",
        label: "Finish",
        type: "select",
        options: ["Flat", "Eggshell", "Satin", "Semi-Gloss", "Gloss"],
      },
      { key: "dateApplied", label: "Date Applied", type: "date" },
      { key: "notes", label: "Notes", type: "text" },
    ],
  },
  {
    name: "Window",
    category: "window",
    description: "Window specifications and installation details",
    fields: [
      { key: "brand", label: "Brand", type: "text" },
      { key: "model", label: "Model", type: "text" },
      {
        key: "material",
        label: "Material",
        type: "select",
        options: ["Vinyl", "Wood", "Aluminum", "Fiberglass", "Composite"],
      },
      {
        key: "style",
        label: "Style",
        type: "select",
        options: ["Double Hung", "Casement", "Sliding", "Picture", "Awning", "Bay/Bow"],
      },
      { key: "width", label: "Width (inches)", type: "number" },
      { key: "height", label: "Height (inches)", type: "number" },
      { key: "installDate", label: "Install Date", type: "date" },
      { key: "warrantyYears", label: "Warranty (years)", type: "number" },
    ],
  },
  {
    name: "Outlet",
    category: "outlet",
    description: "Electrical outlet and switch details",
    fields: [
      {
        key: "type",
        label: "Type",
        type: "select",
        options: ["Standard", "GFCI", "AFCI", "USB", "220V", "Smart"],
        required: true,
      },
      { key: "brand", label: "Brand", type: "text" },
      { key: "amperage", label: "Amperage", type: "select", options: ["15A", "20A", "30A", "50A"] },
      { key: "voltage", label: "Voltage", type: "select", options: ["120V", "240V"] },
      {
        key: "color",
        label: "Color",
        type: "select",
        options: ["White", "Ivory", "Almond", "Black", "Stainless"],
      },
      { key: "installDate", label: "Install Date", type: "date" },
    ],
  },
  {
    name: "Furniture",
    category: "furniture",
    description: "Furniture pieces and their details",
    fields: [
      {
        key: "type",
        label: "Type",
        type: "select",
        options: ["Sofa", "Chair", "Table", "Desk", "Bed", "Dresser", "Shelf", "Cabinet", "Other"],
        required: true,
      },
      { key: "brand", label: "Brand", type: "text" },
      { key: "material", label: "Material", type: "text" },
      { key: "color", label: "Color", type: "text" },
      { key: "dimensions", label: "Dimensions", type: "text" },
      { key: "purchaseDate", label: "Purchase Date", type: "date" },
      { key: "purchasePrice", label: "Purchase Price", type: "number" },
      {
        key: "condition",
        label: "Condition",
        type: "select",
        options: ["New", "Like New", "Good", "Fair", "Poor"],
      },
    ],
  },
  {
    name: "Air Filter",
    category: "air_filter",
    description: "HVAC air filter specifications and replacement schedule",
    fields: [
      { key: "size", label: "Size", type: "text", required: true },
      {
        key: "mervRating",
        label: "MERV Rating",
        type: "select",
        options: ["MERV 8", "MERV 11", "MERV 13", "MERV 16"],
      },
      { key: "brand", label: "Brand", type: "text" },
      {
        key: "type",
        label: "Type",
        type: "select",
        options: ["Disposable", "Washable", "HEPA", "Electrostatic"],
      },
      { key: "lastChanged", label: "Last Changed", type: "date" },
      { key: "replacementIntervalDays", label: "Replacement Interval (days)", type: "number" },
      { key: "nextChangeDue", label: "Next Change Due", type: "date" },
    ],
  },
];
