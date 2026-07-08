/**
 * Al-Nassim Master Catalog — Shared Product Serialization
 *
 * Maps a Prisma Product (with images) to the full 52-column JSON response
 * format used by all API routes. This ensures consistent field ordering
 * and type coercion across GET /products, GET /products/[id], POST, PUT.
 */

import {
  getBrandDerivatives,
  getColorAr,
  getMaterialAr,
  getSectionCodeForDepartment,
  deriveShortDescAr,
  deriveShortDescEn,
  deriveLongDescEn,
  deriveSeoTitleAr,
  deriveSeoDescEn,
  deriveSeoDescAr,
  deriveSearchKeywords,
} from '@/lib/lookups';

interface ProductImageRow {
  id: string;
  productId: string;
  imageUrl: string;
  displayOrder: number;
  isPrimary: boolean;
  createdAt: Date;
  // Google Drive storage fields (null for legacy base64 images)
  driveFileId: string | null;
  thumbnailUrl: string | null;
  filename: string | null;
  mimeType: string | null;
  fileSize: number | null;
}

interface ProductOriginalRow {
  id: string;
  productId: string;
  sourceRow: number | null;
  origProductId: string | null;
  sku: string | null;
  ndNumber: string | null;
  barcode: string | null;
  legacyCode: string | null;
  brand: string | null;
  brandAr: string | null;
  brandCode: string | null;
  model: string | null;
  department: string | null;
  category: string | null;
  subcategory: string | null;
  sectionCode: string | null;
  productFamily: string | null;
  productType: string | null;
  nameAr: string | null;
  nameEn: string | null;
  shortDescAr: string | null;
  shortDescEn: string | null;
  longDescAr: string | null;
  longDescEn: string | null;
  color: string | null;
  colorAr: string | null;
  material: string | null;
  materialAr: string | null;
  capacity: number | null;
  capacityUnit: string | null;
  weight: number | null;
  weightUnit: string | null;
  length: number | null;
  width: number | null;
  height: number | null;
  diameter: number | null;
  dimensionUnit: string | null;
  countryOfOrigin: string | null;
  unit: string | null;
  minSalesMultiples: string | null;
  defaultPrice: number | null;
  seoTitleEn: string | null;
  seoTitleAr: string | null;
  seoDescriptionEn: string | null;
  seoDescriptionAr: string | null;
  searchKeywords: string | null;
  internalNotes: string | null;
  validationStatus: string | null;
  confidenceScore: number | null;
  pieces: number | null;
  setCount: number | null;
  shape: string | null;
  finish: string | null;
  additionalInfo: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface VariantMemberRow {
  id: string;
  variantGroupId: string;
  productId: string;
  color: string | null;
  colorAr: string | null;
  variantImage: string | null;
  variantNotes: string | null;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
  variantGroup?: {
    id: string;
    primaryProductId: string;
  } | null;
}

interface ProductRow {
  id: string;
  // Product Identity
  sourceRow: number | null;
  productId: string | null;
  sku: string | null;
  ndNumber: string | null;
  barcode: string | null;
  legacyCode: string | null;
  brand: string | null;
  brandAr: string | null;
  brandCode: string | null;
  model: string | null;
  // Classification
  department: string | null;
  category: string | null;
  subcategory: string | null;
  sectionCode: string | null;
  productFamily: string | null;
  productType: string | null;
  // Product Information
  nameAr: string | null;
  nameEn: string | null;
  shortDescAr: string | null;
  shortDescEn: string | null;
  longDescAr: string | null;
  longDescEn: string | null;
  // Attributes
  color: string | null;
  colorAr: string | null;
  material: string | null;
  materialAr: string | null;
  capacity: number | null;
  capacityUnit: string | null;
  weight: number | null;
  weightUnit: string | null;
  length: number | null;
  width: number | null;
  height: number | null;
  diameter: number | null;
  dimensionUnit: string | null;
  // Logistics
  countryOfOrigin: string | null;
  unit: string | null;
  minSalesMultiples: string | null;
  // Commercial
  defaultPrice: number | null;
  // SEO
  seoTitleEn: string | null;
  seoTitleAr: string | null;
  seoDescriptionEn: string | null;
  seoDescriptionAr: string | null;
  searchKeywords: string | null;
  // Internal
  internalNotes: string | null;
  validationStatus: string | null;
  confidenceScore: number | null;
  pieces: number | null;
  setCount: number | null;
  shape: string | null;
  finish: string | null;
  additionalInfo: string | null;
  // System
  createdAt: Date;
  updatedAt: Date;
  images: ProductImageRow[];
  // Change Tracking
  original: ProductOriginalRow | null;
  // Variants
  variantMemberships: VariantMemberRow[];
}

export function serializeProduct(p: ProductRow) {
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
    images: (p.images ?? []).map((img) => ({
      id: img.id,
      productId: img.productId,
      imageUrl: img.imageUrl,
      displayOrder: img.displayOrder,
      isPrimary: img.isPrimary,
      createdAt: img.createdAt.toISOString(),
      driveFileId: img.driveFileId,
      thumbnailUrl: img.thumbnailUrl,
      filename: img.filename,
      mimeType: img.mimeType,
      fileSize: img.fileSize,
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
      additionalInfo: p.original.additionalInfo,
    } : null,
    // Variants
    variantMemberships: (p.variantMemberships ?? []).map((vm) => ({
      id: vm.id,
      variantGroupId: vm.variantGroupId,
      productId: vm.productId,
      color: vm.color,
      colorAr: vm.colorAr,
      variantImage: vm.variantImage,
      variantNotes: vm.variantNotes,
      displayOrder: vm.displayOrder,
      createdAt: vm.createdAt.toISOString(),
      updatedAt: vm.updatedAt.toISOString(),
      variantGroup: vm.variantGroup ? {
        id: vm.variantGroup.id,
        primaryProductId: vm.variantGroup.primaryProductId,
      } : null,
    })),
  };
}

/**
 * Auto-derive fields based on the Al-Nassim Master Catalog rules.
 * Used by POST and PUT routes, and during import.
 *
 * Rules:
 *  - brand → brandAr, brandCode
 *  - color → colorAr
 *  - material → materialAr
 *  - department → sectionCode
 *  - Any dimension set but no dimensionUnit → default 'cm'
 *  - shortDescAr empty → default to nameAr
 *  - shortDescEn empty → default to nameEn
 *  - longDescEn empty → derive from brand + nameEn
 *  - seoTitleAr empty → default to nameAr
 *  - seoDescriptionEn empty → derive from brand + productType
 *  - seoDescriptionAr empty → derive from brandAr + productType
 *  - searchKeywords empty → derive from brand + productFamily + productType
 */
export function applyAutoDerivations(data: Record<string, any>): Record<string, any> {
  const result = { ...data };

  // Brand → brandAr, brandCode
  if (result.brand) {
    const { brandAr, brandCode } = getBrandDerivatives(result.brand);
    if (!result.brandAr) result.brandAr = brandAr;
    if (!result.brandCode) result.brandCode = brandCode;
  }

  // Color → colorAr
  if (result.color && !result.colorAr) {
    result.colorAr = getColorAr(result.color);
  }

  // Material → materialAr
  if (result.material && !result.materialAr) {
    result.materialAr = getMaterialAr(result.material);
  }

  // Department → sectionCode
  if (result.department && !result.sectionCode) {
    result.sectionCode = getSectionCodeForDepartment(result.department);
  }

  // Dimension Unit: default to 'cm' if any dimension is set but no unit
  const hasAnyDimension =
    result.length != null || result.width != null ||
    result.height != null || result.diameter != null;
  if (hasAnyDimension && !result.dimensionUnit) {
    result.dimensionUnit = 'cm';
  }

  // SEO auto-derivation rules
  if (!result.shortDescAr && result.nameAr) {
    result.shortDescAr = deriveShortDescAr(result.nameAr);
  }
  if (!result.shortDescEn && result.nameEn) {
    result.shortDescEn = deriveShortDescEn(result.nameEn);
  }
  if (!result.longDescEn && (result.brand || result.nameEn)) {
    result.longDescEn = deriveLongDescEn(result.brand, result.nameEn);
  }
  if (!result.seoTitleAr && result.nameAr) {
    result.seoTitleAr = deriveSeoTitleAr(result.nameAr);
  }
  if (!result.seoDescriptionEn && (result.brand || result.productType)) {
    result.seoDescriptionEn = deriveSeoDescEn(result.brand, result.productType);
  }
  if (!result.seoDescriptionAr && (result.brandAr || result.productType)) {
    result.seoDescriptionAr = deriveSeoDescAr(result.brandAr, result.productType);
  }
  if (!result.searchKeywords && (result.brand || result.productFamily || result.productType)) {
    result.searchKeywords = deriveSearchKeywords(result.brand, result.productFamily, result.productType);
  }

  return result;
}
