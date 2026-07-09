/**
 * Al-Nassim Master Catalog — Centralized Lookup Data
 * 
 * All controlled vocabularies, taxonomy hierarchies, and lookup tables
 * are defined here. UI components and API routes must reference this
 * single source of truth so that future updates require minimal code changes.
 * 
 * Source: Al-Nassim Master Catalog Data Dictionary & Schema Documentation V1.0
 * Workbook Version: V8 (FINAL)
 */

// ─────────────────────────────────────────────────────────────
// 1. BRAND LOOKUP (with Arabic + Code)
// ─────────────────────────────────────────────────────────────
export interface BrandEntry {
  brand: string;
  brandAr: string;
  brandCode: string;
}

export const BRAND_LOOKUP: BrandEntry[] = [
  { brand: "Al-Nassim China", brandAr: "نيصلا ميسنلا", brandCode: "017" },
  { brand: "Local Companies", brandAr: "ةيلحم تاكرش", brandCode: "006" },
];

export const BRAND_OPTIONS = BRAND_LOOKUP.map((b) => b.brand);

/** Auto-fill Brand AR and Brand Code from Brand selection */
export function getBrandDerivatives(brand: string | null): { brandAr: string; brandCode: string } {
  const entry = BRAND_LOOKUP.find((b) => b.brand === brand);
  return {
    brandAr: entry?.brandAr ?? "",
    brandCode: entry?.brandCode ?? "",
  };
}

// ─────────────────────────────────────────────────────────────
// 2. TAXONOMY HIERARCHY (Department → Category → Subcategory)
// ─────────────────────────────────────────────────────────────
export interface TaxonomyEntry {
  department: string;
  category: string;
  subcategory: string | null; // null = no subcategory for this category
}

export const TAXONOMY: TaxonomyEntry[] = [
  // Houseware
  { department: "Houseware", category: "Cleaning Tools", subcategory: "Surface Cleaning" },
  { department: "Houseware", category: "Cleaning Tools", subcategory: "Toilet & Drain" },
  { department: "Houseware", category: "Home & Outdoor", subcategory: "Laundry Essentials" },
  { department: "Houseware", category: "Home & Outdoor", subcategory: "Picnic Collection" },
  { department: "Houseware", category: "Home & Outdoor", subcategory: "Storage & Packaging" },
  { department: "Houseware", category: "Kitchenware", subcategory: "Cooking & Utensils" },
  { department: "Houseware", category: "Kitchenware", subcategory: "Cutlery & Cleaver" },
  { department: "Houseware", category: "Kitchenware", subcategory: "Drinkware" },
  // Supermarket Equipment
  { department: "Supermarket Equipment", category: "Accessories", subcategory: null },
  { department: "Supermarket Equipment", category: "Checkout Solutions", subcategory: null },
  { department: "Supermarket Equipment", category: "Cooling Appliances", subcategory: "Coolers & Chillers" },
  { department: "Supermarket Equipment", category: "Cooling Appliances", subcategory: "Freezers" },
  { department: "Supermarket Equipment", category: "Shelves & Stands", subcategory: "Shelves" },
  { department: "Supermarket Equipment", category: "Shelves & Stands", subcategory: "Stands" },
  { department: "Supermarket Equipment", category: "Trolleys & Baskets", subcategory: "Baskets" },
  { department: "Supermarket Equipment", category: "Trolleys & Baskets", subcategory: "Trolleys" },
  // Warehouse Equipment
  { department: "Warehouse Equipment", category: "Forklifts & Pallets", subcategory: "Forklifts" },
  { department: "Warehouse Equipment", category: "Forklifts & Pallets", subcategory: "Pallets" },
  { department: "Warehouse Equipment", category: "Heavy Duty Racking", subcategory: null },
  { department: "Warehouse Equipment", category: "Trolleys & Baskets", subcategory: "Baskets" },
  { department: "Warehouse Equipment", category: "Trolleys & Baskets", subcategory: "Trolleys" },
];

export const DEPARTMENTS = [...new Set(TAXONOMY.map((t) => t.department))];

export function getCategoriesForDepartment(department: string | null): string[] {
  if (!department) return [];
  return [...new Set(TAXONOMY.filter((t) => t.department === department).map((t) => t.category))];
}

export function getSubcategoriesForCategory(department: string | null, category: string | null): string[] {
  if (!department || !category) return [];
  const subs = TAXONOMY.filter((t) => t.department === department && t.category === category).map((t) => t.subcategory);
  // Filter out nulls and return; if all are null, return empty array
  return subs.filter((s): s is string => s !== null);
}

export function categoryHasSubcategories(department: string | null, category: string | null): boolean {
  if (!department || !category) return false;
  return TAXONOMY.some((t) => t.department === department && t.category === category && t.subcategory !== null);
}

// ─────────────────────────────────────────────────────────────
// 3. SECTION CODE (auto-derived from Department)
// ─────────────────────────────────────────────────────────────
export const SECTION_CODE_LOOKUP: Record<string, string> = {
  Houseware: "102",
  "Supermarket Equipment": "103",
  "Warehouse Equipment": "104", // future
};

export function getSectionCodeForDepartment(department: string | null): string {
  if (!department) return "";
  return SECTION_CODE_LOOKUP[department] ?? "";
}

// ─────────────────────────────────────────────────────────────
// 4. PRODUCT FAMILY → PRODUCT TYPE MAPPING
// ─────────────────────────────────────────────────────────────

// Mapping: Subcategory → valid Product Families
export const SUBCATEGORY_TO_FAMILIES: Record<string, string[]> = {
  "Cooking & Utensils": ["Cookware", "Kitchen Tools", "Food Storage"],
  "Cutlery & Cleaver": ["Cutlery", "Kitchen Tools"],
  "Drinkware": ["Drinkware"],
  "Surface Cleaning": ["Cleaning"],
  "Toilet & Drain": ["Cleaning"],
  "Laundry Essentials": ["Cleaning", "Linens"],
  "Picnic Collection": ["Outdoor Cooking", "Sets"],
  "Storage & Packaging": ["Storage", "Buckets", "Food Storage"],
  "Coolers & Chillers": ["Buckets"],
  "Freezers": ["Buckets"],
  Shelves: ["Storage"],
  Stands: ["Storage"],
  Baskets: ["Buckets", "Storage"],
  Trolleys: ["Sets"],
  Forklifts: ["Sets"],
  Pallets: ["Storage"],
};

// All 14 Product Families
export const PRODUCT_FAMILIES = [
  "Kitchen Tools",
  "Cookware",
  "Cutlery",
  "Cleaning",
  "Food Storage",
  "Storage",
  "Tableware",
  "Outdoor Cooking",
  "Drinkware",
  "Sets",
  "Buckets",
  "Linens",
  "Paper Goods",
  "Uncategorized",
] as const;

export function getFamiliesForSubcategory(subcategory: string | null): string[] {
  if (!subcategory) return [...PRODUCT_FAMILIES];
  return SUBCATEGORY_TO_FAMILIES[subcategory] ?? [...PRODUCT_FAMILIES];
}

// Product Family → Product Types mapping (from Appendix B)
export const FAMILY_TO_TYPES: Record<string, string[]> = {
  "Kitchen Tools": [
    "Wooden Tool", "Scale", "Vegetable Slicer", "Power Strip", "Sprayer", "Gas Stove",
    "Food Storage Container", "Cutter", "Cutting Board", "Box", "Clothesline", "Rack",
    "Coffee Pot", "Slippers", "Adhesive Tape", "Slotted Spoon", "Whisk", "Gloves",
    "Insecticide", "Mortar", "Masher", "Dining Spoon", "Toothpick", "Floor Mop", "Bowl",
    "Potato Peeler", "Cup", "Ashtray", "Juicer", "Lint Roller", "Sharpening Steel",
    "Hanger", "Pricing Label Gun", "Ladle", "Insect Catcher", "Dining Cover Curtain",
    "Rolling Pin", "Tray", "Dishwashing Wire", "Bath Loofah", "Household Ladder",
    "Clothes Peg", "Packing Tape", "Flower Pen", "Knife", "Charging Cable",
    "Mouse Glue Trap", "Ice Cream Mold", "Ice Cream Scoop", "Cream Decoration Bag",
    "Tea Bag", "Pastry Punch", "Vegetable Chopper", "Hand Duster", "Gas Hose",
    "Container", "Gas Burner Stove", "Flame Diffuser", "Drinking Glass Set",
    "Ice Tongs", "Tea Spoon", "Cleaning Brush", "Insect Sticky Trap", "Fan",
    "Strainer", "Cake Decoration Bag", "Cotton Swab", "Set", "Double-Sided Foam Tape",
    "Brush", "Broom", "Window Squeegee", "Bathroom Mat", "Fruit Juicer", "Roll",
    "Pricing Ink Roller", "Grain Grinder", "Water Filter", "Shaving Machine",
    "Washing Machine Cover", "Gas Cover", "Machine", "Fire Insulator", "Binding Thread",
    "Pasta Spoon", "Turner", "Liquid Dropper", "Meat Injector", "Garbage Bag",
    "Silicone Spoon", "Holder", "Shoe Polish Sponge", "Clothes Hanger", "Funnel",
    "Shoe Cover", "Incense", "Zucchini Corer", "Display Screen", "Salt Shaker",
  ],
  Cookware: [
    "Strainer", "Pan", "Cooking Pot", "Flask", "Frying Pan", "Set", "Tray", "Casserole",
    "Soup Ladle", "Food Cover", "Slotted Spoon", "Serving Bowl", "Salt Shaker",
    "Griddle", "Cutter", "Wooden Tool", "Juicer", "Funnel", "Vegetable Chopper",
    "Bowl", "Buffet Warmer",
  ],
  Cutlery: [
    "Knife", "Cutter", "Scissors", "Fork", "Wooden Tool", "Peeler", "Sharpening Steel",
    "Kitchen Cleaver", "Dining Spoon", "Dining Fork", "Bottle", "Set", "Cleaver",
    "Vegetable Slicer", "Portable Stove Oven",
  ],
  Cleaning: [
    "Broom", "Brush", "Floor Mop", "Cutter", "Dishwashing Wire", "Trolley",
    "Vacuum Cleaner", "Dishwashing Sponge", "Drain Piston Cleaner", "Mop", "Juicer",
    "Mosquito Repellent", "Drain Cleaner", "Sticky Fly Trap", "Mouse Trap", "Garbage Bag",
  ],
  "Food Storage": ["Container"],
  Storage: [
    "Wooden Tool", "Potato Peeler", "Basket", "Cutter", "Meat Tenderizer", "Set",
    "Container", "Juicer", "Whisk", "Slotted Spoon", "Vegetable Peeler", "Fire Insulator",
    "Ladle", "Garlic Press", "Almond Cracker", "Peeler", "Fish Scaler", "Drum", "Brush",
    "Fork", "Ice Cream Scoop",
  ],
  Tableware: ["Tray", "Plate", "Serving Bowl", "Plate Rack"],
  "Outdoor Cooking": [
    "Grill", "Ice Tongs", "Tool", "Gas Heater", "Plastic Hobby Box", "Fish Scaler",
    "Gas Burner Stove",
  ],
  Drinkware: ["Cup", "Bottle", "Flask", "Pitcher"],
  Sets: ["Bag", "Chair", "Set", "Table", "Dustpan", "Shelf"],
  Buckets: [
    "Bucket", "Basket", "Box", "Strainer", "Cutter", "Serving Bowl", "Mug",
    "Juice Straw", "Water Dispenser", "Juicer", "Fruit Juicer", "Tray", "Plastic Spoon",
    "Food Storage Cover", "Sprayer", "Household Ladder", "Coffee Spoon", "Measuring Cup",
    "Grinder", "Holder", "Ice Tongs", "Masher",
  ],
  Linens: ["Towel"],
  "Paper Goods": ["Tissue"],
  Uncategorized: [
    "Cooking Pot", "Pressure Cooker", "Food Storage Bag", "Gloves", "Arabic Coffee Pot",
    "Hamburger Press", "Food Storage Cover", "Bowl", "Baking Tray", "Falafel Maker Mold",
    "Floor Adhesive",
  ],
};

export function getTypesForFamily(family: string | null): string[] {
  if (!family) return [];
  return FAMILY_TO_TYPES[family] ?? [];
}

// All Product Types (flattened, unique, sorted)
export const ALL_PRODUCT_TYPES = [...new Set(Object.values(FAMILY_TO_TYPES).flat())].sort();

// ─────────────────────────────────────────────────────────────
// 5. COLOR LOOKUP (with Arabic)
// ─────────────────────────────────────────────────────────────
export interface ColorEntry {
  color: string;
  colorAr: string;
}

export const COLOR_LOOKUP: ColorEntry[] = [
  { color: "Black", colorAr: "دوسأ" },
  { color: "White", colorAr: "ضيبأ" },
  { color: "Clear", colorAr: "فافش" },
  { color: "Silver", colorAr: "يضف" },
  { color: "Gold", colorAr: "يبهذ" },
  { color: "Red", colorAr: "رمحأ" },
  { color: "Yellow", colorAr: "رفصأ" },
  { color: "Green", colorAr: "رضخأ" },
  { color: "Blue", colorAr: "قرزأ" },
  { color: "Gray", colorAr: "يامر" },
  { color: "Orange", colorAr: "يلاقترب" },
  { color: "Brown", colorAr: "ينب" },
  { color: "Beige", colorAr: "جيب" },
  { color: "Purple", colorAr: "يجسفنب" },
  { color: "Pink", colorAr: "يدرو" },
];

export const COLOR_OPTIONS = COLOR_LOOKUP.map((c) => c.color);

/** Auto-fill Color AR from Color selection */
export function getColorAr(color: string | null): string {
  if (!color) return "";
  return COLOR_LOOKUP.find((c) => c.color === color)?.colorAr ?? "";
}

// ─────────────────────────────────────────────────────────────
// 6. MATERIAL LOOKUP (with Arabic)
// ─────────────────────────────────────────────────────────────
export interface MaterialEntry {
  material: string;
  materialAr: string;
}

export const MATERIAL_LOOKUP: MaterialEntry[] = [
  { material: "Plastic", materialAr: "كيتسلاب" },
  { material: "Stainless Steel", materialAr: "ليتس سلناتس" },
  { material: "Wooden", materialAr: "بشخ" },
  { material: "Granite", materialAr: "تينارج" },
  { material: "Glass", materialAr: "جاجز" },
  { material: "Steel", materialAr: "ديدح" },
  { material: "Aluminum", materialAr: "موينملأ" },
  { material: "Paper", materialAr: "قرو" },
  { material: "Cotton", materialAr: "نطق" },
  { material: "Silicone", materialAr: "نوكيليس" },
  { material: "Microfiber", materialAr: "ربايروفوركيم" },
  { material: "Melamine", materialAr: "نيملايم" },
  { material: "Chrome", materialAr: "مورك" },
  { material: "Porcelain", materialAr: "نلاسروب" },
  { material: "Ceramic", materialAr: "كيماريس" },
];

export const MATERIAL_OPTIONS = MATERIAL_LOOKUP.map((m) => m.material);

/** Auto-fill Material AR from Material selection */
export function getMaterialAr(material: string | null): string {
  if (!material) return "";
  return MATERIAL_LOOKUP.find((m) => m.material === material)?.materialAr ?? "";
}

// ─────────────────────────────────────────────────────────────
// 7. UNIT LISTS
// ─────────────────────────────────────────────────────────────
export const UNIT_OPTIONS = ["PCS", "PKT", "CTN", "ROLL", "BUNDLE"] as const;

export const CAPACITY_UNIT_OPTIONS = ["L", "ml", "kg", "g"] as const;

export const WEIGHT_UNIT_OPTIONS = ["kg", "g"] as const;

export const DIMENSION_UNIT_OPTIONS = ["cm", "mm", "inch"] as const;

// ─────────────────────────────────────────────────────────────
// 8. SHAPE, FINISH, ADDITIONAL INFORMATION
// ─────────────────────────────────────────────────────────────
export const SHAPE_OPTIONS = ["Square", "Round", "Rectangular", "Oval", "Circular"] as const;

export const FINISH_OPTIONS = ["Coated", "Chrome", "Black Chrome", "Polished", "Matte", "Powder-coated"] as const;

export const ADDITIONAL_INFO_OPTIONS = [
  "with Lid", "Glass Lid", "with Wheels", "Foldable", "with Handle",
] as const;

// ─────────────────────────────────────────────────────────────
// 9. VALIDATION STATUS & COUNTRY
// ─────────────────────────────────────────────────────────────
export const VALIDATION_STATUS_OPTIONS = ["Validated", "Pending Review", "Draft", "Rejected"] as const;

export const MIN_SALES_MULTIPLES_OPTIONS = ["No", "Yes"] as const;

// Country list (ISO 3166 - common trading partners for Kuwait/GCC)
export const COUNTRY_OPTIONS = [
  "China", "India", "Turkey", "UAE", "Germany", "Italy", "Vietnam",
  "South Korea", "Japan", "Thailand", "Indonesia", "Malaysia",
  "Brazil", "United States", "United Kingdom", "France", "Spain",
  "Netherlands", "Poland", "Hungary", "Slovakia", "Ukraine",
  "Saudi Arabia", "Kuwait", "Bahrain", "Qatar", "Oman", "Egypt",
  "Jordan", "Lebanon", "Morocco", "Tunisia", "Pakistan", "Bangladesh",
  "Philippines", "Sri Lanka", "Taiwan", "Hong Kong",
] as const;

// ─────────────────────────────────────────────────────────────
// 10. AUTO-DERIVATION HELPERS
// ─────────────────────────────────────────────────────────────

/** Generate default Short Desc AR from Name AR */
export function deriveShortDescAr(nameAr: string | null): string {
  return nameAr ?? "";
}

/** Generate default Short Desc EN from Name EN */
export function deriveShortDescEn(nameEn: string | null): string {
  return nameEn ?? "";
}

/** Generate default Long Desc EN from Brand + Name EN */
export function deriveLongDescEn(brand: string | null, nameEn: string | null): string {
  if (!brand && !nameEn) return "";
  const parts = [brand, nameEn].filter(Boolean);
  return parts.join(". ") + ".";
}

/** Generate default SEO Title AR from Name AR */
export function deriveSeoTitleAr(nameAr: string | null): string {
  return nameAr ?? "";
}

/** Generate default SEO Description EN from Brand + Product Type */
export function deriveSeoDescEn(brand: string | null, productType: string | null): string {
  const parts = [brand, productType].filter(Boolean);
  if (parts.length === 0) return "";
  return parts.join(" ") + ". Available in Kuwait.";
}

/** Generate default SEO Description AR from Brand AR + Product Type */
export function deriveSeoDescAr(brandAr: string | null, productType: string | null): string {
  const parts = [brandAr, productType].filter(Boolean);
  if (parts.length === 0) return "";
  return parts.join("، ");
}

/** Generate default Search Keywords from Brand + Product Family + Product Type */
export function deriveSearchKeywords(brand: string | null, productFamily: string | null, productType: string | null): string {
  const parts = [brand, productFamily, productType].filter(Boolean);
  return parts.join(" | ");
}

// ─────────────────────────────────────────────────────────────
// 11. COLUMN DEFINITIONS (for import/export)
// ─────────────────────────────────────────────────────────────

export interface ColumnDef {
  /** Prisma field name */
  field: string;
  /** Excel column header */
  header: string;
  /** Second-row sub-header (for grouped headers) */
  subHeader?: string;
  /** Logical group name */
  group: string;
  /** Column group span (for merged header row) */
  groupSpan?: number;
  /** Data type for parsing */
  type: "string" | "number" | "integer" | "decimal" | "boolean";
  /** Whether the field is mandatory */
  mandatory: boolean;
  /** Whether the field is auto-derived (read-only in forms) */
  autoDerived: boolean;
  /** Whether the field is auto-generated (read-only, never user-edited) */
  autoGenerated: boolean;
  /** Field kind determines the UI component */
  kind: "free-text" | "dropdown" | "dependent-dropdown" | "auto-derived" | "auto-generated" | "numeric" | "arabic-text" | "pipe-separated";
  /** Lookup name for dropdown fields */
  lookupName?: string;
  /** Parent field for dependent dropdowns */
  dependsOn?: string;
  /** Validation regex pattern */
  pattern?: string;
}

export const COLUMN_DEFS: ColumnDef[] = [
  // Product Identity Group (10 cols)
  { field: "sourceRow", header: "Source Row", group: "Product Identity", type: "integer", mandatory: true, autoDerived: false, autoGenerated: true, kind: "auto-generated" },
  { field: "productId", header: "Product ID", group: "Product Identity", type: "string", mandatory: true, autoDerived: false, autoGenerated: false, kind: "free-text" },
  { field: "sku", header: "SKU", group: "Product Identity", type: "string", mandatory: true, autoDerived: false, autoGenerated: false, kind: "free-text" },
  { field: "ndNumber", header: "ND Number", group: "Product Identity", type: "string", mandatory: false, autoDerived: false, autoGenerated: false, kind: "free-text" },
  { field: "barcode", header: "Barcode", group: "Product Identity", type: "string", mandatory: true, autoDerived: false, autoGenerated: false, kind: "free-text" },
  { field: "legacyCode", header: "Legacy Code", group: "Product Identity", type: "string", mandatory: false, autoDerived: false, autoGenerated: false, kind: "free-text" },
  { field: "brand", header: "Brand", group: "Product Identity", type: "string", mandatory: true, autoDerived: false, autoGenerated: false, kind: "dropdown", lookupName: "brand" },
  { field: "brandAr", header: "Brand AR", group: "Product Identity", type: "string", mandatory: true, autoDerived: true, autoGenerated: false, kind: "auto-derived", dependsOn: "brand" },
  { field: "brandCode", header: "Brand Code", group: "Product Identity", type: "string", mandatory: true, autoDerived: true, autoGenerated: false, kind: "auto-derived", dependsOn: "brand" },
  { field: "model", header: "Model", group: "Product Identity", type: "string", mandatory: false, autoDerived: false, autoGenerated: false, kind: "free-text" },
  // Classification Group (6 cols)
  { field: "department", header: "Department", group: "Classification", type: "string", mandatory: true, autoDerived: false, autoGenerated: false, kind: "dropdown", lookupName: "department" },
  { field: "category", header: "Category", group: "Classification", type: "string", mandatory: true, autoDerived: false, autoGenerated: false, kind: "dependent-dropdown", lookupName: "category", dependsOn: "department" },
  { field: "subcategory", header: "Subcategory", group: "Classification", type: "string", mandatory: false, autoDerived: false, autoGenerated: false, kind: "dependent-dropdown", lookupName: "subcategory", dependsOn: "category" },
  { field: "sectionCode", header: "Section Code", group: "Classification", type: "string", mandatory: true, autoDerived: true, autoGenerated: false, kind: "auto-derived", dependsOn: "department" },
  { field: "productFamily", header: "Product Family", group: "Classification", type: "string", mandatory: true, autoDerived: false, autoGenerated: false, kind: "dependent-dropdown", lookupName: "productFamily", dependsOn: "subcategory" },
  { field: "productType", header: "Product Type", group: "Classification", type: "string", mandatory: true, autoDerived: false, autoGenerated: false, kind: "dependent-dropdown", lookupName: "productType", dependsOn: "productFamily" },
  // Product Information Group (6 cols)
  { field: "nameAr", header: "Name AR", group: "Product Information", type: "string", mandatory: true, autoDerived: false, autoGenerated: false, kind: "arabic-text" },
  { field: "nameEn", header: "Name EN", group: "Product Information", type: "string", mandatory: true, autoDerived: false, autoGenerated: false, kind: "free-text" },
  { field: "shortDescAr", header: "Short Desc AR", group: "Product Information", type: "string", mandatory: true, autoDerived: true, autoGenerated: false, kind: "arabic-text", dependsOn: "nameAr" },
  { field: "shortDescEn", header: "Short Desc EN", group: "Product Information", type: "string", mandatory: true, autoDerived: true, autoGenerated: false, kind: "free-text", dependsOn: "nameEn" },
  { field: "longDescAr", header: "Long Desc AR", group: "Product Information", type: "string", mandatory: false, autoDerived: false, autoGenerated: false, kind: "arabic-text" },
  { field: "longDescEn", header: "Long Desc EN", group: "Product Information", type: "string", mandatory: true, autoDerived: true, autoGenerated: false, kind: "free-text" },
  // Attributes Group (13 cols)
  { field: "color", header: "Color", group: "Attributes", type: "string", mandatory: false, autoDerived: false, autoGenerated: false, kind: "dropdown", lookupName: "color" },
  { field: "colorAr", header: "Color AR", group: "Attributes", type: "string", mandatory: false, autoDerived: true, autoGenerated: false, kind: "auto-derived", dependsOn: "color" },
  { field: "material", header: "Material", group: "Attributes", type: "string", mandatory: false, autoDerived: false, autoGenerated: false, kind: "dropdown", lookupName: "material" },
  { field: "materialAr", header: "Material AR", group: "Attributes", type: "string", mandatory: false, autoDerived: true, autoGenerated: false, kind: "auto-derived", dependsOn: "material" },
  { field: "capacity", header: "Capacity", group: "Attributes", type: "decimal", mandatory: false, autoDerived: false, autoGenerated: false, kind: "numeric" },
  { field: "capacityUnit", header: "Capacity Unit", group: "Attributes", type: "string", mandatory: false, autoDerived: false, autoGenerated: false, kind: "dropdown", lookupName: "capacityUnit" },
  { field: "weight", header: "Weight", group: "Attributes", type: "decimal", mandatory: false, autoDerived: false, autoGenerated: false, kind: "numeric" },
  { field: "weightUnit", header: "Weight Unit", group: "Attributes", type: "string", mandatory: false, autoDerived: false, autoGenerated: false, kind: "dropdown", lookupName: "weightUnit" },
  { field: "length", header: "Length", group: "Attributes", type: "decimal", mandatory: false, autoDerived: false, autoGenerated: false, kind: "numeric" },
  { field: "width", header: "Width", group: "Attributes", type: "decimal", mandatory: false, autoDerived: false, autoGenerated: false, kind: "numeric" },
  { field: "height", header: "Height", group: "Attributes", type: "decimal", mandatory: false, autoDerived: false, autoGenerated: false, kind: "numeric" },
  { field: "diameter", header: "Diameter", group: "Attributes", type: "decimal", mandatory: false, autoDerived: false, autoGenerated: false, kind: "numeric" },
  { field: "dimensionUnit", header: "Dimension Unit", group: "Attributes", type: "string", mandatory: false, autoDerived: false, autoGenerated: false, kind: "dropdown", lookupName: "dimensionUnit" },
  // Logistics Group (3 cols)
  { field: "countryOfOrigin", header: "Country of Origin", group: "Logistics", type: "string", mandatory: false, autoDerived: false, autoGenerated: false, kind: "dropdown", lookupName: "country" },
  { field: "unit", header: "Unit", group: "Logistics", type: "string", mandatory: true, autoDerived: false, autoGenerated: false, kind: "dropdown", lookupName: "unit" },
  { field: "minSalesMultiples", header: "Min Sales Multiples", group: "Logistics", type: "string", mandatory: true, autoDerived: false, autoGenerated: false, kind: "dropdown", lookupName: "minSalesMultiples" },
  // Commercial Group (1 col)
  { field: "defaultPrice", header: "Default Price", group: "Commercial", type: "decimal", mandatory: false, autoDerived: false, autoGenerated: false, kind: "numeric" },
  // SEO Group (5 cols)
  { field: "seoTitleEn", header: "SEO Title EN", group: "SEO", type: "string", mandatory: false, autoDerived: false, autoGenerated: false, kind: "free-text" },
  { field: "seoTitleAr", header: "SEO Title AR", group: "SEO", type: "string", mandatory: true, autoDerived: true, autoGenerated: false, kind: "arabic-text", dependsOn: "nameAr" },
  { field: "seoDescriptionEn", header: "SEO Description EN", group: "SEO", type: "string", mandatory: true, autoDerived: true, autoGenerated: false, kind: "free-text" },
  { field: "seoDescriptionAr", header: "SEO Description AR", group: "SEO", type: "string", mandatory: true, autoDerived: true, autoGenerated: false, kind: "arabic-text" },
  { field: "searchKeywords", header: "Search Keywords", group: "SEO", type: "string", mandatory: true, autoDerived: true, autoGenerated: false, kind: "pipe-separated" },
  // Internal Group (8 cols)
  { field: "internalNotes", header: "Internal Notes", group: "Internal", type: "string", mandatory: false, autoDerived: false, autoGenerated: false, kind: "free-text" },
  { field: "validationStatus", header: "Validation Status", group: "Internal", type: "string", mandatory: true, autoDerived: false, autoGenerated: false, kind: "dropdown", lookupName: "validationStatus" },
  { field: "confidenceScore", header: "Confidence Score", group: "Internal", type: "integer", mandatory: true, autoDerived: false, autoGenerated: false, kind: "numeric" },
  { field: "pieces", header: "Pieces", group: "Internal", type: "integer", mandatory: false, autoDerived: false, autoGenerated: false, kind: "numeric" },
  { field: "setCount", header: "Set Count", group: "Internal", type: "integer", mandatory: false, autoDerived: false, autoGenerated: false, kind: "numeric" },
  { field: "shape", header: "Shape", group: "Internal", type: "string", mandatory: false, autoDerived: false, autoGenerated: false, kind: "dropdown", lookupName: "shape" },
  { field: "finish", header: "Finish", group: "Internal", type: "string", mandatory: false, autoDerived: false, autoGenerated: false, kind: "dropdown", lookupName: "finish" },
  { field: "additionalInfo", header: "Additional Information", group: "Internal", type: "string", mandatory: false, autoDerived: false, autoGenerated: false, kind: "dropdown", lookupName: "additionalInfo" },
  // Image Links — derived from the product.images relation (primary image first,
  // then all others). Not a direct Prisma field; the export route resolves it
  // specially via resolveImageLinks(). Placed at the end so original column
  // order is preserved.
  { field: "imageLinks", header: "Image Links", group: "Media", type: "string", mandatory: false, autoDerived: false, autoGenerated: false, kind: "free-text" },
  // Variants — lists all linked variant products by ND Number (preferred) or
  // Barcode (fallback). If the product is itself a variant, shows "Already
  // Variant of {parent ND/Barcode}". Never uses database IDs.
  { field: "variants", header: "Variants", group: "Media", type: "string", mandatory: false, autoDerived: false, autoGenerated: false, kind: "free-text" },
];

/** Column groups for UI section headers */
export const COLUMN_GROUPS = [
  { name: "Product Identity", fields: COLUMN_DEFS.filter((c) => c.group === "Product Identity") },
  { name: "Classification", fields: COLUMN_DEFS.filter((c) => c.group === "Classification") },
  { name: "Product Information", fields: COLUMN_DEFS.filter((c) => c.group === "Product Information") },
  { name: "Attributes", fields: COLUMN_DEFS.filter((c) => c.group === "Attributes") },
  { name: "Logistics", fields: COLUMN_DEFS.filter((c) => c.group === "Logistics") },
  { name: "Commercial", fields: COLUMN_DEFS.filter((c) => c.group === "Commercial") },
  { name: "SEO", fields: COLUMN_DEFS.filter((c) => c.group === "SEO") },
  { name: "Internal", fields: COLUMN_DEFS.filter((c) => c.group === "Internal") },
  { name: "Media", fields: COLUMN_DEFS.filter((c) => c.group === "Media") },
];

/**
 * Resolve the Image Links value for a product.
 *
 * Returns a newline-separated list of image URLs from the product.images
 * relation (primary image first, then remaining in display order). Returns
 * empty string if the product has no images.
 *
 * This is NOT a direct Prisma field — the export route calls this helper
 * when it encounters the "imageLinks" field in COLUMN_DEFS.
 */
export function resolveImageLinks(product: { images?: { imageUrl: string; isPrimary: boolean; displayOrder: number }[] } | null | undefined): string {
  if (!product || !product.images || product.images.length === 0) return '';
  // Primary image first, then the rest in display order
  const sorted = [...product.images].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return a.displayOrder - b.displayOrder;
  });
  // Convert each imageUrl to a sensible export value:
  //   - Real URLs (http://, https://, /path) → kept as-is
  //   - Base64 data URLs → replaced with "[base64 image — N chars]" placeholder
  //     because Excel cells have a 32,767 char limit and a 3MB+ base64 string
  //     would crash the export (Error: Text length must not exceed 32767
  //     characters). The full data URL is still in the database; the Excel
  //     export is for catalog reference, not image storage.
  return sorted.map(img => {
    const url = img.imageUrl || '';
    if (url.startsWith('data:')) {
      return `[base64 image — ${url.length} chars]`;
    }
    return url;
  }).join(', ');
}

/**
 * Resolve image links for the export pipeline — returns Google Drive thumbnail
 * URLs, one per line, with the primary image first.
 *
 * For each image:
 *   - If driveFileId exists → https://drive.google.com/thumbnail?id=FILE_ID&sz=w1000
 *   - Else if imageUrl is a real URL (not data:) → use it directly
 *   - Else skip (base64 images have no URL to link to)
 *
 * Multiple URLs are separated by newlines (\n) so they appear on separate
 * lines within the same Excel cell.
 *
 * @param product Product with images relation loaded (including driveFileId)
 * @param sizeParam Google Drive thumbnail size param (e.g. 'sz=w1000', 'sz=w300')
 * @returns Newline-separated image URLs, primary first. Empty string if no images.
 */
export function resolveImageLinksForExport(
  product: { images?: { imageUrl: string; isPrimary: boolean; displayOrder: number; driveFileId?: string | null }[] } | null | undefined,
  sizeParam: string = 'sz=w1000'
): string {
  if (!product || !product.images || product.images.length === 0) return '';

  // Primary image first, then the rest in display order
  const sorted = [...product.images].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return a.displayOrder - b.displayOrder;
  });

  const urls: string[] = [];
  for (const img of sorted) {
    if (img.driveFileId) {
      urls.push(`https://drive.google.com/thumbnail?id=${img.driveFileId}&${sizeParam}`);
    } else if (img.imageUrl && !img.imageUrl.startsWith('data:')) {
      urls.push(img.imageUrl);
    }
    // Skip base64 images — they have no URL to link to
  }

  return urls.join('\n');
}

/**
 * Resolve the Variants value for a product in the Excel export.
 *
 * Rules:
 *   - If the product is a PARENT (has variants): list all variant ND Numbers
 *     (or Barcode fallback), one per line. Exclude the current product.
 *   - If the product IS a variant (linked to a parent): show
 *     "Already Variant of {parent ND/Barcode}".
 *   - If no variants: return empty string.
 *
 * Priority: ND Number → Barcode. Never uses database IDs/UUIDs.
 *
 * @param product The product with variantMemberships and variantGroup populated
 * @param allProducts All products in the export (to look up ND/barcode of other members)
 */
export function resolveVariants(
  product: any,
  allProducts: any[]
): string {
  if (!product) return '';

  const memberships = product.variantMemberships;
  if (!memberships || memberships.length === 0) return '';

  // This product is a MEMBER of a variant group
  const membership = memberships[0];
  const group = membership.variantGroup;

  if (!group) return '';

  // Check if this product IS the primary (parent) of the group
  const isParent = group.primaryProductId === product.id;

  if (isParent) {
    // This is the parent — list all OTHER members as variants
    // We need to look up the other members. The export query includes
    // variantMemberships with variantGroup, but NOT the group's members.
    // We'll find all products in allProducts that belong to the same group.
    const variantProducts = allProducts.filter(
      (p: any) =>
        p.id !== product.id &&
        p.variantMemberships?.some(
          (m: any) => m.variantGroupId === group.id
        )
    );

    if (variantProducts.length === 0) return '';

    return variantProducts
      .map((p: any) => {
        if (p.ndNumber) return p.ndNumber;
        if (p.barcode) return `Barcode: ${p.barcode}`;
        return '(no identifier)';
      })
      .join(', ');
  } else {
    // This product IS a variant — show the parent
    const parentProduct = allProducts.find(
      (p: any) => p.id === group.primaryProductId
    );

    if (!parentProduct) return 'Already Variant of (parent not found)';

    const parentId =
      parentProduct.ndNumber ||
      (parentProduct.barcode ? `Barcode: ${parentProduct.barcode}` : '(no ID)');

    return `Already Variant of ${parentId}`;
  }
}

/** Get dropdown options for a given lookup name */
export function getLookupOptions(lookupName: string): string[] {
  switch (lookupName) {
    case "brand": return BRAND_OPTIONS;
    case "department": return DEPARTMENTS;
    case "category": return []; // dynamic - depends on department
    case "subcategory": return []; // dynamic - depends on category
    case "productFamily": return [...PRODUCT_FAMILIES];
    case "productType": return []; // dynamic - depends on productFamily
    case "color": return COLOR_OPTIONS;
    case "material": return MATERIAL_OPTIONS;
    case "capacityUnit": return [...CAPACITY_UNIT_OPTIONS];
    case "weightUnit": return [...WEIGHT_UNIT_OPTIONS];
    case "dimensionUnit": return [...DIMENSION_UNIT_OPTIONS];
    case "country": return [...COUNTRY_OPTIONS];
    case "unit": return [...UNIT_OPTIONS];
    case "minSalesMultiples": return [...MIN_SALES_MULTIPLES_OPTIONS];
    case "validationStatus": return [...VALIDATION_STATUS_OPTIONS];
    case "shape": return [...SHAPE_OPTIONS];
    case "finish": return [...FINISH_OPTIONS];
    case "additionalInfo": return [...ADDITIONAL_INFO_OPTIONS];
    default: return [];
  }
}
