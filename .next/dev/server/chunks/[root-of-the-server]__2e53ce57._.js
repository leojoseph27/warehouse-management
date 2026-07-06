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
    "bulkCreate",
    ()=>bulkCreate,
    "db",
    ()=>db,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__ = __turbopack_context__.i("[externals]/@prisma/client [external] (@prisma/client, cjs, [project]/node_modules/@prisma/client)");
;
const globalForPrisma = globalThis;
// Configure Prisma with optimized connection pool for Neon PostgreSQL
// Neon requires connection pooling for serverless/edge environments
const prismaClientSingleton = ()=>{
    return new __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__["PrismaClient"]({
        log: ("TURBOPACK compile-time truthy", 1) ? [
            'warn',
            'error'
        ] : "TURBOPACK unreachable"
    });
};
const db = globalForPrisma.prisma ?? prismaClientSingleton();
if ("TURBOPACK compile-time truthy", 1) {
    globalForPrisma.prisma = db;
}
// Graceful shutdown handling
if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
const __TURBOPACK__default__export__ = db;
async function bulkCreate(model, data, batchSize = 100) {
    const errors = [];
    let created = 0;
    for(let i = 0; i < data.length; i += batchSize){
        const batch = data.slice(i, i + batchSize);
        try {
            await model.createMany({
                data: batch,
                skipDuplicates: true
            });
            created += batch.length;
        } catch (err) {
            // If batch fails, try individual inserts to identify problematic rows
            for(let j = 0; j < batch.length; j++){
                try {
                    await model.create({
                        data: batch[j]
                    });
                    created++;
                } catch (singleErr) {
                    errors.push({
                        index: i + j,
                        error: singleErr?.message || String(singleErr)
                    });
                }
            }
        }
    }
    return {
        created,
        errors
    };
}
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
"[project]/src/app/api/products/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$serialize$2d$product$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/serialize-product.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/lookups.ts [app-route] (ecmascript)");
;
;
;
;
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('mode') || '';
        // ── ND Groups mode ──
        if (mode === 'nd-groups') {
            const search = searchParams.get('search') || '';
            const where = {
                ndNumber: {
                    not: null
                }
            };
            if (search) {
                where.ndNumber = {
                    not: null,
                    contains: search,
                    mode: 'insensitive'
                };
            }
            const rows = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.findMany({
                where,
                select: {
                    ndNumber: true
                }
            });
            const groupMap = new Map();
            for (const row of rows){
                const nd = row.ndNumber;
                if (nd) {
                    groupMap.set(nd, (groupMap.get(nd) || 0) + 1);
                }
            }
            const groups = Array.from(groupMap.entries()).map(([ndNumber, count])=>({
                    ndNumber,
                    count
                })).sort((a, b)=>b.count - a.count || a.ndNumber.localeCompare(b.ndNumber));
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                groups,
                totalGroups: groups.length
            });
        }
        // ── Suggestions mode ── (Optimized with single aggregation query)
        if (mode === 'suggestions') {
            // Use a single raw query to get all distinct values at once
            // This is MUCH faster than 13 separate findMany with distinct
            try {
                const suggestionsData = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].$queryRaw`
          SELECT
            ARRAY_AGG(DISTINCT brand) FILTER (WHERE brand IS NOT NULL) as brands,
            ARRAY_AGG(DISTINCT department) FILTER (WHERE department IS NOT NULL) as departments,
            ARRAY_AGG(DISTINCT category) FILTER (WHERE category IS NOT NULL) as categories,
            ARRAY_AGG(DISTINCT subcategory) FILTER (WHERE subcategory IS NOT NULL) as subcategories,
            ARRAY_AGG(DISTINCT product_family) FILTER (WHERE product_family IS NOT NULL) as product_families,
            ARRAY_AGG(DISTINCT product_type) FILTER (WHERE product_type IS NOT NULL) as product_types,
            ARRAY_AGG(DISTINCT color) FILTER (WHERE color IS NOT NULL) as colors,
            ARRAY_AGG(DISTINCT material) FILTER (WHERE material IS NOT NULL) as materials,
            ARRAY_AGG(DISTINCT country_of_origin) FILTER (WHERE country_of_origin IS NOT NULL) as countries,
            ARRAY_AGG(DISTINCT shape) FILTER (WHERE shape IS NOT NULL) as shapes,
            ARRAY_AGG(DISTINCT finish) FILTER (WHERE finish IS NOT NULL) as finishes,
            ARRAY_AGG(DISTINCT validation_status) FILTER (WHERE validation_status IS NOT NULL) as validation_statuses,
            ARRAY_AGG(DISTINCT unit) FILTER (WHERE unit IS NOT NULL) as units
          FROM products
        `;
                const data = suggestionsData[0] || {};
                // Merge DB values with lookup table values and sort
                const mergeAndSort = (dbValues, lookupValues)=>{
                    const combined = new Set([
                        ...lookupValues,
                        ...dbValues || []
                    ]);
                    return [
                        ...combined
                    ].sort((a, b)=>a.localeCompare(b, undefined, {
                            sensitivity: 'base'
                        }));
                };
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    brands: mergeAndSort(data.brands, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["BRAND_OPTIONS"]),
                    departments: mergeAndSort(data.departments, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["DEPARTMENTS"]),
                    categories: mergeAndSort(data.categories, []),
                    subcategories: mergeAndSort(data.subcategories, []),
                    productFamilies: mergeAndSort(data.product_families, [
                        ...__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PRODUCT_FAMILIES"]
                    ]),
                    productTypes: mergeAndSort(data.product_types, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ALL_PRODUCT_TYPES"]),
                    colors: mergeAndSort(data.colors, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["COLOR_OPTIONS"]),
                    materials: mergeAndSort(data.materials, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MATERIAL_OPTIONS"]),
                    countriesOfOrigin: mergeAndSort(data.countries, [
                        ...__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["COUNTRY_OPTIONS"]
                    ]),
                    shapes: mergeAndSort(data.shapes, [
                        ...__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SHAPE_OPTIONS"]
                    ]),
                    finishes: mergeAndSort(data.finishes, [
                        ...__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["FINISH_OPTIONS"]
                    ]),
                    validationStatuses: mergeAndSort(data.validation_statuses, [
                        ...__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["VALIDATION_STATUS_OPTIONS"]
                    ]),
                    units: mergeAndSort(data.units, [
                        ...__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["UNIT_OPTIONS"]
                    ])
                });
            } catch (rawError) {
                // Fallback to original method if raw query fails
                console.error('Suggestions raw query failed, using fallback:', rawError);
                const [dbBrands, dbDepartments, dbCategories, dbSubcategories, dbProductFamilies, dbProductTypes, dbColors, dbMaterials, dbCountries, dbShapes, dbFinishes, dbValidationStatuses, dbUnits] = await Promise.all([
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.findMany({
                        where: {
                            brand: {
                                not: null
                            }
                        },
                        select: {
                            brand: true
                        },
                        distinct: [
                            'brand'
                        ]
                    }),
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.findMany({
                        where: {
                            department: {
                                not: null
                            }
                        },
                        select: {
                            department: true
                        },
                        distinct: [
                            'department'
                        ]
                    }),
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.findMany({
                        where: {
                            category: {
                                not: null
                            }
                        },
                        select: {
                            category: true
                        },
                        distinct: [
                            'category'
                        ]
                    }),
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.findMany({
                        where: {
                            subcategory: {
                                not: null
                            }
                        },
                        select: {
                            subcategory: true
                        },
                        distinct: [
                            'subcategory'
                        ]
                    }),
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.findMany({
                        where: {
                            productFamily: {
                                not: null
                            }
                        },
                        select: {
                            productFamily: true
                        },
                        distinct: [
                            'productFamily'
                        ]
                    }),
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.findMany({
                        where: {
                            productType: {
                                not: null
                            }
                        },
                        select: {
                            productType: true
                        },
                        distinct: [
                            'productType'
                        ]
                    }),
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.findMany({
                        where: {
                            color: {
                                not: null
                            }
                        },
                        select: {
                            color: true
                        },
                        distinct: [
                            'color'
                        ]
                    }),
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.findMany({
                        where: {
                            material: {
                                not: null
                            }
                        },
                        select: {
                            material: true
                        },
                        distinct: [
                            'material'
                        ]
                    }),
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.findMany({
                        where: {
                            countryOfOrigin: {
                                not: null
                            }
                        },
                        select: {
                            countryOfOrigin: true
                        },
                        distinct: [
                            'countryOfOrigin'
                        ]
                    }),
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.findMany({
                        where: {
                            shape: {
                                not: null
                            }
                        },
                        select: {
                            shape: true
                        },
                        distinct: [
                            'shape'
                        ]
                    }),
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.findMany({
                        where: {
                            finish: {
                                not: null
                            }
                        },
                        select: {
                            finish: true
                        },
                        distinct: [
                            'finish'
                        ]
                    }),
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.findMany({
                        where: {
                            validationStatus: {
                                not: null
                            }
                        },
                        select: {
                            validationStatus: true
                        },
                        distinct: [
                            'validationStatus'
                        ]
                    }),
                    __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.findMany({
                        where: {
                            unit: {
                                not: null
                            }
                        },
                        select: {
                            unit: true
                        },
                        distinct: [
                            'unit'
                        ]
                    })
                ]);
                const merge = (dbRows, key, lookupValues)=>{
                    const dbValues = dbRows.map((r)=>r[key]).filter((v)=>v !== null && v !== '');
                    const combined = new Set([
                        ...lookupValues,
                        ...dbValues
                    ]);
                    return [
                        ...combined
                    ].sort((a, b)=>a.localeCompare(b, undefined, {
                            sensitivity: 'base'
                        }));
                };
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    brands: merge(dbBrands, 'brand', __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["BRAND_OPTIONS"]),
                    departments: merge(dbDepartments, 'department', __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["DEPARTMENTS"]),
                    categories: merge(dbCategories, 'category', []),
                    subcategories: merge(dbSubcategories, 'subcategory', []),
                    productFamilies: merge(dbProductFamilies, 'productFamily', [
                        ...__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["PRODUCT_FAMILIES"]
                    ]),
                    productTypes: merge(dbProductTypes, 'productType', __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["ALL_PRODUCT_TYPES"]),
                    colors: merge(dbColors, 'color', __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["COLOR_OPTIONS"]),
                    materials: merge(dbMaterials, 'material', __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["MATERIAL_OPTIONS"]),
                    countriesOfOrigin: merge(dbCountries, 'countryOfOrigin', [
                        ...__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["COUNTRY_OPTIONS"]
                    ]),
                    shapes: merge(dbShapes, 'shape', [
                        ...__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SHAPE_OPTIONS"]
                    ]),
                    finishes: merge(dbFinishes, 'finish', [
                        ...__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["FINISH_OPTIONS"]
                    ]),
                    validationStatuses: merge(dbValidationStatuses, 'validationStatus', [
                        ...__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["VALIDATION_STATUS_OPTIONS"]
                    ]),
                    units: merge(dbUnits, 'unit', [
                        ...__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$lookups$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["UNIT_OPTIONS"]
                    ])
                });
            }
        }
        // ── Normal product listing mode ──
        const search = searchParams.get('search') || '';
        const department = searchParams.get('department') || '';
        const category = searchParams.get('category') || '';
        const subcategory = searchParams.get('subcategory') || '';
        const productFamily = searchParams.get('productFamily') || '';
        const productType = searchParams.get('productType') || '';
        const brand = searchParams.get('brand') || '';
        const color = searchParams.get('color') || '';
        const material = searchParams.get('material') || '';
        const countryOfOrigin = searchParams.get('countryOfOrigin') || '';
        const shape = searchParams.get('shape') || '';
        const validationStatus = searchParams.get('validationStatus') || '';
        const unit = searchParams.get('unit') || '';
        const ndNumber = searchParams.get('ndNumber') || '';
        const priceMin = searchParams.get('priceMin');
        const priceMax = searchParams.get('priceMax');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const sortBy = searchParams.get('sortBy') || 'sourceRow';
        const sortOrder = searchParams.get('sortOrder') || 'asc';
        // Sort mapping
        const sortColumn = sortBy === 'sourceRow' ? 'sourceRow' : sortBy === 'ndNumber' ? 'ndNumber' : sortBy === 'nameEn' ? 'nameEn' : sortBy === 'productType' ? 'productType' : sortBy === 'productFamily' ? 'productFamily' : sortBy === 'recentlyUpdated' ? 'updatedAt' : sortBy === 'recentlyAdded' ? 'createdAt' : sortBy === 'defaultPrice' ? 'defaultPrice' : 'sourceRow';
        const orderDir = sortOrder === 'desc' ? 'desc' : 'asc';
        // Build where clause — all filters are direct DB column filters now
        const where = {};
        // Search across multiple fields
        if (search) {
            where.OR = [
                {
                    ndNumber: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    barcode: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    nameEn: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    nameAr: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    productId: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    sku: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    brand: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    productType: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    productFamily: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    model: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    seoTitleEn: {
                        contains: search,
                        mode: 'insensitive'
                    }
                }
            ];
        }
        // Direct column filters
        if (ndNumber) where.ndNumber = {
            ...where.ndNumber,
            contains: ndNumber,
            mode: 'insensitive'
        };
        if (department) where.department = {
            contains: department,
            mode: 'insensitive'
        };
        if (category) where.category = {
            contains: category,
            mode: 'insensitive'
        };
        if (subcategory) where.subcategory = {
            contains: subcategory,
            mode: 'insensitive'
        };
        if (productFamily) where.productFamily = {
            contains: productFamily,
            mode: 'insensitive'
        };
        if (productType) where.productType = {
            contains: productType,
            mode: 'insensitive'
        };
        if (brand) where.brand = {
            contains: brand,
            mode: 'insensitive'
        };
        if (color) where.color = {
            contains: color,
            mode: 'insensitive'
        };
        if (material) where.material = {
            contains: material,
            mode: 'insensitive'
        };
        if (countryOfOrigin) where.countryOfOrigin = {
            contains: countryOfOrigin,
            mode: 'insensitive'
        };
        if (shape) where.shape = {
            contains: shape,
            mode: 'insensitive'
        };
        if (validationStatus) where.validationStatus = {
            equals: validationStatus
        };
        if (unit) where.unit = {
            equals: unit
        };
        // Price range filters
        if (priceMin) {
            where.defaultPrice = {
                ...where.defaultPrice,
                gte: parseFloat(priceMin)
            };
        }
        if (priceMax) {
            where.defaultPrice = {
                ...where.defaultPrice,
                lte: parseFloat(priceMax)
            };
        }
        const [total, products] = await Promise.all([
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.count({
                where
            }),
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.findMany({
                where,
                include: {
                    images: {
                        orderBy: {
                            displayOrder: 'asc'
                        }
                    },
                    original: true,
                    variantMemberships: true
                },
                orderBy: {
                    [sortColumn]: orderDir
                },
                skip: (page - 1) * limit,
                take: limit
            })
        ]);
        const mappedProducts = products.map((p)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$serialize$2d$product$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["serializeProduct"])(p));
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            products: mappedProducts,
            total,
            page,
            limit
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to fetch products'
        }, {
            status: 500
        });
    }
}
// ─────────────────────────────────────────────────────────────
// POST /api/products
// ─────────────────────────────────────────────────────────────
/** All 52 product fields that can be accepted in POST body */ const PRODUCT_FIELDS = [
    // Product Identity
    'sourceRow',
    'productId',
    'sku',
    'ndNumber',
    'barcode',
    'legacyCode',
    'brand',
    'brandAr',
    'brandCode',
    'model',
    // Classification
    'department',
    'category',
    'subcategory',
    'sectionCode',
    'productFamily',
    'productType',
    // Product Information
    'nameAr',
    'nameEn',
    'shortDescAr',
    'shortDescEn',
    'longDescAr',
    'longDescEn',
    // Attributes
    'color',
    'colorAr',
    'material',
    'materialAr',
    'capacity',
    'capacityUnit',
    'weight',
    'weightUnit',
    'length',
    'width',
    'height',
    'diameter',
    'dimensionUnit',
    // Logistics
    'countryOfOrigin',
    'unit',
    'minSalesMultiples',
    // Commercial
    'defaultPrice',
    // SEO
    'seoTitleEn',
    'seoTitleAr',
    'seoDescriptionEn',
    'seoDescriptionAr',
    'searchKeywords',
    // Internal
    'internalNotes',
    'validationStatus',
    'confidenceScore',
    'pieces',
    'setCount',
    'shape',
    'finish',
    'additionalInfo'
];
/** Numeric fields that should be coerced to numbers or null */ const NUMERIC_FIELDS = new Set([
    'sourceRow',
    'capacity',
    'weight',
    'length',
    'width',
    'height',
    'diameter',
    'defaultPrice',
    'confidenceScore',
    'pieces',
    'setCount'
]);
function coerceFieldValue(field, value) {
    if (value === undefined) return null;
    if (value === null || value === '') return null;
    if (NUMERIC_FIELDS.has(field)) {
        const num = Number(value);
        return isNaN(num) ? null : num;
    }
    return value;
}
async function POST(request) {
    try {
        const body = await request.json();
        // Extract only known product fields
        const rawData = {};
        for (const field of PRODUCT_FIELDS){
            if (field in body) {
                rawData[field] = coerceFieldValue(field, body[field]);
            }
        }
        // Apply auto-derivations
        const data = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$serialize$2d$product$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["applyAutoDerivations"])(rawData);
        // Create product and its original record for change tracking
        const product = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.create({
            data,
            include: {
                images: {
                    orderBy: {
                        displayOrder: 'asc'
                    }
                },
                original: true,
                variantMemberships: true
            }
        });
        // Create ProductOriginal for change tracking (baseline for manually added products)
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
        // Fetch the product again with original included
        const productWithOriginal = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.findUnique({
            where: {
                id: product.id
            },
            include: {
                images: {
                    orderBy: {
                        displayOrder: 'asc'
                    }
                },
                original: true,
                variantMemberships: true
            }
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$serialize$2d$product$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["serializeProduct"])(productWithOriginal), {
            status: 201
        });
    } catch (error) {
        console.error('Error creating product:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to create product'
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__2e53ce57._.js.map