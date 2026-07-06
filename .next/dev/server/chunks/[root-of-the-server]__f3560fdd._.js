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
/**
 * GET /api/products/stats — Optimized Version
 *
 * Performance optimizations:
 * 1. Combined aggregation query instead of 7+ separate count queries
 * 2. Simplified modified products detection using Prisma instead of raw SQL
 * 3. Caching with short TTL to reduce load during imports
 * 4. Reduced database round-trips
 */ // Simple in-memory cache with TTL
const statsCache = {
    data: null,
    timestamp: 0,
    ttl: 5000
};
async function GET() {
    try {
        // Check cache
        const now = Date.now();
        if (statsCache.data && now - statsCache.timestamp < statsCache.ttl) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(statsCache.data);
        }
        // Use a single aggregation query for most stats
        // This is much faster than separate count queries
        const statsAggregation = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].$queryRaw`
      SELECT
        COUNT(*) as total_products,
        COUNT(*) FILTER (WHERE barcode IS NULL) as missing_barcode,
        COUNT(*) FILTER (WHERE length IS NULL OR width IS NULL OR height IS NULL) as missing_dimensions,
        COUNT(*) FILTER (WHERE department IS NULL) as missing_classification,
        COUNT(*) FILTER (WHERE name_en IS NULL) as missing_name_en,
        COUNT(*) FILTER (WHERE default_price IS NULL) as missing_price,
        (SELECT COUNT(DISTINCT product_id) FROM product_images) as with_images,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as added_today
      FROM products
    `;
        const agg = statsAggregation[0];
        // Get products with modifications efficiently
        // Instead of comparing 40+ fields in raw SQL, use a simpler approach
        // Count products that have originals (imported from ERP) and check if modified
        const originalsCount = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].productOriginal.count();
        // For modified products, use a simplified check on key fields
        // This is still accurate for tracking meaningful changes
        const modifiedProductsResult = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].$queryRaw`
      SELECT COUNT(*) as count FROM products p
      INNER JOIN product_originals po ON p.id = po.product_id
      WHERE
        (p.product_id IS DISTINCT FROM po.orig_product_id) OR
        (p.nd_number IS DISTINCT FROM po.nd_number) OR
        (p.barcode IS DISTINCT FROM po.barcode) OR
        (p.brand IS DISTINCT FROM po.brand) OR
        (p.name_en IS DISTINCT FROM po.name_en) OR
        (p.name_ar IS DISTINCT FROM po.name_ar) OR
        (p.default_price IS DISTINCT FROM po.default_price) OR
        (p.department IS DISTINCT FROM po.department) OR
        (p.category IS DISTINCT FROM po.category) OR
        (p.color IS DISTINCT FROM po.color) OR
        (p.material IS DISTINCT FROM po.material)
    `;
        // Total Variant Groups
        const totalVariantGroups = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].variantGroup.count();
        // Calculate products missing images
        const totalProducts = Number(agg.total_products);
        const productsWithImages = Number(agg.with_images);
        const productsMissingImages = totalProducts - productsWithImages;
        const result = {
            totalProducts,
            productsAddedToday: Number(agg.added_today),
            productsMissingImages,
            productsMissingBarcode: Number(agg.missing_barcode),
            productsMissingDimensions: Number(agg.missing_dimensions),
            productsMissingClassification: Number(agg.missing_classification),
            productsMissingNameEn: Number(agg.missing_name_en),
            productsMissingPrice: Number(agg.missing_price),
            productsWithModifications: Number(modifiedProductsResult[0]?.count ?? 0),
            totalVariantGroups
        };
        // Update cache
        statsCache.data = result;
        statsCache.timestamp = now;
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(result);
    } catch (error) {
        console.error('Error fetching stats:', error);
        // Fallback: use individual queries if aggregation fails
        try {
            const totalProducts = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.count();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const productsAddedToday = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.count({
                where: {
                    createdAt: {
                        gte: today
                    }
                }
            });
            const productsWithImages = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.count({
                where: {
                    images: {
                        some: {}
                    }
                }
            });
            const productsMissingBarcode = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.count({
                where: {
                    barcode: null
                }
            });
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
            const productsMissingClassification = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.count({
                where: {
                    department: null
                }
            });
            const productsMissingNameEn = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.count({
                where: {
                    nameEn: null
                }
            });
            const productsMissingPrice = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.count({
                where: {
                    defaultPrice: null
                }
            });
            const totalVariantGroups = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].variantGroup.count();
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                totalProducts,
                productsAddedToday,
                productsMissingImages: totalProducts - productsWithImages,
                productsMissingBarcode,
                productsMissingDimensions: totalProducts - productsWithAllDims,
                productsMissingClassification,
                productsMissingNameEn,
                productsMissingPrice,
                productsWithModifications: 0,
                totalVariantGroups
            });
        } catch (fallbackError) {
            console.error('Fallback stats query failed:', fallbackError);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Failed to fetch stats'
            }, {
                status: 500
            });
        }
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__f3560fdd._.js.map