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
"[project]/src/app/api/products/stats/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
;
;
async function GET() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Total Products
        const totalProducts = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.count();
        // Added Today
        const productsAddedToday = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.count({
            where: {
                createdAt: {
                    gte: today
                }
            }
        });
        // Missing Images: products with no images
        const productsWithImages = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.count({
            where: {
                images: {
                    some: {}
                }
            }
        });
        const productsMissingImages = totalProducts - productsWithImages;
        // Missing Barcode
        const productsMissingBarcode = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.count({
            where: {
                barcode: null
            }
        });
        // Missing Dimensions (any of length, width, height is null)
        const productsWithAllDims = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.count({
            where: {
                length: {
                    not: null
                },
                width: {
                    not: null
                },
                height: {
                    not: null
                }
            }
        });
        const productsMissingDimensions = totalProducts - productsWithAllDims;
        // Missing Classification (department is null)
        const productsMissingClassification = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.count({
            where: {
                department: null
            }
        });
        // Missing Name EN
        const productsMissingNameEn = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.count({
            where: {
                nameEn: null
            }
        });
        // Missing Price (defaultPrice is null)
        const productsMissingPrice = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.count({
            where: {
                defaultPrice: null
            }
        });
        // Products with Modifications (products that have an original record AND differ from it)
        // This counts products that were imported from ERP and have been manually edited
        const productsWithOriginals = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].productOriginal.count();
        // For each product with an original, check if any tracked field differs
        // We'll use raw SQL for efficiency since we need to compare many fields
        const modifiedProductsCount = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].$queryRaw`
      SELECT COUNT(*) as count FROM products p
      INNER JOIN product_originals po ON p.id = po.productId
      WHERE
        (p.product_id IS DISTINCT FROM po.orig_product_id) OR
        (p.sku IS DISTINCT FROM po.sku) OR
        (p.nd_number IS DISTINCT FROM po.nd_number) OR
        (p.barcode IS DISTINCT FROM po.barcode) OR
        (p.legacy_code IS DISTINCT FROM po.legacy_code) OR
        (p.brand IS DISTINCT FROM po.brand) OR
        (p.model IS DISTINCT FROM po.model) OR
        (p.department IS DISTINCT FROM po.department) OR
        (p.category IS DISTINCT FROM po.category) OR
        (p.subcategory IS DISTINCT FROM po.subcategory) OR
        (p.product_family IS DISTINCT FROM po.product_family) OR
        (p.product_type IS DISTINCT FROM po.product_type) OR
        (p.name_ar IS DISTINCT FROM po.name_ar) OR
        (p.name_en IS DISTINCT FROM po.name_en) OR
        (p.short_desc_ar IS DISTINCT FROM po.short_desc_ar) OR
        (p.short_desc_en IS DISTINCT FROM po.short_desc_en) OR
        (p.long_desc_ar IS DISTINCT FROM po.long_desc_ar) OR
        (p.long_desc_en IS DISTINCT FROM po.long_desc_en) OR
        (p.color IS DISTINCT FROM po.color) OR
        (p.material IS DISTINCT FROM po.material) OR
        (p.capacity IS DISTINCT FROM po.capacity) OR
        (p.capacity_unit IS DISTINCT FROM po.capacity_unit) OR
        (p.weight IS DISTINCT FROM po.weight) OR
        (p.weight_unit IS DISTINCT FROM po.weight_unit) OR
        (p.length IS DISTINCT FROM po.length) OR
        (p.width IS DISTINCT FROM po.width) OR
        (p.height IS DISTINCT FROM po.height) OR
        (p.diameter IS DISTINCT FROM po.diameter) OR
        (p.dimension_unit IS DISTINCT FROM po.dimension_unit) OR
        (p.country_of_origin IS DISTINCT FROM po.country_of_origin) OR
        (p.unit IS DISTINCT FROM po.unit) OR
        (p.default_price IS DISTINCT FROM po.default_price) OR
        (p.name_en IS DISTINCT FROM po.name_en) OR
        (p.seo_title_en IS DISTINCT FROM po.seo_title_en) OR
        (p.seo_title_ar IS DISTINCT FROM po.seo_title_ar) OR
        (p.seo_description_en IS DISTINCT FROM po.seo_description_en) OR
        (p.seo_description_ar IS DISTINCT FROM po.seo_description_ar) OR
        (p.search_keywords IS DISTINCT FROM po.search_keywords) OR
        (p.internal_notes IS DISTINCT FROM po.internal_notes) OR
        (p.validation_status IS DISTINCT FROM po.validation_status) OR
        (p.pieces IS DISTINCT FROM po.pieces) OR
        (p.set_count IS DISTINCT FROM po.set_count) OR
        (p.shape IS DISTINCT FROM po.shape) OR
        (p.finish IS DISTINCT FROM po.finish) OR
        (p.additional_info IS DISTINCT FROM po.additional_info)
    `;
        const productsWithModifications = Number(modifiedProductsCount[0]?.count ?? 0);
        // Total Variant Groups
        const totalVariantGroups = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].variantGroup.count();
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            totalProducts,
            productsAddedToday,
            productsMissingImages,
            productsMissingBarcode,
            productsMissingDimensions,
            productsMissingClassification,
            productsMissingNameEn,
            productsMissingPrice,
            productsWithModifications,
            totalVariantGroups
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to fetch stats'
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__f3560fdd._.js.map