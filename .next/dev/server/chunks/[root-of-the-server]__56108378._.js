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
;
;
/**
 * Normalizes array-like fields for storage.
 * Stores as JSON string for compatibility with the frontend which uses JSON.parse().
 */ function normalizeJsonField(value) {
    if (value === null || value === undefined || value === '') return null;
    if (Array.isArray(value)) {
        return value.length > 0 ? JSON.stringify(value) : null;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) return parsed.length > 0 ? JSON.stringify(parsed) : null;
            } catch  {}
        }
        const items = trimmed.split(/[,;|]/).map((v)=>v.trim()).filter(Boolean);
        return items.length > 0 ? JSON.stringify(items) : null;
    }
    return null;
}
/**
 * Parses a JSON array field from DB for frontend consumption.
 * The frontend expects JSON strings that it can JSON.parse().
 */ function serializeJsonField(value) {
    return value; // Already stored as JSON string in Prisma
}
/**
 * Case-insensitive JSON array filter.
 */ function jsonbContainsIgnoreCase(fieldValue, searchTerm) {
    if (!fieldValue || !searchTerm) return false;
    const searchLower = searchTerm.toLowerCase().trim();
    try {
        const arr = JSON.parse(fieldValue);
        if (Array.isArray(arr)) {
            return arr.some((v)=>String(v).toLowerCase().trim().includes(searchLower));
        }
    } catch  {}
    return fieldValue.toLowerCase().includes(searchLower);
}
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
        // ── Suggestions mode ──
        if (mode === 'suggestions') {
            const rows = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.findMany({
                select: {
                    colours: true,
                    materials: true,
                    made: true
                },
                orderBy: {
                    sr: 'asc'
                }
            });
            const allColours = [];
            const allMaterials = [];
            const allMade = [];
            for (const row of rows){
                if (row.colours) {
                    try {
                        const arr = JSON.parse(row.colours);
                        if (Array.isArray(arr)) allColours.push(...arr.filter(Boolean));
                    } catch  {
                        row.colours.split(/[,;|]/).forEach((v)=>{
                            const t = v.trim();
                            if (t) allColours.push(t);
                        });
                    }
                }
                if (row.materials) {
                    try {
                        const arr = JSON.parse(row.materials);
                        if (Array.isArray(arr)) allMaterials.push(...arr.filter(Boolean));
                    } catch  {
                        row.materials.split(/[,;|]/).forEach((v)=>{
                            const t = v.trim();
                            if (t) allMaterials.push(t);
                        });
                    }
                }
                if (row.made) {
                    const t = row.made.trim();
                    if (t) allMade.push(t);
                }
            }
            const uniqueColours = [
                ...new Set(allColours.map((v)=>v.trim()).filter(Boolean))
            ].sort((a, b)=>a.localeCompare(b, undefined, {
                    sensitivity: 'base'
                }));
            const uniqueMaterials = [
                ...new Set(allMaterials.map((v)=>v.trim()).filter(Boolean))
            ].sort((a, b)=>a.localeCompare(b, undefined, {
                    sensitivity: 'base'
                }));
            const uniqueMade = [
                ...new Set(allMade.map((v)=>v.trim()).filter(Boolean))
            ].sort((a, b)=>a.localeCompare(b, undefined, {
                    sensitivity: 'base'
                }));
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                colours: uniqueColours,
                materials: uniqueMaterials,
                made: uniqueMade
            });
        }
        // ── Normal product listing mode ──
        const search = searchParams.get('search') || '';
        const material = searchParams.get('material') || '';
        const colour = searchParams.get('colour') || '';
        const made = searchParams.get('made') || '';
        const priceMin = searchParams.get('priceMin');
        const priceMax = searchParams.get('priceMax');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const sortBy = searchParams.get('sortBy') || 'sr';
        const sortOrder = searchParams.get('sortOrder') || 'asc';
        const ndNumber = searchParams.get('ndNumber') || '';
        const sortColumn = sortBy === 'ndNumber' ? 'ndNumber' : sortBy === 'englishDescription' ? 'englishDescription' : sortBy === 'recentlyUpdated' ? 'updatedAt' : sortBy === 'recentlyAdded' ? 'createdAt' : sortBy === 'price' ? 'price' : 'sr';
        const orderDir = sortOrder === 'desc' ? 'desc' : 'asc';
        // Build where clause
        const where = {};
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
                    englishDescription: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    arabicDescription: {
                        contains: search,
                        mode: 'insensitive'
                    }
                }
            ];
        }
        if (ndNumber) {
            where.ndNumber = {
                contains: ndNumber,
                mode: 'insensitive'
            };
        }
        if (made) {
            where.made = {
                contains: made,
                mode: 'insensitive'
            };
        }
        if (priceMin) {
            where.price = {
                ...where.price,
                gte: parseFloat(priceMin)
            };
        }
        if (priceMax) {
            where.price = {
                ...where.price,
                lte: parseFloat(priceMax)
            };
        }
        // For JSONB-like filters (colour, material), we fetch more and filter in JS
        if (colour || material) {
            const fetchLimit = 2000;
            let allProducts = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.findMany({
                where,
                include: {
                    images: {
                        orderBy: {
                            displayOrder: 'asc'
                        }
                    }
                },
                orderBy: {
                    [sortColumn]: orderDir
                },
                take: fetchLimit
            });
            const mapped = allProducts.map((p)=>({
                    id: p.id,
                    sr: p.sr,
                    englishDescription: p.englishDescription,
                    arabicDescription: p.arabicDescription,
                    ndNumber: p.ndNumber,
                    barcode: p.barcode,
                    colours: serializeJsonField(p.colours),
                    length: p.length,
                    width: p.width,
                    height: p.height,
                    made: p.made,
                    materials: serializeJsonField(p.materials),
                    additionalInfo: serializeJsonField(p.additionalInfo),
                    price: p.price,
                    pcs: p.pcs,
                    createdAt: p.createdAt.toISOString(),
                    updatedAt: p.updatedAt.toISOString(),
                    images: p.images.map((img)=>({
                            id: img.id,
                            productId: img.productId,
                            imageUrl: img.imageUrl,
                            displayOrder: img.displayOrder,
                            isPrimary: img.isPrimary,
                            createdAt: img.createdAt.toISOString()
                        }))
                }));
            if (colour) {
                const filtered = mapped.filter((p)=>jsonbContainsIgnoreCase(p.colours, colour));
                const total = filtered.length;
                const pageStart = (page - 1) * limit;
                const pageEnd = page * limit;
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    products: filtered.slice(pageStart, pageEnd),
                    total,
                    page,
                    limit
                });
            }
            if (material) {
                const filtered = mapped.filter((p)=>jsonbContainsIgnoreCase(p.materials, material));
                const total = filtered.length;
                const pageStart = (page - 1) * limit;
                const pageEnd = page * limit;
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    products: filtered.slice(pageStart, pageEnd),
                    total,
                    page,
                    limit
                });
            }
        }
        // Standard path (no JSONB filters)
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
                    }
                },
                orderBy: {
                    [sortColumn]: orderDir
                },
                skip: (page - 1) * limit,
                take: limit
            })
        ]);
        const mappedProducts = products.map((p)=>({
                id: p.id,
                sr: p.sr,
                englishDescription: p.englishDescription,
                arabicDescription: p.arabicDescription,
                ndNumber: p.ndNumber,
                barcode: p.barcode,
                colours: serializeJsonField(p.colours),
                length: p.length,
                width: p.width,
                height: p.height,
                made: p.made,
                materials: serializeJsonField(p.materials),
                additionalInfo: serializeJsonField(p.additionalInfo),
                price: p.price,
                pcs: p.pcs,
                createdAt: p.createdAt.toISOString(),
                updatedAt: p.updatedAt.toISOString(),
                images: p.images.map((img)=>({
                        id: img.id,
                        productId: img.productId,
                        imageUrl: img.imageUrl,
                        displayOrder: img.displayOrder,
                        isPrimary: img.isPrimary,
                        createdAt: img.createdAt.toISOString()
                    }))
            }));
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
async function POST(request) {
    try {
        const body = await request.json();
        const product = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.create({
            data: {
                sr: body.sr ?? null,
                englishDescription: body.englishDescription || null,
                arabicDescription: body.arabicDescription || null,
                ndNumber: body.ndNumber || null,
                barcode: body.barcode || null,
                colours: normalizeJsonField(body.colours),
                length: body.length ?? null,
                width: body.width ?? null,
                height: body.height ?? null,
                made: body.made || null,
                materials: normalizeJsonField(body.materials),
                additionalInfo: normalizeJsonField(body.additionalInfo),
                price: body.price ?? null,
                pcs: body.pcs ?? null
            },
            include: {
                images: {
                    orderBy: {
                        displayOrder: 'asc'
                    }
                }
            }
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            id: product.id,
            sr: product.sr,
            englishDescription: product.englishDescription,
            arabicDescription: product.arabicDescription,
            ndNumber: product.ndNumber,
            barcode: product.barcode,
            colours: serializeJsonField(product.colours),
            length: product.length,
            width: product.width,
            height: product.height,
            made: product.made,
            materials: serializeJsonField(product.materials),
            additionalInfo: serializeJsonField(product.additionalInfo),
            price: product.price,
            pcs: product.pcs,
            createdAt: product.createdAt.toISOString(),
            updatedAt: product.updatedAt.toISOString(),
            images: []
        }, {
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

//# sourceMappingURL=%5Broot-of-the-server%5D__56108378._.js.map