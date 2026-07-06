(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/store/inventory-store.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "countModifiedFields",
    ()=>countModifiedFields,
    "getFieldChanges",
    ()=>getFieldChanges,
    "hasModifications",
    ()=>hasModifications,
    "isFieldModified",
    ()=>isFieldModified,
    "useInventoryStore",
    ()=>useInventoryStore
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/zustand/esm/react.mjs [app-client] (ecmascript)");
;
// Fields that should be compared for change detection (excluding auto-derived and system fields)
const TRACKED_FIELDS = [
    'productId',
    'sku',
    'ndNumber',
    'barcode',
    'legacyCode',
    'brand',
    'model',
    'department',
    'category',
    'subcategory',
    'productFamily',
    'productType',
    'nameAr',
    'nameEn',
    'shortDescAr',
    'shortDescEn',
    'longDescAr',
    'longDescEn',
    'color',
    'material',
    'capacity',
    'capacityUnit',
    'weight',
    'weightUnit',
    'length',
    'width',
    'height',
    'diameter',
    'dimensionUnit',
    'countryOfOrigin',
    'unit',
    'minSalesMultiples',
    'defaultPrice',
    'seoTitleEn',
    'seoTitleAr',
    'seoDescriptionEn',
    'seoDescriptionAr',
    'searchKeywords',
    'internalNotes',
    'validationStatus',
    'confidenceScore',
    'pieces',
    'setCount',
    'shape',
    'finish',
    'additionalInfo'
];
function getFieldChanges(product) {
    const changes = [];
    const original = product.original;
    if (!original) return changes;
    for (const field of TRACKED_FIELDS){
        const currentValue = product[field];
        const originalValue = field === 'productId' ? original.origProductId : original[field];
        // Normalize values for comparison
        const currentStr = currentValue == null ? '' : String(currentValue).trim();
        const originalStr = originalValue == null ? '' : String(originalValue).trim();
        if (currentStr !== originalStr) {
            changes.push({
                field: String(field),
                original: originalStr || null,
                current: currentStr || null
            });
        }
    }
    return changes;
}
function isFieldModified(product, field) {
    const changes = getFieldChanges(product);
    return changes.some((c)=>c.field === field);
}
function countModifiedFields(product) {
    return getFieldChanges(product).length;
}
function hasModifications(product) {
    return countModifiedFields(product) > 0;
}
const useInventoryStore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zustand$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["create"])((set, get)=>({
        // Auth
        isAuthenticated: false,
        user: null,
        // Navigation
        currentView: 'dashboard',
        previousView: null,
        // Products
        products: [],
        totalProducts: 0,
        currentPage: 1,
        currentProduct: null,
        // Stats
        stats: null,
        // Search & Filters
        searchQuery: '',
        filterMaterial: '',
        filterColour: '',
        filterMade: '',
        filterPriceMin: '',
        filterPriceMax: '',
        // New filter fields
        filterDepartment: '',
        filterCategory: '',
        filterSubcategory: '',
        filterProductFamily: '',
        filterProductType: '',
        filterBrand: '',
        filterColor: '',
        filterCountryOfOrigin: '',
        filterShape: '',
        filterValidationStatus: '',
        filterUnit: '',
        // Sort
        sortBy: 'sourceRow',
        sortOrder: 'asc',
        // ND Number Groups
        groupByNd: false,
        ndGroups: [],
        expandedGroups: new Set(),
        selectedNdNumber: '',
        // Scroll position
        scrollPosition: 0,
        // Loading states
        isLoading: false,
        isSaving: false,
        saveStatus: 'idle',
        // Duplicates
        duplicates: null,
        // Actions
        setAuthenticated: (auth, user)=>set({
                isAuthenticated: auth,
                user: user || null
            }),
        setView: (view)=>set((state)=>({
                    previousView: state.currentView,
                    currentView: view
                })),
        goBack: ()=>set((state)=>({
                    currentView: state.previousView || 'dashboard',
                    previousView: null
                })),
        setProducts: (products, total)=>set({
                products,
                totalProducts: total
            }),
        setCurrentProduct: (product)=>set({
                currentProduct: product
            }),
        setStats: (stats)=>set({
                stats
            }),
        setSearchQuery: (query)=>set({
                searchQuery: query
            }),
        setFilter: (key, value)=>set((state)=>({
                    ...state,
                    [key]: value
                })),
        clearFilters: ()=>set({
                filterMaterial: '',
                filterColour: '',
                filterMade: '',
                filterPriceMin: '',
                filterPriceMax: '',
                filterDepartment: '',
                filterCategory: '',
                filterSubcategory: '',
                filterProductFamily: '',
                filterProductType: '',
                filterBrand: '',
                filterColor: '',
                filterCountryOfOrigin: '',
                filterShape: '',
                filterValidationStatus: '',
                filterUnit: ''
            }),
        setLoading: (loading)=>set({
                isLoading: loading
            }),
        setSaving: (saving)=>set({
                isSaving: saving
            }),
        setSaveStatus: (status)=>set({
                saveStatus: status
            }),
        setDuplicates: (duplicates)=>set({
                duplicates
            }),
        setCurrentPage: (page)=>set({
                currentPage: page
            }),
        setSortBy: (sortBy)=>set({
                sortBy,
                currentPage: 1
            }),
        setSortOrder: (sortOrder)=>set({
                sortOrder,
                currentPage: 1
            }),
        setGroupByNd: (enabled)=>set({
                groupByNd: enabled,
                currentPage: 1
            }),
        setNdGroups: (groups)=>set({
                ndGroups: groups
            }),
        toggleGroup: (ndNumber)=>set((state)=>{
                const next = new Set(state.expandedGroups);
                if (next.has(ndNumber)) {
                    next.delete(ndNumber);
                } else {
                    next.add(ndNumber);
                }
                return {
                    expandedGroups: next
                };
            }),
        setSelectedNdNumber: (ndNumber)=>set({
                selectedNdNumber: ndNumber,
                currentPage: 1
            }),
        setScrollPosition: (position)=>set({
                scrollPosition: position
            })
    }));
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/utils.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/clsx/dist/clsx.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-client] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/lookups.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
const BRAND_OPTIONS = BRAND_LOOKUP.map(_c = (b)=>b.brand);
_c1 = BRAND_OPTIONS;
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
const COLOR_OPTIONS = COLOR_LOOKUP.map(_c2 = (c)=>c.color);
_c3 = COLOR_OPTIONS;
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
const MATERIAL_OPTIONS = MATERIAL_LOOKUP.map(_c4 = (m)=>m.material);
_c5 = MATERIAL_OPTIONS;
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
var _c, _c1, _c2, _c3, _c4, _c5;
__turbopack_context__.k.register(_c, "BRAND_OPTIONS$BRAND_LOOKUP.map");
__turbopack_context__.k.register(_c1, "BRAND_OPTIONS");
__turbopack_context__.k.register(_c2, "COLOR_OPTIONS$COLOR_LOOKUP.map");
__turbopack_context__.k.register(_c3, "COLOR_OPTIONS");
__turbopack_context__.k.register(_c4, "MATERIAL_OPTIONS$MATERIAL_LOOKUP.map");
__turbopack_context__.k.register(_c5, "MATERIAL_OPTIONS");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Home
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$inventory$2f$app$2d$shell$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/inventory/app-shell.tsx [app-client] (ecmascript)");
'use client';
;
;
function Home() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$inventory$2f$app$2d$shell$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AppShell"], {}, void 0, false, {
        fileName: "[project]/src/app/page.tsx",
        lineNumber: 6,
        columnNumber: 10
    }, this);
}
_c = Home;
var _c;
__turbopack_context__.k.register(_c, "Home");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_456c8bca._.js.map