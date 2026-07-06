module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/src/lib/db.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "db",
    ()=>db,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__ = __turbopack_context__.i("[externals]/@prisma/client [external] (@prisma/client, cjs, [project]/node_modules/@prisma/client)");
;
const globalForPrisma = globalThis;
const db = globalForPrisma.prisma ?? new __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__["PrismaClient"]();
if ("TURBOPACK compile-time truthy", 1) {
    globalForPrisma.prisma = db;
}
const __TURBOPACK__default__export__ = db;
}),
"[project]/src/lib/lookups.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Al-Nassim Master Catalog — Centralized Lookup Data
 * 
 * All controlled vocabularies, taxonomy hierarchies, and lookup tables
 * are defined here. UI components and API routes must reference this
 * single source of truth so that future updates require minimal code changes.
 * 
 * Source: Al-Nassim Master Catalog Data Dictionary & Schema Documentation V1.0
 * Workbook Version: V8 (FINAL)
 */ // ─────────────────────────────────────────────────────────────
// 1. BRAND LOOKUP (with Arabic + Code)
// ─────────────────────────────────────────────────────────────
__turbopack_context__.s([
    "ADDITIONAL_INFO_OPTIONS",
    ()=>ADDITIONAL_INFO_OPTIONS,
    "ALL_PRODUCT_TYPES",
    ()=>ALL_PRODUCT_TYPES,
    "BRAND_LOOKUP",
    ()=>BRAND_LOOKUP,
    "BRAND_OPTIONS",
    ()=>BRAND_OPTIONS,
    "CAPACITY_UNIT_OPTIONS",
    ()=>CAPACITY_UNIT_OPTIONS,
    "COLOR_LOOKUP",
    ()=>COLOR_LOOKUP,
    "COLOR_OPTIONS",
    ()=>COLOR_OPTIONS,
    "COLUMN_DEFS",
    ()=>COLUMN_DEFS,
    "COLUMN_GROUPS",
    ()=>COLUMN_GROUPS,
    "COUNTRY_OPTIONS",
    ()=>COUNTRY_OPTIONS,
    "DEPARTMENTS",
    ()=>DEPARTMENTS,
    "DIMENSION_UNIT_OPTIONS",
    ()=>DIMENSION_UNIT_OPTIONS,
    "FAMILY_TO_TYPES",
    ()=>FAMILY_TO_TYPES,
    "FINISH_OPTIONS",
    ()=>FINISH_OPTIONS,
    "MATERIAL_LOOKUP",
    ()=>MATERIAL_LOOKUP,
    "MATERIAL_OPTIONS",
    ()=>MATERIAL_OPTIONS,
    "MIN_SALES_MULTIPLES_OPTIONS",
    ()=>MIN_SALES_MULTIPLES_OPTIONS,
    "PRODUCT_FAMILIES",
    ()=>PRODUCT_FAMILIES,
    "SECTION_CODE_LOOKUP",
    ()=>SECTION_CODE_LOOKUP,
    "SHAPE_OPTIONS",
    ()=>SHAPE_OPTIONS,
    "SUBCATEGORY_TO_FAMILIES",
    ()=>SUBCATEGORY_TO_FAMILIES,
    "TAXONOMY",
    ()=>TAXONOMY,
    "UNIT_OPTIONS",
    ()=>UNIT_OPTIONS,
    "VALIDATION_STATUS_OPTIONS",
    ()=>VALIDATION_STATUS_OPTIONS,
    "WEIGHT_UNIT_OPTIONS",
    ()=>WEIGHT_UNIT_OPTIONS,
    "categoryHasSubcategories",
    ()=>categoryHasSubcategories,
    "deriveLongDescEn",
    ()=>deriveLongDescEn,
    "deriveSearchKeywords",
    ()=>deriveSearchKeywords,
    "deriveSeoDescAr",
    ()=>deriveSeoDescAr,
    "deriveSeoDescEn",
    ()=>deriveSeoDescEn,
    "deriveSeoTitleAr",
    ()=>deriveSeoTitleAr,
    "deriveShortDescAr",
    ()=>deriveShortDescAr,
    "deriveShortDescEn",
    ()=>deriveShortDescEn,
    "getBrandDerivatives",
    ()=>getBrandDerivatives,
    "getCategoriesForDepartment",
    ()=>getCategoriesForDepartment,
    "getColorAr",
    ()=>getColorAr,
    "getFamiliesForSubcategory",
    ()=>getFamiliesForSubcategory,
    "getLookupOptions",
    ()=>getLookupOptions,
    "getMaterialAr",
    ()=>getMaterialAr,
    "getSectionCodeForDepartment",
    ()=>getSectionCodeForDepartment,
    "getSubcategoriesForCategory",
    ()=>getSubcategoriesForCategory,
    "getTypesForFamily",
    ()=>getTypesForFamily
]);
const BRAND_LOOKUP = [
    {
        brand: "Al-Nassim China",
        brandAr: "نيصلا ميسنلا",
        brandCode: "017"
    },
    {
        brand: "Local Companies",
        brandAr: "ةيلحم تاكرش",
        brandCode: "006"
    }
];
const BRAND_OPTIONS = BRAND_LOOKUP.map((b)=>b.brand);
function getBrandDerivatives(brand) {
    const entry = BRAND_LOOKUP.find((b)=>b.brand === brand);
    return {
        brandAr: entry?.brandAr ?? "",
        brandCode: entry?.brandCode ?? ""
    };
}
const TAXONOMY = [
    // Houseware
    {
        department: "Houseware",
        category: "Cleaning Tools",
        subcategory: "Surface Cleaning"
    },
    {
        department: "Houseware",
        category: "Cleaning Tools",
        subcategory: "Toilet & Drain"
    },
    {
        department: "Houseware",
        category: "Home & Outdoor",
        subcategory: "Laundry Essentials"
    },
    {
        department: "Houseware",
        category: "Home & Outdoor",
        subcategory: "Picnic Collection"
    },
    {
        department: "Houseware",
        category: "Home & Outdoor",
        subcategory: "Storage & Packaging"
    },
    {
        department: "Houseware",
        category: "Kitchenware",
        subcategory: "Cooking & Utensils"
    },
    {
        department: "Houseware",
        category: "Kitchenware",
        subcategory: "Cutlery & Cleaver"
    },
    {
        department: "Houseware",
        category: "Kitchenware",
        subcategory: "Drinkware"
    },
    // Supermarket Equipment
    {
        department: "Supermarket Equipment",
        category: "Accessories",
        subcategory: null
    },
    {
        department: "Supermarket Equipment",
        category: "Checkout Solutions",
        subcategory: null
    },
    {
        department: "Supermarket Equipment",
        category: "Cooling Appliances",
        subcategory: "Coolers & Chillers"
    },
    {
        department: "Supermarket Equipment",
        category: "Cooling Appliances",
        subcategory: "Freezers"
    },
    {
        department: "Supermarket Equipment",
        category: "Shelves & Stands",
        subcategory: "Shelves"
    },
    {
        department: "Supermarket Equipment",
        category: "Shelves & Stands",
        subcategory: "Stands"
    },
    {
        department: "Supermarket Equipment",
        category: "Trolleys & Baskets",
        subcategory: "Baskets"
    },
    {
        department: "Supermarket Equipment",
        category: "Trolleys & Baskets",
        subcategory: "Trolleys"
    },
    // Warehouse Equipment
    {
        department: "Warehouse Equipment",
        category: "Forklifts & Pallets",
        subcategory: "Forklifts"
    },
    {
        department: "Warehouse Equipment",
        category: "Forklifts & Pallets",
        subcategory: "Pallets"
    },
    {
        department: "Warehouse Equipment",
        category: "Heavy Duty Racking",
        subcategory: null
    },
    {
        department: "Warehouse Equipment",
        category: "Trolleys & Baskets",
        subcategory: "Baskets"
    },
    {
        department: "Warehouse Equipment",
        category: "Trolleys & Baskets",
        subcategory: "Trolleys"
    }
];
const DEPARTMENTS = [
    ...new Set(TAXONOMY.map((t)=>t.department))
];
function getCategoriesForDepartment(department) {
    if (!department) return [];
    return [
        ...new Set(TAXONOMY.filter((t)=>t.department === department).map((t)=>t.category))
    ];
}
function getSubcategoriesForCategory(department, category) {
    if (!department || !category) return [];
    const subs = TAXONOMY.filter((t)=>t.department === department && t.category === category).map((t)=>t.subcategory);
    // Filter out nulls and return; if all are null, return empty array
    return subs.filter((s)=>s !== null);
}
function categoryHasSubcategories(department, category) {
    if (!department || !category) return false;
    return TAXONOMY.some((t)=>t.department === department && t.category === category && t.subcategory !== null);
}
const SECTION_CODE_LOOKUP = {
    Houseware: "102",
    "Supermarket Equipment": "103",
    "Warehouse Equipment": "104"
};
function getSectionCodeForDepartment(department) {
    if (!department) return "";
    return SECTION_CODE_LOOKUP[department] ?? "";
}
const SUBCATEGORY_TO_FAMILIES = {
    "Cooking & Utensils": [
        "Cookware",
        "Kitchen Tools",
        "Food Storage"
    ],
    "Cutlery & Cleaver": [
        "Cutlery",
        "Kitchen Tools"
    ],
    "Drinkware": [
        "Drinkware"
    ],
    "Surface Cleaning": [
        "Cleaning"
    ],
    "Toilet & Drain": [
        "Cleaning"
    ],
    "Laundry Essentials": [
        "Cleaning",
        "Linens"
    ],
    "Picnic Collection": [
        "Outdoor Cooking",
        "Sets"
    ],
    "Storage & Packaging": [
        "Storage",
        "Buckets",
        "Food Storage"
    ],
    "Coolers & Chillers": [
        "Buckets"
    ],
    "Freezers": [
        "Buckets"
    ],
    Shelves: [
        "Storage"
    ],
    Stands: [
        "Storage"
    ],
    Baskets: [
        "Buckets",
        "Storage"
    ],
    Trolleys: [
        "Sets"
    ],
    Forklifts: [
        "Sets"
    ],
    Pallets: [
        "Storage"
    ]
};
const PRODUCT_FAMILIES = [
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
    "Uncategorized"
];
function getFamiliesForSubcategory(subcategory) {
    if (!subcategory) return [
        ...PRODUCT_FAMILIES
    ];
    return SUBCATEGORY_TO_FAMILIES[subcategory] ?? [
        ...PRODUCT_FAMILIES
    ];
}
const FAMILY_TO_TYPES = {
    "Kitchen Tools": [
        "Wooden Tool",
        "Scale",
        "Vegetable Slicer",
        "Power Strip",
        "Sprayer",
        "Gas Stove",
        "Food Storage Container",
        "Cutter",
        "Cutting Board",
        "Box",
        "Clothesline",
        "Rack",
        "Coffee Pot",
        "Slippers",
        "Adhesive Tape",
        "Slotted Spoon",
        "Whisk",
        "Gloves",
        "Insecticide",
        "Mortar",
        "Masher",
        "Dining Spoon",
        "Toothpick",
        "Floor Mop",
        "Bowl",
        "Potato Peeler",
        "Cup",
        "Ashtray",
        "Juicer",
        "Lint Roller",
        "Sharpening Steel",
        "Hanger",
        "Pricing Label Gun",
        "Ladle",
        "Insect Catcher",
        "Dining Cover Curtain",
        "Rolling Pin",
        "Tray",
        "Dishwashing Wire",
        "Bath Loofah",
        "Household Ladder",
        "Clothes Peg",
        "Packing Tape",
        "Flower Pen",
        "Knife",
        "Charging Cable",
        "Mouse Glue Trap",
        "Ice Cream Mold",
        "Ice Cream Scoop",
        "Cream Decoration Bag",
        "Tea Bag",
        "Pastry Punch",
        "Vegetable Chopper",
        "Hand Duster",
        "Gas Hose",
        "Container",
        "Gas Burner Stove",
        "Flame Diffuser",
        "Drinking Glass Set",
        "Ice Tongs",
        "Tea Spoon",
        "Cleaning Brush",
        "Insect Sticky Trap",
        "Fan",
        "Strainer",
        "Cake Decoration Bag",
        "Cotton Swab",
        "Set",
        "Double-Sided Foam Tape",
        "Brush",
        "Broom",
        "Window Squeegee",
        "Bathroom Mat",
        "Fruit Juicer",
        "Roll",
        "Pricing Ink Roller",
        "Grain Grinder",
        "Water Filter",
        "Shaving Machine",
        "Washing Machine Cover",
        "Gas Cover",
        "Machine",
        "Fire Insulator",
        "Binding Thread",
        "Pasta Spoon",
        "Turner",
        "Liquid Dropper",
        "Meat Injector",
        "Garbage Bag",
        "Silicone Spoon",
        "Holder",
        "Shoe Polish Sponge",
        "Clothes Hanger",
        "Funnel",
        "Shoe Cover",
        "Incense",
        "Zucchini Corer",
        "Display Screen",
        "Salt Shaker"
    ],
    Cookware: [
        "Strainer",
        "Pan",
        "Cooking Pot",
        "Flask",
        "Frying Pan",
        "Set",
        "Tray",
        "Casserole",
        "Soup Ladle",
        "Food Cover",
        "Slotted Spoon",
        "Serving Bowl",
        "Salt Shaker",
        "Griddle",
        "Cutter",
        "Wooden Tool",
        "Juicer",
        "Funnel",
        "Vegetable Chopper",
        "Bowl",
        "Buffet Warmer"
    ],
    Cutlery: [
        "Knife",
        "Cutter",
        "Scissors",
        "Fork",
        "Wooden Tool",
        "Peeler",
        "Sharpening Steel",
        "Kitchen Cleaver",
        "Dining Spoon",
        "Dining Fork",
        "Bottle",
        "Set",
        "Cleaver",
        "Vegetable Slicer",
        "Portable Stove Oven"
    ],
    Cleaning: [
        "Broom",
        "Brush",
        "Floor Mop",
        "Cutter",
        "Dishwashing Wire",
        "Trolley",
        "Vacuum Cleaner",
        "Dishwashing Sponge",
        "Drain Piston Cleaner",
        "Mop",
        "Juicer",
        "Mosquito Repellent",
        "Drain Cleaner",
        "Sticky Fly Trap",
        "Mouse Trap",
        "Garbage Bag"
    ],
    "Food Storage": [
        "Container"
    ],
    Storage: [
        "Wooden Tool",
        "Potato Peeler",
        "Basket",
        "Cutter",
        "Meat Tenderizer",
        "Set",
        "Container",
        "Juicer",
        "Whisk",
        "Slotted Spoon",
        "Vegetable Peeler",
        "Fire Insulator",
        "Ladle",
        "Garlic Press",
        "Almond Cracker",
        "Peeler",
        "Fish Scaler",
        "Drum",
        "Brush",
        "Fork",
        "Ice Cream Scoop"
    ],
    Tableware: [
        "Tray",
        "Plate",
        "Serving Bowl",
        "Plate Rack"
    ],
    "Outdoor Cooking": [
        "Grill",
        "Ice Tongs",
        "Tool",
        "Gas Heater",
        "Plastic Hobby Box",
        "Fish Scaler",
        "Gas Burner Stove"
    ],
    Drinkware: [
        "Cup",
        "Bottle",
        "Flask",
        "Pitcher"
    ],
    Sets: [
        "Bag",
        "Chair",
        "Set",
        "Table",
        "Dustpan",
        "Shelf"
    ],
    Buckets: [
        "Bucket",
        "Basket",
        "Box",
        "Strainer",
        "Cutter",
        "Serving Bowl",
        "Mug",
        "Juice Straw",
        "Water Dispenser",
        "Juicer",
        "Fruit Juicer",
        "Tray",
        "Plastic Spoon",
        "Food Storage Cover",
        "Sprayer",
        "Household Ladder",
        "Coffee Spoon",
        "Measuring Cup",
        "Grinder",
        "Holder",
        "Ice Tongs",
        "Masher"
    ],
    Linens: [
        "Towel"
    ],
    "Paper Goods": [
        "Tissue"
    ],
    Uncategorized: [
        "Cooking Pot",
        "Pressure Cooker",
        "Food Storage Bag",
        "Gloves",
        "Arabic Coffee Pot",
        "Hamburger Press",
        "Food Storage Cover",
        "Bowl",
        "Baking Tray",
        "Falafel Maker Mold",
        "Floor Adhesive"
    ]
};
function getTypesForFamily(family) {
    if (!family) return [];
    return FAMILY_TO_TYPES[family] ?? [];
}
const ALL_PRODUCT_TYPES = [
    ...new Set(Object.values(FAMILY_TO_TYPES).flat())
].sort();
const COLOR_LOOKUP = [
    {
        color: "Black",
        colorAr: "دوسأ"
    },
    {
        color: "White",
        colorAr: "ضيبأ"
    },
    {
        color: "Clear",
        colorAr: "فافش"
    },
    {
        color: "Silver",
        colorAr: "يضف"
    },
    {
        color: "Gold",
        colorAr: "يبهذ"
    },
    {
        color: "Red",
        colorAr: "رمحأ"
    },
    {
        color: "Yellow",
        colorAr: "رفصأ"
    },
    {
        color: "Green",
        colorAr: "رضخأ"
    },
    {
        color: "Blue",
        colorAr: "قرزأ"
    },
    {
        color: "Gray",
        colorAr: "يامر"
    },
    {
        color: "Orange",
        colorAr: "يلاقترب"
    },
    {
        color: "Brown",
        colorAr: "ينب"
    },
    {
        color: "Beige",
        colorAr: "جيب"
    },
    {
        color: "Purple",
        colorAr: "يجسفنب"
    },
    {
        color: "Pink",
        colorAr: "يدرو"
    }
];
const COLOR_OPTIONS = COLOR_LOOKUP.map((c)=>c.color);
function getColorAr(color) {
    if (!color) return "";
    return COLOR_LOOKUP.find((c)=>c.color === color)?.colorAr ?? "";
}
const MATERIAL_LOOKUP = [
    {
        material: "Plastic",
        materialAr: "كيتسلاب"
    },
    {
        material: "Stainless Steel",
        materialAr: "ليتس سلناتس"
    },
    {
        material: "Wooden",
        materialAr: "بشخ"
    },
    {
        material: "Granite",
        materialAr: "تينارج"
    },
    {
        material: "Glass",
        materialAr: "جاجز"
    },
    {
        material: "Steel",
        materialAr: "ديدح"
    },
    {
        material: "Aluminum",
        materialAr: "موينملأ"
    },
    {
        material: "Paper",
        materialAr: "قرو"
    },
    {
        material: "Cotton",
        materialAr: "نطق"
    },
    {
        material: "Silicone",
        materialAr: "نوكيليس"
    },
    {
        material: "Microfiber",
        materialAr: "ربايروفوركيم"
    },
    {
        material: "Melamine",
        materialAr: "نيملايم"
    },
    {
        material: "Chrome",
        materialAr: "مورك"
    },
    {
        material: "Porcelain",
        materialAr: "نلاسروب"
    },
    {
        material: "Ceramic",
        materialAr: "كيماريس"
    }
];
const MATERIAL_OPTIONS = MATERIAL_LOOKUP.map((m)=>m.material);
function getMaterialAr(material) {
    if (!material) return "";
    return MATERIAL_LOOKUP.find((m)=>m.material === material)?.materialAr ?? "";
}
const UNIT_OPTIONS = [
    "PCS",
    "PKT",
    "CTN",
    "ROLL",
    "BUNDLE"
];
const CAPACITY_UNIT_OPTIONS = [
    "L",
    "ml",
    "kg",
    "g"
];
const WEIGHT_UNIT_OPTIONS = [
    "kg",
    "g"
];
const DIMENSION_UNIT_OPTIONS = [
    "cm",
    "mm",
    "inch"
];
const SHAPE_OPTIONS = [
    "Square",
    "Round",
    "Rectangular",
    "Oval",
    "Circular"
];
const FINISH_OPTIONS = [
    "Coated",
    "Chrome",
    "Black Chrome",
    "Polished",
    "Matte",
    "Powder-coated"
];
const ADDITIONAL_INFO_OPTIONS = [
    "with Lid",
    "Glass Lid",
    "with Wheels",
    "Foldable",
    "with Handle"
];
const VALIDATION_STATUS_OPTIONS = [
    "Validated",
    "Pending Review",
    "Draft",
    "Rejected"
];
const MIN_SALES_MULTIPLES_OPTIONS = [
    "No",
    "Yes"
];
const COUNTRY_OPTIONS = [
    "China",
    "India",
    "Turkey",
    "UAE",
    "Germany",
    "Italy",
    "Vietnam",
    "South Korea",
    "Japan",
    "Thailand",
    "Indonesia",
    "Malaysia",
    "Brazil",
    "United States",
    "United Kingdom",
    "France",
    "Spain",
    "Netherlands",
    "Poland",
    "Hungary",
    "Slovakia",
    "Ukraine",
    "Saudi Arabia",
    "Kuwait",
    "Bahrain",
    "Qatar",
    "Oman",
    "Egypt",
    "Jordan",
    "Lebanon",
    "Morocco",
    "Tunisia",
    "Pakistan",
    "Bangladesh",
    "Philippines",
    "Sri Lanka",
    "Taiwan",
    "Hong Kong"
];
function deriveShortDescAr(nameAr) {
    return nameAr ?? "";
}
function deriveShortDescEn(nameEn) {
    return nameEn ?? "";
}
function deriveLongDescEn(brand, nameEn) {
    if (!brand && !nameEn) return "";
    const parts = [
        brand,
        nameEn
    ].filter(Boolean);
    return parts.join(". ") + ".";
}
function deriveSeoTitleAr(nameAr) {
    return nameAr ?? "";
}
function deriveSeoDescEn(brand, productType) {
    const parts = [
        brand,
        productType
    ].filter(Boolean);
    if (parts.length === 0) return "";
    return parts.join(" ") + ". Available in Kuwait.";
}
function deriveSeoDescAr(brandAr, productType) {
    const parts = [
        brandAr,
        productType
    ].filter(Boolean);
    if (parts.length === 0) return "";
    return parts.join("، ");
}
function deriveSearchKeywords(brand, productFamily, productType) {
    const parts = [
        brand,
        productFamily,
        productType
    ].filter(Boolean);
    return parts.join(" | ");
}
const COLUMN_DEFS = [
    // Product Identity Group (10 cols)
    {
        field: "sourceRow",
        header: "Source Row",
        group: "Product Identity",
        type: "integer",
        mandatory: true,
        autoDerived: false,
        autoGenerated: true,
        kind: "auto-generated"
    },
    {
        field: "productId",
        header: "Product ID",
        group: "Product Identity",
        type: "string",
        mandatory: true,
        autoDerived: false,
        autoGenerated: false,
        kind: "free-text"
    },
    {
        field: "sku",
        header: "SKU",
        group: "Product Identity",
        type: "string",
        mandatory: true,
        autoDerived: false,
        autoGenerated: false,
        kind: "free-text"
    },
    {
        field: "ndNumber",
        header: "ND Number",
        group: "Product Identity",
        type: "string",
        mandatory: false,
        autoDerived: false,
        autoGenerated: false,
        kind: "free-text",
        pattern: "^ND-\\d{4}(-[A-Z0-9-]+)?$"
    },
    {
        field: "barcode",
        header: "Barcode",
        group: "Product Identity",
        type: "string",
        mandatory: true,
        autoDerived: false,
        autoGenerated: false,
        kind: "free-text"
    },
    {
        field: "legacyCode",
        header: "Legacy Code",
        group: "Product Identity",
        type: "string",
        mandatory: false,
        autoDerived: false,
        autoGenerated: false,
        kind: "free-text"
    },
    {
        field: "brand",
        header: "Brand",
        group: "Product Identity",
        type: "string",
        mandatory: true,
        autoDerived: false,
        autoGenerated: false,
        kind: "dropdown",
        lookupName: "brand"
    },
    {
        field: "brandAr",
        header: "Brand AR",
        group: "Product Identity",
        type: "string",
        mandatory: true,
        autoDerived: true,
        autoGenerated: false,
        kind: "auto-derived",
        dependsOn: "brand"
    },
    {
        field: "brandCode",
        header: "Brand Code",
        group: "Product Identity",
        type: "string",
        mandatory: true,
        autoDerived: true,
        autoGenerated: false,
        kind: "auto-derived",
        dependsOn: "brand"
    },
    {
        field: "model",
        header: "Model",
        group: "Product Identity",
        type: "string",
        mandatory: false,
        autoDerived: false,
        autoGenerated: false,
        kind: "free-text"
    },
    // Classification Group (6 cols)
    {
        field: "department",
        header: "Department",
        group: "Classification",
        type: "string",
        mandatory: true,
        autoDerived: false,
        autoGenerated: false,
        kind: "dropdown",
        lookupName: "department"
    },
    {
        field: "category",
        header: "Category",
        group: "Classification",
        type: "string",
        mandatory: true,
        autoDerived: false,
        autoGenerated: false,
        kind: "dependent-dropdown",
        lookupName: "category",
        dependsOn: "department"
    },
    {
        field: "subcategory",
        header: "Subcategory",
        group: "Classification",
        type: "string",
        mandatory: false,
        autoDerived: false,
        autoGenerated: false,
        kind: "dependent-dropdown",
        lookupName: "subcategory",
        dependsOn: "category"
    },
    {
        field: "sectionCode",
        header: "Section Code",
        group: "Classification",
        type: "string",
        mandatory: true,
        autoDerived: true,
        autoGenerated: false,
        kind: "auto-derived",
        dependsOn: "department"
    },
    {
        field: "productFamily",
        header: "Product Family",
        group: "Classification",
        type: "string",
        mandatory: true,
        autoDerived: false,
        autoGenerated: false,
        kind: "dependent-dropdown",
        lookupName: "productFamily",
        dependsOn: "subcategory"
    },
    {
        field: "productType",
        header: "Product Type",
        group: "Classification",
        type: "string",
        mandatory: true,
        autoDerived: false,
        autoGenerated: false,
        kind: "dependent-dropdown",
        lookupName: "productType",
        dependsOn: "productFamily"
    },
    // Product Information Group (6 cols)
    {
        field: "nameAr",
        header: "Name AR",
        group: "Product Information",
        type: "string",
        mandatory: true,
        autoDerived: false,
        autoGenerated: false,
        kind: "arabic-text"
    },
    {
        field: "nameEn",
        header: "Name EN",
        group: "Product Information",
        type: "string",
        mandatory: true,
        autoDerived: false,
        autoGenerated: false,
        kind: "free-text"
    },
    {
        field: "shortDescAr",
        header: "Short Desc AR",
        group: "Product Information",
        type: "string",
        mandatory: true,
        autoDerived: true,
        autoGenerated: false,
        kind: "arabic-text",
        dependsOn: "nameAr"
    },
    {
        field: "shortDescEn",
        header: "Short Desc EN",
        group: "Product Information",
        type: "string",
        mandatory: true,
        autoDerived: true,
        autoGenerated: false,
        kind: "free-text",
        dependsOn: "nameEn"
    },
    {
        field: "longDescAr",
        header: "Long Desc AR",
        group: "Product Information",
        type: "string",
        mandatory: false,
        autoDerived: false,
        autoGenerated: false,
        kind: "arabic-text"
    },
    {
        field: "longDescEn",
        header: "Long Desc EN",
        group: "Product Information",
        type: "string",
        mandatory: true,
        autoDerived: true,
        autoGenerated: false,
        kind: "free-text"
    },
    // Attributes Group (13 cols)
    {
        field: "color",
        header: "Color",
        group: "Attributes",
        type: "string",
        mandatory: false,
        autoDerived: false,
        autoGenerated: false,
        kind: "dropdown",
        lookupName: "color"
    },
    {
        field: "colorAr",
        header: "Color AR",
        group: "Attributes",
        type: "string",
        mandatory: false,
        autoDerived: true,
        autoGenerated: false,
        kind: "auto-derived",
        dependsOn: "color"
    },
    {
        field: "material",
        header: "Material",
        group: "Attributes",
        type: "string",
        mandatory: false,
        autoDerived: false,
        autoGenerated: false,
        kind: "dropdown",
        lookupName: "material"
    },
    {
        field: "materialAr",
        header: "Material AR",
        group: "Attributes",
        type: "string",
        mandatory: false,
        autoDerived: true,
        autoGenerated: false,
        kind: "auto-derived",
        dependsOn: "material"
    },
    {
        field: "capacity",
        header: "Capacity",
        group: "Attributes",
        type: "decimal",
        mandatory: false,
        autoDerived: false,
        autoGenerated: false,
        kind: "numeric"
    },
    {
        field: "capacityUnit",
        header: "Capacity Unit",
        group: "Attributes",
        type: "string",
        mandatory: false,
        autoDerived: false,
        autoGenerated: false,
        kind: "dropdown",
        lookupName: "capacityUnit"
    },
    {
        field: "weight",
        header: "Weight",
        group: "Attributes",
        type: "decimal",
        mandatory: false,
        autoDerived: false,
        autoGenerated: false,
        kind: "numeric"
    },
    {
        field: "weightUnit",
        header: "Weight Unit",
        group: "Attributes",
        type: "string",
        mandatory: false,
        autoDerived: false,
        autoGenerated: false,
        kind: "dropdown",
        lookupName: "weightUnit"
    },
    {
        field: "length",
        header: "Length",
        group: "Attributes",
        type: "decimal",
        mandatory: false,
        autoDerived: false,
        autoGenerated: false,
        kind: "numeric"
    },
    {
        field: "width",
        header: "Width",
        group: "Attributes",
        type: "decimal",
        mandatory: false,
        autoDerived: false,
        autoGenerated: false,
        kind: "numeric"
    },
    {
        field: "height",
        header: "Height",
        group: "Attributes",
        type: "decimal",
        mandatory: false,
        autoDerived: false,
        autoGenerated: false,
        kind: "numeric"
    },
    {
        field: "diameter",
        header: "Diameter",
        group: "Attributes",
        type: "decimal",
        mandatory: false,
        autoDerived: false,
        autoGenerated: false,
        kind: "numeric"
    },
    {
        field: "dimensionUnit",
        header: "Dimension Unit",
        group: "Attributes",
        type: "string",
        mandatory: false,
        autoDerived: false,
        autoGenerated: false,
        kind: "dropdown",
        lookupName: "dimensionUnit"
    },
    // Logistics Group (3 cols)
    {
        field: "countryOfOrigin",
        header: "Country of Origin",
        group: "Logistics",
        type: "string",
        mandatory: false,
        autoDerived: false,
        autoGenerated: false,
        kind: "dropdown",
        lookupName: "country"
    },
    {
        field: "unit",
        header: "Unit",
        group: "Logistics",
        type: "string",
        mandatory: true,
        autoDerived: false,
        autoGenerated: false,
        kind: "dropdown",
        lookupName: "unit"
    },
    {
        field: "minSalesMultiples",
        header: "Min Sales Multiples",
        group: "Logistics",
        type: "string",
        mandatory: true,
        autoDerived: false,
        autoGenerated: false,
        kind: "dropdown",
        lookupName: "minSalesMultiples"
    },
    // Commercial Group (1 col)
    {
        field: "defaultPrice",
        header: "Default Price",
        group: "Commercial",
        type: "decimal",
        mandatory: false,
        autoDerived: false,
        autoGenerated: false,
        kind: "numeric"
    },
    // SEO Group (5 cols)
    {
        field: "seoTitleEn",
        header: "SEO Title EN",
        group: "SEO",
        type: "string",
        mandatory: false,
        autoDerived: false,
        autoGenerated: false,
        kind: "free-text"
    },
    {
        field: "seoTitleAr",
        header: "SEO Title AR",
        group: "SEO",
        type: "string",
        mandatory: true,
        autoDerived: true,
        autoGenerated: false,
        kind: "arabic-text",
        dependsOn: "nameAr"
    },
    {
        field: "seoDescriptionEn",
        header: "SEO Description EN",
        group: "SEO",
        type: "string",
        mandatory: true,
        autoDerived: true,
        autoGenerated: false,
        kind: "free-text"
    },
    {
        field: "seoDescriptionAr",
        header: "SEO Description AR",
        group: "SEO",
        type: "string",
        mandatory: true,
        autoDerived: true,
        autoGenerated: false,
        kind: "arabic-text"
    },
    {
        field: "searchKeywords",
        header: "Search Keywords",
        group: "SEO",
        type: "string",
        mandatory: true,
        autoDerived: true,
        autoGenerated: false,
        kind: "pipe-separated"
    },
    // Internal Group (8 cols)
    {
        field: "internalNotes",
        header: "Internal Notes",
        group: "Internal",
        type: "string",
        mandatory: false,
        autoDerived: false,
        autoGenerated: false,
        kind: "free-text"
    },
    {
        field: "validationStatus",
        header: "Validation Status",
        group: "Internal",
        type: "string",
        mandatory: true,
        autoDerived: false,
        autoGenerated: false,
        kind: "dropdown",
        lookupName: "validationStatus"
    },
    {
        field: "confidenceScore",
        header: "Confidence Score",
        group: "Internal",
        type: "integer",
        mandatory: true,
        autoDerived: false,
        autoGenerated: false,
        kind: "numeric"
    },
    {
        field: "pieces",
        header: "Pieces",
        group: "Internal",
        type: "integer",
        mandatory: false,
        autoDerived: false,
        autoGenerated: false,
        kind: "numeric"
    },
    {
        field: "setCount",
        header: "Set Count",
        group: "Internal",
        type: "integer",
        mandatory: false,
        autoDerived: false,
        autoGenerated: false,
        kind: "numeric"
    },
    {
        field: "shape",
        header: "Shape",
        group: "Internal",
        type: "string",
        mandatory: false,
        autoDerived: false,
        autoGenerated: false,
        kind: "dropdown",
        lookupName: "shape"
    },
    {
        field: "finish",
        header: "Finish",
        group: "Internal",
        type: "string",
        mandatory: false,
        autoDerived: false,
        autoGenerated: false,
        kind: "dropdown",
        lookupName: "finish"
    },
    {
        field: "additionalInfo",
        header: "Additional Information",
        group: "Internal",
        type: "string",
        mandatory: false,
        autoDerived: false,
        autoGenerated: false,
        kind: "dropdown",
        lookupName: "additionalInfo"
    }
];
const COLUMN_GROUPS = [
    {
        name: "Product Identity",
        fields: COLUMN_DEFS.filter((c)=>c.group === "Product Identity")
    },
    {
        name: "Classification",
        fields: COLUMN_DEFS.filter((c)=>c.group === "Classification")
    },
    {
        name: "Product Information",
        fields: COLUMN_DEFS.filter((c)=>c.group === "Product Information")
    },
    {
        name: "Attributes",
        fields: COLUMN_DEFS.filter((c)=>c.group === "Attributes")
    },
    {
        name: "Logistics",
        fields: COLUMN_DEFS.filter((c)=>c.group === "Logistics")
    },
    {
        name: "Commercial",
        fields: COLUMN_DEFS.filter((c)=>c.group === "Commercial")
    },
    {
        name: "SEO",
        fields: COLUMN_DEFS.filter((c)=>c.group === "SEO")
    },
    {
        name: "Internal",
        fields: COLUMN_DEFS.filter((c)=>c.group === "Internal")
    }
];
function getLookupOptions(lookupName) {
    switch(lookupName){
        case "brand":
            return BRAND_OPTIONS;
        case "department":
            return DEPARTMENTS;
        case "category":
            return []; // dynamic - depends on department
        case "subcategory":
            return []; // dynamic - depends on category
        case "productFamily":
            return [
                ...PRODUCT_FAMILIES
            ];
        case "productType":
            return []; // dynamic - depends on productFamily
        case "color":
            return COLOR_OPTIONS;
        case "material":
            return MATERIAL_OPTIONS;
        case "capacityUnit":
            return [
                ...CAPACITY_UNIT_OPTIONS
            ];
        case "weightUnit":
            return [
                ...WEIGHT_UNIT_OPTIONS
            ];
        case "dimensionUnit":
            return [
                ...DIMENSION_UNIT_OPTIONS
            ];
        case "country":
            return [
                ...COUNTRY_OPTIONS
            ];
        case "unit":
            return [
                ...UNIT_OPTIONS
            ];
        case "minSalesMultiples":
            return [
                ...MIN_SALES_MULTIPLES_OPTIONS
            ];
        case "validationStatus":
            return [
                ...VALIDATION_STATUS_OPTIONS
            ];
        case "shape":
            return [
                ...SHAPE_OPTIONS
            ];
        case "finish":
            return [
                ...FINISH_OPTIONS
            ];
        case "additionalInfo":
            return [
                ...ADDITIONAL_INFO_OPTIONS
            ];
        default:
            return [];
    }
}
}),
"[project]/src/lib/serialize-product.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "applyAutoDerivations",
    ()=>applyAutoDerivations,
    "serializeProduct",
    ()=>serializeProduct
]);
/**
 * Al-Nassim Master Catalog — Shared Product Serialization
 *
 * Maps a Prisma Product (with images) to the full 52-column JSON response
 * format used by all API routes. This ensures consistent field ordering
 * and type coercion across GET /products, GET /products/[id], POST, PUT.
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/lookups.ts [app-route] (ecmascript)");
;
function serializeProduct(p) {
    return {
        id: p.id,
        // Product Identity
        sourceRow: p.sourceRow,
        productId: p.productId,
        sku: p.sku,
        ndNumber: p.ndNumber,
        barcode: p.barcode,
        legacyCode: p.legacyCode,
        brand: p.brand,
        brandAr: p.brandAr,
        brandCode: p.brandCode,
        model: p.model,
        // Classification
        department: p.department,
        category: p.category,
        subcategory: p.subcategory,
        sectionCode: p.sectionCode,
        productFamily: p.productFamily,
        productType: p.productType,
        // Product Information
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        shortDescAr: p.shortDescAr,
        shortDescEn: p.shortDescEn,
        longDescAr: p.longDescAr,
        longDescEn: p.longDescEn,
        // Attributes
        color: p.color,
        colorAr: p.colorAr,
        material: p.material,
        materialAr: p.materialAr,
        capacity: p.capacity,
        capacityUnit: p.capacityUnit,
        weight: p.weight,
        weightUnit: p.weightUnit,
        length: p.length,
        width: p.width,
        height: p.height,
        diameter: p.diameter,
        dimensionUnit: p.dimensionUnit,
        // Logistics
        countryOfOrigin: p.countryOfOrigin,
        unit: p.unit,
        minSalesMultiples: p.minSalesMultiples,
        // Commercial
        defaultPrice: p.defaultPrice,
        // SEO
        seoTitleEn: p.seoTitleEn,
        seoTitleAr: p.seoTitleAr,
        seoDescriptionEn: p.seoDescriptionEn,
        seoDescriptionAr: p.seoDescriptionAr,
        searchKeywords: p.searchKeywords,
        // Internal
        internalNotes: p.internalNotes,
        validationStatus: p.validationStatus,
        confidenceScore: p.confidenceScore,
        pieces: p.pieces,
        setCount: p.setCount,
        shape: p.shape,
        finish: p.finish,
        additionalInfo: p.additionalInfo,
        // System
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        images: (p.images ?? []).map((img)=>({
                id: img.id,
                productId: img.productId,
                imageUrl: img.imageUrl,
                displayOrder: img.displayOrder,
                isPrimary: img.isPrimary,
                createdAt: img.createdAt.toISOString()
            })),
        // Change Tracking - Original values
        original: p.original ? {
            id: p.original.id,
            productId: p.original.productId,
            sourceRow: p.original.sourceRow,
            origProductId: p.original.origProductId,
            sku: p.original.sku,
            ndNumber: p.original.ndNumber,
            barcode: p.original.barcode,
            legacyCode: p.original.legacyCode,
            brand: p.original.brand,
            brandAr: p.original.brandAr,
            brandCode: p.original.brandCode,
            model: p.original.model,
            department: p.original.department,
            category: p.original.category,
            subcategory: p.original.subcategory,
            sectionCode: p.original.sectionCode,
            productFamily: p.original.productFamily,
            productType: p.original.productType,
            nameAr: p.original.nameAr,
            nameEn: p.original.nameEn,
            shortDescAr: p.original.shortDescAr,
            shortDescEn: p.original.shortDescEn,
            longDescAr: p.original.longDescAr,
            longDescEn: p.original.longDescEn,
            color: p.original.color,
            colorAr: p.original.colorAr,
            material: p.original.material,
            materialAr: p.original.materialAr,
            capacity: p.original.capacity,
            capacityUnit: p.original.capacityUnit,
            weight: p.original.weight,
            weightUnit: p.original.weightUnit,
            length: p.original.length,
            width: p.original.width,
            height: p.original.height,
            diameter: p.original.diameter,
            dimensionUnit: p.original.dimensionUnit,
            countryOfOrigin: p.original.countryOfOrigin,
            unit: p.original.unit,
            minSalesMultiples: p.original.minSalesMultiples,
            defaultPrice: p.original.defaultPrice,
            seoTitleEn: p.original.seoTitleEn,
            seoTitleAr: p.original.seoTitleAr,
            seoDescriptionEn: p.original.seoDescriptionEn,
            seoDescriptionAr: p.original.seoDescriptionAr,
            searchKeywords: p.original.searchKeywords,
            internalNotes: p.original.internalNotes,
            validationStatus: p.original.validationStatus,
            confidenceScore: p.original.confidenceScore,
            pieces: p.original.pieces,
            setCount: p.original.setCount,
            shape: p.original.shape,
            finish: p.original.finish,
            additionalInfo: p.original.additionalInfo
        } : null,
        // Variants
        variantMemberships: (p.variantMemberships ?? []).map((vm)=>({
                id: vm.id,
                variantGroupId: vm.variantGroupId,
                productId: vm.productId,
                color: vm.color,
                colorAr: vm.colorAr,
                variantImage: vm.variantImage,
                variantNotes: vm.variantNotes,
                displayOrder: vm.displayOrder,
                createdAt: vm.createdAt.toISOString(),
                updatedAt: vm.updatedAt.toISOString()
            }))
    };
}
function applyAutoDerivations(data) {
    const result = {
        ...data
    };
    // Brand → brandAr, brandCode
    if (result.brand) {
        const { brandAr, brandCode } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getBrandDerivatives"])(result.brand);
        if (!result.brandAr) result.brandAr = brandAr;
        if (!result.brandCode) result.brandCode = brandCode;
    }
    // Color → colorAr
    if (result.color && !result.colorAr) {
        result.colorAr = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getColorAr"])(result.color);
    }
    // Material → materialAr
    if (result.material && !result.materialAr) {
        result.materialAr = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getMaterialAr"])(result.material);
    }
    // Department → sectionCode
    if (result.department && !result.sectionCode) {
        result.sectionCode = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSectionCodeForDepartment"])(result.department);
    }
    // Dimension Unit: default to 'cm' if any dimension is set but no unit
    const hasAnyDimension = result.length != null || result.width != null || result.height != null || result.diameter != null;
    if (hasAnyDimension && !result.dimensionUnit) {
        result.dimensionUnit = 'cm';
    }
    // SEO auto-derivation rules
    if (!result.shortDescAr && result.nameAr) {
        result.shortDescAr = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["deriveShortDescAr"])(result.nameAr);
    }
    if (!result.shortDescEn && result.nameEn) {
        result.shortDescEn = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["deriveShortDescEn"])(result.nameEn);
    }
    if (!result.longDescEn && (result.brand || result.nameEn)) {
        result.longDescEn = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["deriveLongDescEn"])(result.brand, result.nameEn);
    }
    if (!result.seoTitleAr && result.nameAr) {
        result.seoTitleAr = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["deriveSeoTitleAr"])(result.nameAr);
    }
    if (!result.seoDescriptionEn && (result.brand || result.productType)) {
        result.seoDescriptionEn = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["deriveSeoDescEn"])(result.brand, result.productType);
    }
    if (!result.seoDescriptionAr && (result.brandAr || result.productType)) {
        result.seoDescriptionAr = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["deriveSeoDescAr"])(result.brandAr, result.productType);
    }
    if (!result.searchKeywords && (result.brand || result.productFamily || result.productType)) {
        result.searchKeywords = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["deriveSearchKeywords"])(result.brand, result.productFamily, result.productType);
    }
    return result;
}
}),
"[project]/src/app/api/products/import/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/lookups.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$serialize$2d$product$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/serialize-product.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/xlsx/xlsx.mjs [app-route] (ecmascript)");
;
;
;
;
;
const COLUMN_MAPPINGS = [
    // Product Identity
    {
        field: 'sourceRow',
        type: 'integer',
        patterns: [
            'source row',
            'sourcerow',
            'source_row',
            'sr',
            's.r',
            'serial',
            '#',
            'row'
        ]
    },
    {
        field: 'productId',
        type: 'string',
        patterns: [
            'product id',
            'productid',
            'product_id',
            'prod id',
            'prodid',
            'erp id',
            'erpid'
        ]
    },
    {
        field: 'sku',
        type: 'string',
        patterns: [
            'sku',
            'SKU',
            'stock keeping unit',
            'item code',
            'itemcode'
        ]
    },
    {
        field: 'ndNumber',
        type: 'string',
        patterns: [
            'nd number',
            'ndnumber',
            'nd_number',
            'nd no',
            'ndno',
            'nd_no',
            'nd',
            'nd-number'
        ]
    },
    {
        field: 'barcode',
        type: 'string',
        patterns: [
            'barcode',
            'bar code',
            'bar_code',
            'ean',
            'upc',
            'ean-13',
            'code'
        ]
    },
    {
        field: 'legacyCode',
        type: 'string',
        patterns: [
            'legacy code',
            'legacycode',
            'legacy_code',
            'old code',
            'oldcode',
            'legacy'
        ]
    },
    {
        field: 'brand',
        type: 'string',
        patterns: [
            'brand',
            'Brand',
            'BRAND',
            'manufacturer',
            'make'
        ]
    },
    {
        field: 'brandAr',
        type: 'string',
        patterns: [
            'brand ar',
            'brandar',
            'brand_ar',
            'brand arabic',
            'brand_arabic',
            'العلامة التجارية'
        ]
    },
    {
        field: 'brandCode',
        type: 'string',
        patterns: [
            'brand code',
            'brandcode',
            'brand_code',
            'brand no',
            'brandno'
        ]
    },
    {
        field: 'model',
        type: 'string',
        patterns: [
            'model',
            'Model',
            'MODEL',
            'variant',
            'model code'
        ]
    },
    // Classification
    {
        field: 'department',
        type: 'string',
        patterns: [
            'department',
            'dept',
            'Department',
            'DEPT'
        ]
    },
    {
        field: 'category',
        type: 'string',
        patterns: [
            'category',
            'Category',
            'CATEGORY',
            'cat'
        ]
    },
    {
        field: 'subcategory',
        type: 'string',
        patterns: [
            'subcategory',
            'sub-category',
            'sub_category',
            'sub category',
            'subcat'
        ]
    },
    {
        field: 'sectionCode',
        type: 'string',
        patterns: [
            'section code',
            'sectioncode',
            'section_code',
            'section',
            'sect code'
        ]
    },
    {
        field: 'productFamily',
        type: 'string',
        patterns: [
            'product family',
            'productfamily',
            'product_family',
            'family',
            'prod family'
        ]
    },
    {
        field: 'productType',
        type: 'string',
        patterns: [
            'product type',
            'producttype',
            'product_type',
            'type',
            'prod type'
        ]
    },
    // Product Information
    {
        field: 'nameAr',
        type: 'string',
        patterns: [
            'name ar',
            'namear',
            'name_ar',
            'arabic name',
            'الاسم',
            'اسم المنتج',
            'arabic description',
            'arabicdescription',
            'arabic_description'
        ]
    },
    {
        field: 'nameEn',
        type: 'string',
        patterns: [
            'name en',
            'nameen',
            'name_en',
            'english name',
            'english description',
            'englishdescription',
            'english_description',
            'description',
            'desc',
            'product name'
        ]
    },
    {
        field: 'shortDescAr',
        type: 'string',
        patterns: [
            'short desc ar',
            'shortdescar',
            'short_desc_ar',
            'short description ar',
            'short_ar'
        ]
    },
    {
        field: 'shortDescEn',
        type: 'string',
        patterns: [
            'short desc en',
            'shortdescen',
            'short_desc_en',
            'short description en',
            'short_en',
            'short desc'
        ]
    },
    {
        field: 'longDescAr',
        type: 'string',
        patterns: [
            'long desc ar',
            'longdescar',
            'long_desc_ar',
            'long description ar',
            'detailed desc ar'
        ]
    },
    {
        field: 'longDescEn',
        type: 'string',
        patterns: [
            'long desc en',
            'longdescen',
            'long_desc_en',
            'long description en',
            'detailed desc',
            'full description'
        ]
    },
    // Attributes
    {
        field: 'color',
        type: 'string',
        patterns: [
            'color',
            'colour',
            'Color',
            'Colour',
            'COLOR',
            'COLOUR'
        ]
    },
    {
        field: 'colorAr',
        type: 'string',
        patterns: [
            'color ar',
            'colour ar',
            'colorar',
            'colourar',
            'color_ar',
            'color arabic'
        ]
    },
    {
        field: 'material',
        type: 'string',
        patterns: [
            'material',
            'Material',
            'MATERIAL',
            'mat'
        ]
    },
    {
        field: 'materialAr',
        type: 'string',
        patterns: [
            'material ar',
            'materialar',
            'material_ar',
            'material arabic'
        ]
    },
    {
        field: 'capacity',
        type: 'decimal',
        patterns: [
            'capacity',
            'Capacity',
            'volume',
            'CAPACITY'
        ]
    },
    {
        field: 'capacityUnit',
        type: 'string',
        patterns: [
            'capacity unit',
            'capacityunit',
            'capacity_unit',
            'cap unit',
            'vol unit'
        ]
    },
    {
        field: 'weight',
        type: 'decimal',
        patterns: [
            'weight',
            'Weight',
            'WEIGHT',
            'wt'
        ]
    },
    {
        field: 'weightUnit',
        type: 'string',
        patterns: [
            'weight unit',
            'weightunit',
            'weight_unit',
            'wt unit'
        ]
    },
    {
        field: 'length',
        type: 'decimal',
        patterns: [
            'length',
            'Length',
            'l',
            'L',
            'len',
            'dimension l'
        ]
    },
    {
        field: 'width',
        type: 'decimal',
        patterns: [
            'width',
            'Width',
            'w',
            'W',
            'wid',
            'dimension w'
        ]
    },
    {
        field: 'height',
        type: 'decimal',
        patterns: [
            'height',
            'Height',
            'h',
            'H',
            'ht',
            'dimension h'
        ]
    },
    {
        field: 'diameter',
        type: 'decimal',
        patterns: [
            'diameter',
            'Diameter',
            'dia',
            'DIAMETER'
        ]
    },
    {
        field: 'dimensionUnit',
        type: 'string',
        patterns: [
            'dimension unit',
            'dimensionunit',
            'dimension_unit',
            'dim unit',
            'size unit'
        ]
    },
    // Logistics
    {
        field: 'countryOfOrigin',
        type: 'string',
        patterns: [
            'country of origin',
            'countryoforigin',
            'country_of_origin',
            'origin',
            'country',
            'made in',
            'made',
            'made_in'
        ]
    },
    {
        field: 'unit',
        type: 'string',
        patterns: [
            'unit',
            'Unit',
            'UNIT',
            'unit of sale',
            'sale unit',
            'uom'
        ]
    },
    {
        field: 'minSalesMultiples',
        type: 'string',
        patterns: [
            'min sales multiples',
            'minsalesmultiples',
            'min_sales_multiples',
            'min sales',
            'min multiples',
            'min qty'
        ]
    },
    // Commercial
    {
        field: 'defaultPrice',
        type: 'decimal',
        patterns: [
            'default price',
            'defaultprice',
            'default_price',
            'price',
            'Price',
            'PRICE',
            'unit price',
            'retail price'
        ]
    },
    // SEO
    {
        field: 'seoTitleEn',
        type: 'string',
        patterns: [
            'seo title en',
            'seotitleen',
            'seo_title_en',
            'meta title',
            'page title'
        ]
    },
    {
        field: 'seoTitleAr',
        type: 'string',
        patterns: [
            'seo title ar',
            'seotitlear',
            'seo_title_ar',
            'meta title ar'
        ]
    },
    {
        field: 'seoDescriptionEn',
        type: 'string',
        patterns: [
            'seo description en',
            'seodescriptionen',
            'seo_description_en',
            'meta description',
            'meta desc'
        ]
    },
    {
        field: 'seoDescriptionAr',
        type: 'string',
        patterns: [
            'seo description ar',
            'seodescriptionar',
            'seo_description_ar',
            'meta description ar'
        ]
    },
    {
        field: 'searchKeywords',
        type: 'string',
        patterns: [
            'search keywords',
            'searchkeywords',
            'search_keywords',
            'keywords',
            'tags'
        ]
    },
    // Internal
    {
        field: 'internalNotes',
        type: 'string',
        patterns: [
            'internal notes',
            'internalnotes',
            'internal_notes',
            'notes',
            'staff notes'
        ]
    },
    {
        field: 'validationStatus',
        type: 'string',
        patterns: [
            'validation status',
            'validationstatus',
            'validation_status',
            'status',
            'review status'
        ]
    },
    {
        field: 'confidenceScore',
        type: 'integer',
        patterns: [
            'confidence score',
            'confidencescore',
            'confidence_score',
            'quality score',
            'score'
        ]
    },
    {
        field: 'pieces',
        type: 'integer',
        patterns: [
            'pieces',
            'Pieces',
            'PIECES',
            'piece',
            'pcs',
            'Pcs',
            'PCS',
            'qty',
            'quantity'
        ]
    },
    {
        field: 'setCount',
        type: 'integer',
        patterns: [
            'set count',
            'setcount',
            'set_count',
            'items in set',
            'set items'
        ]
    },
    {
        field: 'shape',
        type: 'string',
        patterns: [
            'shape',
            'Shape',
            'SHAPE',
            'form'
        ]
    },
    {
        field: 'finish',
        type: 'string',
        patterns: [
            'finish',
            'Finish',
            'FINISH',
            'surface'
        ]
    },
    {
        field: 'additionalInfo',
        type: 'string',
        patterns: [
            'additional info',
            'additionalinfo',
            'additional_info',
            'additional information',
            'add info',
            'extra info',
            'extra'
        ]
    }
];
// ─────────────────────────────────────────────────────────────
// Group header names for two-row header detection
// ─────────────────────────────────────────────────────────────
const GROUP_HEADERS = new Set([
    'product identity',
    'classification',
    'product information',
    'attributes',
    'logistics',
    'commercial',
    'seo',
    'internal'
]);
// ─────────────────────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────────────────────
function normalize(s) {
    return s.toLowerCase().replace(/[\s_-]/g, '').trim();
}
function resolveTwoRowHeaders(worksheet) {
    const range = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["utils"].decode_range(worksheet['!ref'] || 'A1');
    const maxCol = range.e.c;
    const row1 = [];
    const row2 = [];
    for(let c = 0; c <= maxCol; c++){
        const cell1 = worksheet[__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["utils"].encode_cell({
            r: 0,
            c
        })];
        const cell2 = worksheet[__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["utils"].encode_cell({
            r: 1,
            c
        })];
        row1.push(cell1 ? String(cell1.v ?? '').trim() : '');
        row2.push(cell2 ? String(cell2.v ?? '').trim() : '');
    }
    const row2HasContent = row2.some((v)=>v !== '');
    const row1HasGroupHeader = row1.some((v)=>GROUP_HEADERS.has(normalize(v)));
    // If row 2 has content and row 1 has group headers, it's a two-row header format
    if (row2HasContent && row1HasGroupHeader) {
        const headers = [];
        for(let c = 0; c <= maxCol; c++){
            const r2 = row2[c];
            // Use Row 2 as the actual header if it has content
            headers.push(r2 || row1[c]);
        }
        return {
            headers,
            dataStartRow: 2
        };
    }
    // Single-row header
    const headers = [];
    for(let c = 0; c <= maxCol; c++){
        headers.push(row1[c]);
    }
    return {
        headers,
        dataStartRow: 1
    };
}
function matchHeader(header, patterns) {
    if (!header) return false;
    const headerLower = header.toLowerCase();
    const headerNorm = normalize(header);
    return patterns.some((p)=>header === p || headerLower === p.toLowerCase() || headerNorm === normalize(p));
}
function buildColumnMapping(headers) {
    const mapping = new Map();
    const mappedIndices = new Set();
    // First pass: exact matches with COLUMN_DEFS header names
    for(let c = 0; c < headers.length; c++){
        const header = headers[c];
        if (!header) continue;
        const headerNorm = normalize(header);
        for (const colMapping of COLUMN_MAPPINGS){
            if (mappedIndices.has(c)) break;
            // Check against COLUMN_DEFS header for exact match
            const colDef = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["COLUMN_DEFS"].find((cd)=>cd.field === colMapping.field);
            if (colDef && (header === colDef.header || headerNorm === normalize(colDef.header))) {
                mapping.set(c, colMapping);
                mappedIndices.add(c);
                break;
            }
        }
    }
    // Second pass: pattern matching for unmatched columns
    for (const colMapping of COLUMN_MAPPINGS){
        for(let c = 0; c < headers.length; c++){
            if (mappedIndices.has(c)) continue;
            if (matchHeader(headers[c], colMapping.patterns)) {
                mapping.set(c, colMapping);
                mappedIndices.add(c);
                break;
            }
        }
    }
    const unmapped = headers.map((h, i)=>({
            h,
            i
        })).filter(({ h, i })=>h && !mappedIndices.has(i)).map(({ h })=>h);
    return {
        mapping,
        unmapped
    };
}
function toNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
}
function toDecimal(value) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return value === 0 ? null : value;
    const cleaned = String(value).replace(/[^0-9.\-]/g, '').trim();
    if (!cleaned || cleaned === '.') return null;
    const num = Number(cleaned);
    if (isNaN(num) || num === 0) return null;
    return num;
}
function toInteger(value) {
    if (value === null || value === undefined || value === '') return null;
    const num = parseInt(String(value), 10);
    return isNaN(num) ? null : num;
}
function toString(value) {
    if (value === null || value === undefined || value === '') return null;
    return String(value).trim() || null;
}
function toBarcode(value) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return value.toLocaleString('fullwide', {
        useGrouping: false
    });
    const str = String(value).trim();
    if (!str) return null;
    if (/^\d+\.?\d*e[+-]?\d+$/i.test(str)) {
        const num = Number(str);
        if (!isNaN(num)) return num.toLocaleString('fullwide', {
            useGrouping: false
        });
    }
    return str;
}
function getCellValue(worksheet, r, c) {
    const cell = worksheet[__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["utils"].encode_cell({
        r,
        c
    })];
    return cell ? cell.v : '';
}
async function POST(request) {
    const importStartTime = Date.now();
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'No file provided'
            }, {
                status: 400
            });
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        const workbook = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["read"](buffer, {
            type: 'buffer'
        });
        if (!workbook.SheetNames.length) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Excel file has no sheets'
            }, {
                status: 400
            });
        }
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet['!ref']) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Excel sheet is empty'
            }, {
                status: 400
            });
        }
        const { headers, dataStartRow } = resolveTwoRowHeaders(worksheet);
        const { mapping, unmapped } = buildColumnMapping(headers);
        const mappedHeaders = {};
        for (const [colIdx, mapInfo] of mapping){
            mappedHeaders[mapInfo.field] = headers[colIdx];
        }
        if (mapping.size === 0) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'No recognizable column headers found in Excel file.',
                rawHeaders: headers,
                imported: 0,
                errors: 0,
                total: 0,
                skipped: 0
            }, {
                status: 400
            });
        }
        const range = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$xlsx$2f$xlsx$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["utils"].decode_range(worksheet['!ref'] || 'A1');
        const totalDataRows = range.e.r - dataStartRow + 1;
        if (totalDataRows <= 0) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Excel file has no data rows after headers',
                imported: 0,
                errors: 0,
                total: 0,
                skipped: 0
            }, {
                status: 400
            });
        }
        let imported = 0;
        let errors = 0;
        let skipped = 0;
        let withPrice = 0;
        let withoutPrice = 0;
        const errorDetails = [];
        const successDetails = [];
        const previewRows = [];
        // Parse all rows first
        const BATCH_SIZE = 100;
        const batchRows = [];
        for(let r = dataStartRow; r <= range.e.r; r++){
            const rowNum = r + 1;
            const record = {};
            for (const [colIdx, mapInfo] of mapping){
                const rawValue = getCellValue(worksheet, r, colIdx);
                switch(mapInfo.type){
                    case 'integer':
                        record[mapInfo.field] = toInteger(rawValue);
                        break;
                    case 'decimal':
                        if (mapInfo.field === 'defaultPrice') {
                            record[mapInfo.field] = toDecimal(rawValue);
                        } else {
                            record[mapInfo.field] = toNumber(rawValue);
                        }
                        break;
                    case 'number':
                        record[mapInfo.field] = toNumber(rawValue);
                        break;
                    case 'string':
                        record[mapInfo.field] = mapInfo.field === 'barcode' || mapInfo.field === 'productId' || mapInfo.field === 'sku' ? toBarcode(rawValue) : toString(rawValue);
                        break;
                }
            }
            if (previewRows.length < 5) {
                previewRows.push({
                    row: rowNum,
                    data: {
                        ...record
                    }
                });
            }
            const allFieldsNull = Object.values(record).every((v)=>v === null || v === undefined);
            if (allFieldsNull) {
                skipped++;
                continue;
            }
            // Apply auto-derivation rules
            const derivedRecord = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$serialize$2d$product$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["applyAutoDerivations"])(record);
            batchRows.push({
                rowNum,
                data: derivedRecord
            });
        }
        // Insert in batches using Prisma
        // Each product is created along with its ProductOriginal record for change tracking
        for(let i = 0; i < batchRows.length; i += BATCH_SIZE){
            const batch = batchRows.slice(i, i + BATCH_SIZE);
            try {
                await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].$transaction(batch.map(({ data })=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.create({
                        data,
                        include: {
                            original: true
                        }
                    })).flatMap((result)=>{
                    // After product creation, create ProductOriginal with the same values
                    const product = result;
                    return [
                        result,
                        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].productOriginal.create({
                            data: {
                                productId: product.id,
                                sourceRow: product.sourceRow,
                                origProductId: product.productId,
                                sku: product.sku,
                                ndNumber: product.ndNumber,
                                barcode: product.barcode,
                                legacyCode: product.legacyCode,
                                brand: product.brand,
                                brandAr: product.brandAr,
                                brandCode: product.brandCode,
                                model: product.model,
                                department: product.department,
                                category: product.category,
                                subcategory: product.subcategory,
                                sectionCode: product.sectionCode,
                                productFamily: product.productFamily,
                                productType: product.productType,
                                nameAr: product.nameAr,
                                nameEn: product.nameEn,
                                shortDescAr: product.shortDescAr,
                                shortDescEn: product.shortDescEn,
                                longDescAr: product.longDescAr,
                                longDescEn: product.longDescEn,
                                color: product.color,
                                colorAr: product.colorAr,
                                material: product.material,
                                materialAr: product.materialAr,
                                capacity: product.capacity,
                                capacityUnit: product.capacityUnit,
                                weight: product.weight,
                                weightUnit: product.weightUnit,
                                length: product.length,
                                width: product.width,
                                height: product.height,
                                diameter: product.diameter,
                                dimensionUnit: product.dimensionUnit,
                                countryOfOrigin: product.countryOfOrigin,
                                unit: product.unit,
                                minSalesMultiples: product.minSalesMultiples,
                                defaultPrice: product.defaultPrice,
                                seoTitleEn: product.seoTitleEn,
                                seoTitleAr: product.seoTitleAr,
                                seoDescriptionEn: product.seoDescriptionEn,
                                seoDescriptionAr: product.seoDescriptionAr,
                                searchKeywords: product.searchKeywords,
                                internalNotes: product.internalNotes,
                                validationStatus: product.validationStatus,
                                confidenceScore: product.confidenceScore,
                                pieces: product.pieces,
                                setCount: product.setCount,
                                shape: product.shape,
                                finish: product.finish,
                                additionalInfo: product.additionalInfo
                            }
                        })
                    ];
                }));
                for (const { rowNum, data } of batch){
                    imported++;
                    if (data.defaultPrice != null && data.defaultPrice !== 0) withPrice++;
                    else withoutPrice++;
                    successDetails.push({
                        row: rowNum,
                        nameEn: data.nameEn ?? null,
                        ndNumber: data.ndNumber ?? null
                    });
                }
            } catch (err) {
                // Batch failed — retry row-by-row
                for (const { rowNum, data } of batch){
                    try {
                        const product = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.create({
                            data
                        });
                        // Create ProductOriginal for change tracking
                        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].productOriginal.create({
                            data: {
                                productId: product.id,
                                sourceRow: product.sourceRow,
                                origProductId: product.productId,
                                sku: product.sku,
                                ndNumber: product.ndNumber,
                                barcode: product.barcode,
                                legacyCode: product.legacyCode,
                                brand: product.brand,
                                brandAr: product.brandAr,
                                brandCode: product.brandCode,
                                model: product.model,
                                department: product.department,
                                category: product.category,
                                subcategory: product.subcategory,
                                sectionCode: product.sectionCode,
                                productFamily: product.productFamily,
                                productType: product.productType,
                                nameAr: product.nameAr,
                                nameEn: product.nameEn,
                                shortDescAr: product.shortDescAr,
                                shortDescEn: product.shortDescEn,
                                longDescAr: product.longDescAr,
                                longDescEn: product.longDescEn,
                                color: product.color,
                                colorAr: product.colorAr,
                                material: product.material,
                                materialAr: product.materialAr,
                                capacity: product.capacity,
                                capacityUnit: product.capacityUnit,
                                weight: product.weight,
                                weightUnit: product.weightUnit,
                                length: product.length,
                                width: product.width,
                                height: product.height,
                                diameter: product.diameter,
                                dimensionUnit: product.dimensionUnit,
                                countryOfOrigin: product.countryOfOrigin,
                                unit: product.unit,
                                minSalesMultiples: product.minSalesMultiples,
                                defaultPrice: product.defaultPrice,
                                seoTitleEn: product.seoTitleEn,
                                seoTitleAr: product.seoTitleAr,
                                seoDescriptionEn: product.seoDescriptionEn,
                                seoDescriptionAr: product.seoDescriptionAr,
                                searchKeywords: product.searchKeywords,
                                internalNotes: product.internalNotes,
                                validationStatus: product.validationStatus,
                                confidenceScore: product.confidenceScore,
                                pieces: product.pieces,
                                setCount: product.setCount,
                                shape: product.shape,
                                finish: product.finish,
                                additionalInfo: product.additionalInfo
                            }
                        });
                        imported++;
                        if (data.defaultPrice != null && data.defaultPrice !== 0) withPrice++;
                        else withoutPrice++;
                        successDetails.push({
                            row: rowNum,
                            nameEn: data.nameEn ?? null,
                            ndNumber: data.ndNumber ?? null
                        });
                    } catch (singleErr) {
                        errors++;
                        errorDetails.push({
                            row: rowNum,
                            error: singleErr?.message || String(singleErr)
                        });
                    }
                }
            }
        }
        const elapsedMs = Date.now() - importStartTime;
        const totalProcessed = imported + errors + skipped;
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            imported,
            errors,
            skipped,
            total: totalProcessed,
            withPrice,
            withoutPrice,
            elapsedMs,
            rawHeaders: headers,
            columnMapping: mappedHeaders,
            unmappedColumns: unmapped,
            previewRows: previewRows.length > 0 ? previewRows : undefined,
            successDetails: successDetails.length > 0 ? successDetails : undefined,
            errorDetails: errorDetails.length > 0 ? errorDetails.slice(0, 50) : undefined
        });
    } catch (error) {
        console.error('[IMPORT] Fatal error:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to import Excel file: ' + (error?.message || String(error)),
            imported: 0,
            errors: 0,
            total: 0,
            skipped: 0
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__2c5a85f8._.js.map