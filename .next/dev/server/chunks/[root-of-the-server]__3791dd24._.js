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
"[project]/src/app/api/products/[id]/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DELETE",
    ()=>DELETE,
    "GET",
    ()=>GET,
    "PUT",
    ()=>PUT
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/db.ts [app-route] (ecmascript)");
;
;
function normalizeJsonField(value) {
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
function serializeJsonField(value) {
    return value;
}
async function GET(request, { params }) {
    try {
        const { id } = await params;
        const product = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.findUnique({
            where: {
                id
            },
            include: {
                images: {
                    orderBy: {
                        displayOrder: 'asc'
                    }
                }
            }
        });
        if (!product) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Product not found'
            }, {
                status: 404
            });
        }
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
            images: product.images.map((img)=>({
                    id: img.id,
                    productId: img.productId,
                    imageUrl: img.imageUrl,
                    displayOrder: img.displayOrder,
                    isPrimary: img.isPrimary,
                    createdAt: img.createdAt.toISOString()
                }))
        });
    } catch (error) {
        console.error('Error fetching product:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to fetch product'
        }, {
            status: 500
        });
    }
}
async function PUT(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const updateData = {};
        const fieldMappings = {
            sr: {
                dbKey: 'sr'
            },
            englishDescription: {
                dbKey: 'englishDescription'
            },
            arabicDescription: {
                dbKey: 'arabicDescription'
            },
            ndNumber: {
                dbKey: 'ndNumber'
            },
            barcode: {
                dbKey: 'barcode'
            },
            colours: {
                dbKey: 'colours',
                normalize: normalizeJsonField
            },
            length: {
                dbKey: 'length'
            },
            width: {
                dbKey: 'width'
            },
            height: {
                dbKey: 'height'
            },
            made: {
                dbKey: 'made'
            },
            materials: {
                dbKey: 'materials',
                normalize: normalizeJsonField
            },
            additionalInfo: {
                dbKey: 'additionalInfo',
                normalize: normalizeJsonField
            },
            price: {
                dbKey: 'price'
            },
            pcs: {
                dbKey: 'pcs'
            }
        };
        for (const [bodyKey, mapping] of Object.entries(fieldMappings)){
            if (bodyKey in body) {
                const rawValue = body[bodyKey];
                const value = mapping.normalize ? mapping.normalize(rawValue) : rawValue ?? null;
                updateData[mapping.dbKey] = value;
            }
        }
        if (Object.keys(updateData).length === 0) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'No fields to update'
            }, {
                status: 400
            });
        }
        const product = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.update({
            where: {
                id
            },
            data: updateData,
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
            images: product.images.map((img)=>({
                    id: img.id,
                    productId: img.productId,
                    imageUrl: img.imageUrl,
                    displayOrder: img.displayOrder,
                    isPrimary: img.isPrimary,
                    createdAt: img.createdAt.toISOString()
                }))
        });
    } catch (error) {
        console.error('Error updating product:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to update product'
        }, {
            status: 500
        });
    }
}
async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        // Check product exists
        const product = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.findUnique({
            where: {
                id
            },
            include: {
                images: true
            }
        });
        if (!product) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Product not found'
            }, {
                status: 404
            });
        }
        // Delete product (cascades to images via FK)
        await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].product.delete({
            where: {
                id
            }
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true
        });
    } catch (error) {
        console.error('Error deleting product:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to delete product'
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__3791dd24._.js.map