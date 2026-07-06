'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { SearchableSingleSelect } from './searchable-single-select';
import { ImageGallery } from './image-gallery';
import { BarcodeScanner } from './barcode-scanner';
import { useInventoryStore, Product, DuplicateCheck } from '@/store/inventory-store';
import {
  ArrowLeft,
  Save,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Lock,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BRAND_OPTIONS,
  getBrandDerivatives,
  DEPARTMENTS,
  getCategoriesForDepartment,
  getSubcategoriesForCategory,
  categoryHasSubcategories,
  PRODUCT_FAMILIES,
  getFamiliesForSubcategory,
  getTypesForFamily,
  ALL_PRODUCT_TYPES,
  COLOR_OPTIONS,
  getColorAr,
  MATERIAL_OPTIONS,
  getMaterialAr,
  UNIT_OPTIONS,
  CAPACITY_UNIT_OPTIONS,
  WEIGHT_UNIT_OPTIONS,
  DIMENSION_UNIT_OPTIONS,
  SHAPE_OPTIONS,
  FINISH_OPTIONS,
  ADDITIONAL_INFO_OPTIONS,
  VALIDATION_STATUS_OPTIONS,
  MIN_SALES_MULTIPLES_OPTIONS,
  COUNTRY_OPTIONS,
  getSectionCodeForDepartment,
  deriveShortDescAr,
  deriveShortDescEn,
  deriveLongDescEn,
  deriveSeoTitleAr,
  deriveSeoDescEn,
  deriveSeoDescAr,
  deriveSearchKeywords,
} from '@/lib/lookups';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface ProductFormProps {
  mode: 'add' | 'edit';
}

/** All form fields stored as strings for controlled-input handling */
interface FormData {
  sourceRow: string;
  productId: string;
  sku: string;
  ndNumber: string;
  barcode: string;
  legacyCode: string;
  brand: string;
  brandAr: string;
  brandCode: string;
  model: string;
  department: string;
  category: string;
  subcategory: string;
  sectionCode: string;
  productFamily: string;
  productType: string;
  nameAr: string;
  nameEn: string;
  shortDescAr: string;
  shortDescEn: string;
  longDescAr: string;
  longDescEn: string;
  color: string;
  colorAr: string;
  material: string;
  materialAr: string;
  capacity: string;
  capacityUnit: string;
  weight: string;
  weightUnit: string;
  length: string;
  width: string;
  height: string;
  diameter: string;
  dimensionUnit: string;
  countryOfOrigin: string;
  unit: string;
  minSalesMultiples: string;
  defaultPrice: string;
  seoTitleEn: string;
  seoTitleAr: string;
  seoDescriptionEn: string;
  seoDescriptionAr: string;
  searchKeywords: string;
  internalNotes: string;
  validationStatus: string;
  confidenceScore: string;
  pieces: string;
  setCount: string;
  shape: string;
  finish: string;
  additionalInfo: string;
}

const EMPTY_FORM: FormData = {
  sourceRow: '',
  productId: '',
  sku: '',
  ndNumber: '',
  barcode: '',
  legacyCode: '',
  brand: '',
  brandAr: '',
  brandCode: '',
  model: '',
  department: '',
  category: '',
  subcategory: '',
  sectionCode: '',
  productFamily: '',
  productType: '',
  nameAr: '',
  nameEn: '',
  shortDescAr: '',
  shortDescEn: '',
  longDescAr: '',
  longDescEn: '',
  color: '',
  colorAr: '',
  material: '',
  materialAr: '',
  capacity: '',
  capacityUnit: '',
  weight: '',
  weightUnit: '',
  length: '',
  width: '',
  height: '',
  diameter: '',
  dimensionUnit: '',
  countryOfOrigin: '',
  unit: '',
  minSalesMultiples: '',
  defaultPrice: '',
  seoTitleEn: '',
  seoTitleAr: '',
  seoDescriptionEn: '',
  seoDescriptionAr: '',
  searchKeywords: '',
  internalNotes: '',
  validationStatus: '',
  confidenceScore: '',
  pieces: '',
  setCount: '',
  shape: '',
  finish: '',
  additionalInfo: '',
};

// Section names matching COLUMN_GROUPS order
const SECTION_ORDER = [
  'Product Identity',
  'Classification',
  'Product Information',
  'Attributes',
  'Logistics',
  'Commercial',
  'SEO',
  'Internal',
] as const;

type SectionName = (typeof SECTION_ORDER)[number];

// ─────────────────────────────────────────────────────────────
// Helper: Label with optional mandatory asterisk
// ─────────────────────────────────────────────────────────────

function FieldLabel({
  htmlFor,
  mandatory = false,
  children,
}: {
  htmlFor?: string;
  mandatory?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground flex items-center gap-1">
      {children}
      {mandatory && <span className="text-red-500 text-base leading-none">*</span>}
    </Label>
  );
}

// ─────────────────────────────────────────────────────────────
// Helper: Auto-derived badge
// ─────────────────────────────────────────────────────────────

function AutoBadge() {
  return (
    <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0 h-5 gap-0.5 font-normal text-muted-foreground bg-muted">
      <Sparkles className="h-2.5 w-2.5" />
      auto
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────
// Helper: ReadOnly input with lock icon
// ─────────────────────────────────────────────────────────────

function ReadOnlyInput({
  value,
  placeholder,
  dir,
  className = '',
}: {
  value: string;
  placeholder?: string;
  dir?: string;
  className?: string;
}) {
  return (
    <div className="relative">
      <Input
        value={value}
        readOnly
        placeholder={placeholder}
        dir={dir}
        className={`h-11 bg-muted/60 border-muted cursor-default pr-9 ${className}`}
      />
      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Helper: Collapsible Section Card
// ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  fieldCount,
  open,
  onToggle,
  children,
}: {
  title: string;
  fieldCount: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader
        className="pb-0 cursor-pointer select-none hover:bg-accent/30 transition-colors rounded-t-lg"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            {open ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <CardTitle className="text-base">{title}</CardTitle>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-normal text-muted-foreground">
              {fieldCount} fields
            </Badge>
          </div>
        </div>
      </CardHeader>
      {open && <CardContent className="pt-4 space-y-4">{children}</CardContent>}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export function ProductForm({ mode }: ProductFormProps) {
  const {
    currentProduct,
    setView,
    goBack,
    isSaving,
    setSaving,
    duplicates,
    setDuplicates,
    setCurrentProduct,
  } = useInventoryStore();

  // ── Form data ──────────────────────────────────────────────
  const [formData, setFormData] = useState<FormData>({ ...EMPTY_FORM });

  // ── Track whether form has been initialized (to prevent reset on image upload) ──
  const formInitializedRef = useRef(false);

  // ── Section collapse state ─────────────────────────────────
  const [expandedSections, setExpandedSections] = useState<Set<SectionName>>(
    new Set(['Product Identity', 'Classification'])
  );

  const toggleSection = useCallback((section: SectionName) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }, []);

  // ── Dinar / Fils split for Price (KWD, 3 decimal places) ──
  const [priceDinar, setPriceDinar] = useState('');
  const [priceFils, setPriceFils] = useState('');

  // ── Validation errors ──────────────────────────────────────
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // ── Duplicate check ────────────────────────────────────────
  const checkDuplicates = useCallback(
    async (fields: { ndNumber?: string; barcode?: string; productId?: string; sku?: string }) => {
      const { ndNumber, barcode, productId, sku } = fields;
      if (!ndNumber && !barcode && !productId && !sku) {
        setDuplicates(null);
        return;
      }
      try {
        const params = new URLSearchParams();
        if (ndNumber) params.set('ndNumber', ndNumber);
        if (barcode) params.set('barcode', barcode);
        if (productId) params.set('productId', productId);
        if (sku) params.set('sku', sku);
        if (mode === 'edit' && currentProduct) params.set('excludeId', currentProduct.id);

        const res = await fetch(`/api/products/check-duplicate?${params}`);
        if (res.ok) {
          const data = await res.json();
          setDuplicates(data.duplicates);
        }
      } catch (error) {
        console.error('Error checking duplicates:', error);
      }
    },
    [mode, currentProduct, setDuplicates]
  );

  // ── Generic field updater with auto-derivations ────────────
  const updateField = useCallback(
    (field: keyof FormData, value: string) => {
      setFormData((prev) => {
        const next = { ...prev, [field]: value };

        // ── Brand → auto-fill Brand AR, Brand Code ──
        if (field === 'brand') {
          const deriv = getBrandDerivatives(value || null);
          next.brandAr = deriv.brandAr;
          next.brandCode = deriv.brandCode;
          // Re-derive SEO & long desc
          next.longDescEn = deriveLongDescEn(value || null, prev.nameEn || null);
          next.seoDescriptionEn = deriveSeoDescEn(value || null, prev.productType || null);
          next.seoDescriptionAr = deriveSeoDescAr(deriv.brandAr || null, prev.productType || null);
          next.searchKeywords = deriveSearchKeywords(value || null, prev.productFamily || null, prev.productType || null);
        }

        // ── Color → auto-fill Color AR ──
        if (field === 'color') {
          next.colorAr = getColorAr(value || null);
        }

        // ── Material → auto-fill Material AR ──
        if (field === 'material') {
          next.materialAr = getMaterialAr(value || null);
        }

        // ── Department → auto-fill Section Code + reset Category chain ──
        if (field === 'department') {
          next.sectionCode = getSectionCodeForDepartment(value || null);
          next.category = '';
          next.subcategory = '';
          next.productFamily = '';
          next.productType = '';
        }

        // ── Category → reset Subcategory chain ──
        if (field === 'category') {
          next.subcategory = '';
          next.productFamily = '';
          next.productType = '';
        }

        // ── Subcategory → reset Product Family chain ──
        if (field === 'subcategory') {
          next.productFamily = '';
          next.productType = '';
        }

        // ── Product Family → reset Product Type ──
        if (field === 'productFamily') {
          next.productType = '';
          next.searchKeywords = deriveSearchKeywords(prev.brand || null, value || null, prev.productType || null);
        }

        // ── Product Type → re-derive SEO ──
        if (field === 'productType') {
          next.seoDescriptionEn = deriveSeoDescEn(prev.brand || null, value || null);
          const brandAr = prev.brandAr || getBrandDerivatives(prev.brand || null).brandAr;
          next.seoDescriptionAr = deriveSeoDescAr(brandAr || null, value || null);
          next.searchKeywords = deriveSearchKeywords(prev.brand || null, prev.productFamily || null, value || null);
        }

        // ── Name AR → auto-derive Short Desc AR, SEO Title AR ──
        if (field === 'nameAr') {
          next.shortDescAr = deriveShortDescAr(value || null);
          next.seoTitleAr = deriveSeoTitleAr(value || null);
        }

        // ── Name EN → auto-derive Short Desc EN, Long Desc EN ──
        if (field === 'nameEn') {
          next.shortDescEn = deriveShortDescEn(value || null);
          next.longDescEn = deriveLongDescEn(prev.brand || null, value || null);
        }

        // ── Dimensions → default Dimension Unit to 'cm' ──
        if (['length', 'width', 'height', 'diameter'].includes(field)) {
          if (value && !next.dimensionUnit) {
            next.dimensionUnit = 'cm';
          }
        }

        return next;
      });

      // ── Trigger duplicate check for key fields ──
      if (['ndNumber', 'barcode', 'productId', 'sku'].includes(field)) {
        // Use a timeout so state updates first
        setTimeout(() => {
          setFormData((current) => {
            checkDuplicates({
              ndNumber: field === 'ndNumber' ? value : current.ndNumber,
              barcode: field === 'barcode' ? value : current.barcode,
              productId: field === 'productId' ? value : current.productId,
              sku: field === 'sku' ? value : current.sku,
            });
            return current; // don't mutate
          });
        }, 0);
      }

      // Clear validation error for this field
      setValidationErrors((prev) => {
        if (prev[field]) {
          const next = { ...prev };
          delete next[field];
          return next;
        }
        return prev;
      });
    },
    [checkDuplicates]
  );

  // ── Helper: parse price string into Dinar + Fils ──
  const parsePriceToDinarFils = (priceStr: string): { dinar: string; fils: string } => {
    if (!priceStr) return { dinar: '', fils: '' };
    const num = parseFloat(priceStr);
    if (isNaN(num)) return { dinar: '', fils: '' };
    const dinar = Math.floor(num);
    const fils = Math.round((num - dinar) * 1000);
    return { dinar: String(dinar), fils: String(fils).padStart(3, '0') };
  };

  // Compute the combined price string from Dinar + Fils
  const combinedPrice = useMemo(() => {
    const dinar = priceDinar.trim() || '0';
    const filsRaw = priceFils.trim();
    const fils = filsRaw ? filsRaw.padStart(3, '0') : '000';
    const dinarNum = parseInt(dinar) || 0;
    const filsNum = parseInt(fils) || 0;
    if (dinarNum === 0 && filsNum === 0) return '';
    return `${dinarNum}.${fils}`;
  }, [priceDinar, priceFils]);

  const handlePriceDinarChange = useCallback(
    (value: string) => {
      const clean = value.replace(/[^0-9]/g, '');
      setPriceDinar(clean);
      const dinar = clean || '0';
      const filsRaw = priceFils.trim();
      const fils = filsRaw ? filsRaw.padStart(3, '0') : '000';
      const dinarNum = parseInt(dinar) || 0;
      const filsNum = parseInt(fils) || 0;
      if (dinarNum === 0 && filsNum === 0) {
        updateField('defaultPrice', '');
      } else {
        updateField('defaultPrice', `${dinarNum}.${fils}`);
      }
    },
    [priceFils, updateField]
  );

  const handlePriceFilsChange = useCallback(
    (value: string) => {
      let clean = value.replace(/[^0-9]/g, '');
      if (clean.length > 3) clean = clean.slice(0, 3);
      if (clean && parseInt(clean) > 999) clean = '999';
      setPriceFils(clean);
      const dinar = priceDinar.trim() || '0';
      const fils = clean ? clean.padStart(3, '0') : '000';
      const dinarNum = parseInt(dinar) || 0;
      const filsNum = parseInt(fils) || 0;
      if (dinarNum === 0 && filsNum === 0) {
        updateField('defaultPrice', '');
      } else {
        updateField('defaultPrice', `${dinarNum}.${fils}`);
      }
    },
    [priceDinar, updateField]
  );

  // ── Load form data from currentProduct in edit mode (ONE-TIME initialization) ──
  // This useEffect should only run ONCE when entering edit mode, not on every currentProduct change
  // Image uploads update currentProduct.images but should NOT reset the form
  useEffect(() => {
    if (mode === 'edit' && currentProduct && !formInitializedRef.current) {
      formInitializedRef.current = true;
      const p = currentProduct;
      setFormData({
        sourceRow: p.sourceRow?.toString() || '',
        productId: p.productId || '',
        sku: p.sku || '',
        ndNumber: p.ndNumber || '',
        barcode: p.barcode || '',
        legacyCode: p.legacyCode || '',
        brand: p.brand || '',
        brandAr: p.brandAr || '',
        brandCode: p.brandCode || '',
        model: p.model || '',
        department: p.department || '',
        category: p.category || '',
        subcategory: p.subcategory || '',
        sectionCode: p.sectionCode || '',
        productFamily: p.productFamily || '',
        productType: p.productType || '',
        nameAr: p.nameAr || '',
        nameEn: p.nameEn || '',
        shortDescAr: p.shortDescAr || '',
        shortDescEn: p.shortDescEn || '',
        longDescAr: p.longDescAr || '',
        longDescEn: p.longDescEn || '',
        color: p.color || '',
        colorAr: p.colorAr || '',
        material: p.material || '',
        materialAr: p.materialAr || '',
        capacity: p.capacity?.toString() || '',
        capacityUnit: p.capacityUnit || '',
        weight: p.weight?.toString() || '',
        weightUnit: p.weightUnit || '',
        length: p.length?.toString() || '',
        width: p.width?.toString() || '',
        height: p.height?.toString() || '',
        diameter: p.diameter?.toString() || '',
        dimensionUnit: p.dimensionUnit || '',
        countryOfOrigin: p.countryOfOrigin || '',
        unit: p.unit || '',
        minSalesMultiples: p.minSalesMultiples || '',
        defaultPrice: p.defaultPrice?.toString() || '',
        seoTitleEn: p.seoTitleEn || '',
        seoTitleAr: p.seoTitleAr || '',
        seoDescriptionEn: p.seoDescriptionEn || '',
        seoDescriptionAr: p.seoDescriptionAr || '',
        searchKeywords: p.searchKeywords || '',
        internalNotes: p.internalNotes || '',
        validationStatus: p.validationStatus || '',
        confidenceScore: p.confidenceScore?.toString() || '',
        pieces: p.pieces?.toString() || '',
        setCount: p.setCount?.toString() || '',
        shape: p.shape || '',
        finish: p.finish || '',
        additionalInfo: p.additionalInfo || '',
      });

      const { dinar, fils } = parsePriceToDinarFils(p.defaultPrice?.toString() || '');
      setPriceDinar(dinar);
      setPriceFils(fils);
    }

    // Reset initialization flag when switching to add mode or different product
    if (mode === 'add') {
      formInitializedRef.current = false;
    }
  }, [mode, currentProduct?.id]); // Only watch mode and product ID, not the whole currentProduct object

  // ── Dependent dropdown option lists ────────────────────────
  const categoryOptions = useMemo(
    () => getCategoriesForDepartment(formData.department || null),
    [formData.department]
  );

  const subcategoryOptions = useMemo(
    () => getSubcategoriesForCategory(formData.department || null, formData.category || null),
    [formData.department, formData.category]
  );

  const hasSubcategories = useMemo(
    () => categoryHasSubcategories(formData.department || null, formData.category || null),
    [formData.department, formData.category]
  );

  const productFamilyOptions = useMemo(
    () => getFamiliesForSubcategory(formData.subcategory || null),
    [formData.subcategory]
  );

  const productTypeOptions = useMemo(
    () => getTypesForFamily(formData.productFamily || null),
    [formData.productFamily]
  );

  // ── Validation ─────────────────────────────────────────────
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    // Mandatory fields
    if (!formData.productId.trim()) errors.productId = 'Product ID is required';
    if (!formData.sku.trim()) errors.sku = 'SKU is required';
    if (!formData.barcode.trim()) errors.barcode = 'Barcode is required';
    if (!formData.brand) errors.brand = 'Brand is required';
    if (!formData.department) errors.department = 'Department is required';
    if (!formData.category) errors.category = 'Category is required';
    if (!formData.productFamily) errors.productFamily = 'Product Family is required';
    if (!formData.productType) errors.productType = 'Product Type is required';
    if (!formData.nameAr.trim()) errors.nameAr = 'Name AR is required';
    if (!formData.nameEn.trim()) errors.nameEn = 'Name EN is required';
    if (!formData.unit) errors.unit = 'Unit is required';
    if (!formData.minSalesMultiples) errors.minSalesMultiples = 'Min Sales Multiples is required';
    if (!formData.validationStatus) errors.validationStatus = 'Validation Status is required';

    // Format validations
    if (formData.ndNumber && !/^ND-\d{4}(-[A-Z0-9-]+)?$/.test(formData.ndNumber)) {
      errors.ndNumber = 'Format: ND-XXXX or ND-XXXX-SUFFIX';
    }
    if (formData.barcode && !/^\d{12,13}$/.test(formData.barcode)) {
      errors.barcode = 'Barcode must be 12-13 digits';
    }

    // Confidence score range
    if (formData.confidenceScore) {
      const score = parseInt(formData.confidenceScore);
      if (isNaN(score) || score < 0 || score > 100) {
        errors.confidenceScore = 'Must be 0-100';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  // ── Build save payload ─────────────────────────────────────
  const buildPayload = useCallback(() => {
    const toNum = (v: string): number | null => {
      const n = parseFloat(v);
      return v && !isNaN(n) ? n : null;
    };
    const toInt = (v: string): number | null => {
      const n = parseInt(v, 10);
      return v && !isNaN(n) ? n : null;
    };
    const toStr = (v: string): string | null => (v.trim() || null);

    return {
      sourceRow: toInt(formData.sourceRow),
      productId: toStr(formData.productId),
      sku: toStr(formData.sku),
      ndNumber: toStr(formData.ndNumber),
      barcode: toStr(formData.barcode),
      legacyCode: toStr(formData.legacyCode),
      brand: toStr(formData.brand),
      brandAr: toStr(formData.brandAr),
      brandCode: toStr(formData.brandCode),
      model: toStr(formData.model),
      department: toStr(formData.department),
      category: toStr(formData.category),
      subcategory: toStr(formData.subcategory),
      sectionCode: toStr(formData.sectionCode),
      productFamily: toStr(formData.productFamily),
      productType: toStr(formData.productType),
      nameAr: toStr(formData.nameAr),
      nameEn: toStr(formData.nameEn),
      shortDescAr: toStr(formData.shortDescAr),
      shortDescEn: toStr(formData.shortDescEn),
      longDescAr: toStr(formData.longDescAr),
      longDescEn: toStr(formData.longDescEn),
      color: toStr(formData.color),
      colorAr: toStr(formData.colorAr),
      material: toStr(formData.material),
      materialAr: toStr(formData.materialAr),
      capacity: toNum(formData.capacity),
      capacityUnit: toStr(formData.capacityUnit),
      weight: toNum(formData.weight),
      weightUnit: toStr(formData.weightUnit),
      length: toNum(formData.length),
      width: toNum(formData.width),
      height: toNum(formData.height),
      diameter: toNum(formData.diameter),
      dimensionUnit: toStr(formData.dimensionUnit),
      countryOfOrigin: toStr(formData.countryOfOrigin),
      unit: toStr(formData.unit),
      minSalesMultiples: toStr(formData.minSalesMultiples),
      defaultPrice: toNum(formData.defaultPrice),
      seoTitleEn: toStr(formData.seoTitleEn),
      seoTitleAr: toStr(formData.seoTitleAr),
      seoDescriptionEn: toStr(formData.seoDescriptionEn),
      seoDescriptionAr: toStr(formData.seoDescriptionAr),
      searchKeywords: toStr(formData.searchKeywords),
      internalNotes: toStr(formData.internalNotes),
      validationStatus: toStr(formData.validationStatus),
      confidenceScore: toInt(formData.confidenceScore),
      pieces: toInt(formData.pieces),
      setCount: toInt(formData.setCount),
      shape: toStr(formData.shape),
      finish: toStr(formData.finish),
      additionalInfo: toStr(formData.additionalInfo),
    };
  }, [formData]);

  // ── Save handler ───────────────────────────────────────────
  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fix the validation errors before saving.');
      // Expand sections that have errors
      const errorFields = Object.keys(validationErrors);
      // We can't perfectly map, but expand all sections to show errors
      setExpandedSections(new Set(SECTION_ORDER));
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      let res: Response | undefined;

      if (mode === 'add') {
        res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else if (currentProduct) {
        res = await fetch(`/api/products/${currentProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (res?.ok) {
        toast.success(mode === 'add' ? 'Product created successfully!' : 'Product updated successfully!');
        setView('products');
      } else {
        const errData = await res?.json().catch(() => ({}));
        toast.error(errData?.error || 'Failed to save product');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  // ── Image handlers (edit mode) ─────────────────────────────
  const handleImageUpload = async (file: File, isPrimary?: boolean) => {
    if (!currentProduct) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('productId', currentProduct.id);
    if (isPrimary) fd.append('isPrimary', 'true');

    const res = await fetch('/api/images/upload', { method: 'POST', body: fd });
    if (res.ok) {
      const newImage = await res.json();
      setCurrentProduct({
        ...currentProduct,
        images: [...currentProduct.images, newImage].sort((a, b) => a.displayOrder - b.displayOrder),
      });
      toast.success('Image uploaded successfully');
    } else {
      let errorMsg = 'Upload failed';
      try {
        const errData = await res.json();
        errorMsg = errData.error || errorMsg;
      } catch {}
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const handleImageDelete = async (imageId: string) => {
    const res = await fetch(`/api/images/${imageId}`, { method: 'DELETE' });
    if (res.ok && currentProduct) {
      setCurrentProduct({
        ...currentProduct,
        images: currentProduct.images.filter((img) => img.id !== imageId),
      });
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    const res = await fetch(`/api/images/${imageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPrimary: true }),
    });
    if (res.ok && currentProduct) {
      setCurrentProduct({
        ...currentProduct,
        images: currentProduct.images.map((img) => ({
          ...img,
          isPrimary: img.id === imageId,
        })),
      });
    }
  };

  // ── Duplicate warnings ─────────────────────────────────────
  const hasDuplicates = duplicates && (duplicates.ndNumber || duplicates.barcode || duplicates.productId || duplicates.sku);

  // ── Grid layout helper ─────────────────────────────────────
  /** 2-column grid on desktop, 1-column on mobile */
  const Grid2 = ({ children }: { children: React.ReactNode }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
  );

  const Grid3 = ({ children }: { children: React.ReactNode }) => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{children}</div>
  );

  // ── Error message helper ───────────────────────────────────
  const FieldError = ({ field }: { field: keyof FormData }) => {
    if (!validationErrors[field]) return null;
    return <p className="text-xs text-red-500 mt-1">{validationErrors[field]}</p>;
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="space-y-4 pb-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={goBack} className="h-9 w-9 p-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{mode === 'add' ? 'Add New Product' : 'Edit Product'}</h1>
        </div>
        <Button onClick={handleSave} disabled={!!hasDuplicates || isSaving} className="h-10">
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {mode === 'add' ? 'Create' : 'Save'}
        </Button>
      </div>

      {/* ── Duplicate Warnings ── */}
      {hasDuplicates && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="space-y-1">
            {duplicates.ndNumber && (
              <div>ND Number &ldquo;{duplicates.ndNumber.ndNumber}&rdquo; already exists{duplicates.ndNumber.nameEn ? ` (${duplicates.ndNumber.nameEn})` : ''}</div>
            )}
            {duplicates.barcode && (
              <div>Barcode &ldquo;{duplicates.barcode.barcode}&rdquo; already exists{duplicates.barcode.nameEn ? ` (${duplicates.barcode.nameEn})` : ''}</div>
            )}
            {duplicates.productId && (
              <div>Product ID &ldquo;{duplicates.productId.productId}&rdquo; already exists{duplicates.productId.nameEn ? ` (${duplicates.productId.nameEn})` : ''}</div>
            )}
            {duplicates.sku && (
              <div>SKU &ldquo;{duplicates.sku.sku}&rdquo; already exists{duplicates.sku.nameEn ? ` (${duplicates.sku.nameEn})` : ''}</div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* ── Product Images (edit mode only) ── */}
      {mode === 'edit' && currentProduct && (
        <Card>
          <CardContent className="pt-4">
            <ImageGallery
              images={currentProduct.images}
              productId={currentProduct.id}
              onUpload={handleImageUpload}
              onDelete={handleImageDelete}
              onSetPrimary={handleSetPrimary}
            />
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════
          SECTION 1: Product Identity (10 fields)
          ═══════════════════════════════════════════════════════ */}
      <SectionCard
        title="Product Identity"
        fieldCount={10}
        open={expandedSections.has('Product Identity')}
        onToggle={() => toggleSection('Product Identity')}
      >
        <Grid2>
          {/* Source Row (auto-generated, read-only in edit) */}
          <div className="space-y-2">
            <div className="flex items-center">
              <FieldLabel htmlFor="sourceRow">Source Row</FieldLabel>
              <AutoBadge />
            </div>
            <ReadOnlyInput value={formData.sourceRow} placeholder="Auto-generated" />
          </div>

          {/* Product ID * */}
          <div className="space-y-2">
            <FieldLabel htmlFor="productId" mandatory>Product ID</FieldLabel>
            <Input
              id="productId"
              value={formData.productId}
              onChange={(e) => updateField('productId', e.target.value)}
              placeholder="e.g. 123456789012"
              className="h-11"
            />
            <FieldError field="productId" />
          </div>

          {/* SKU * */}
          <div className="space-y-2">
            <FieldLabel htmlFor="sku" mandatory>SKU</FieldLabel>
            <Input
              id="sku"
              value={formData.sku}
              onChange={(e) => updateField('sku', e.target.value)}
              placeholder="e.g. 123456789012"
              className="h-11"
            />
            <FieldError field="sku" />
          </div>

          {/* ND Number */}
          <div className="space-y-2">
            <FieldLabel htmlFor="ndNumber">ND Number</FieldLabel>
            <Input
              id="ndNumber"
              value={formData.ndNumber}
              onChange={(e) => updateField('ndNumber', e.target.value)}
              placeholder="ND-1000"
              className="h-11"
            />
            <FieldError field="ndNumber" />
          </div>

          {/* Barcode * + Scanner */}
          <div className="space-y-2">
            <FieldLabel mandatory>Barcode</FieldLabel>
            <div className="flex gap-2">
              <Input
                value={formData.barcode}
                onChange={(e) => updateField('barcode', e.target.value)}
                placeholder="102000001249"
                className="h-11 flex-1"
              />
              <BarcodeScanner onScan={(barcode) => updateField('barcode', barcode)} />
            </div>
            <FieldError field="barcode" />
          </div>

          {/* Legacy Code */}
          <div className="space-y-2">
            <FieldLabel htmlFor="legacyCode">Legacy Code</FieldLabel>
            <Input
              id="legacyCode"
              value={formData.legacyCode}
              onChange={(e) => updateField('legacyCode', e.target.value)}
              placeholder="Legacy ERP code"
              className="h-11"
            />
          </div>

          {/* Brand * */}
          <div className="space-y-2">
            <FieldLabel mandatory>Brand</FieldLabel>
            <SearchableSingleSelect
              label="Brand"
              value={formData.brand}
              onChange={(v) => updateField('brand', v)}
              suggestions={BRAND_OPTIONS}
              placeholder="Select brand..."
              emptyMessage="No brand found."
              allowAddNew
            />
            <FieldError field="brand" />
          </div>

          {/* Brand AR (auto) */}
          <div className="space-y-2">
            <div className="flex items-center">
              <FieldLabel>Brand AR</FieldLabel>
              <AutoBadge />
            </div>
            <ReadOnlyInput value={formData.brandAr} placeholder="Auto-filled from Brand" dir="rtl" />
          </div>

          {/* Brand Code (auto) */}
          <div className="space-y-2">
            <div className="flex items-center">
              <FieldLabel>Brand Code</FieldLabel>
              <AutoBadge />
            </div>
            <ReadOnlyInput value={formData.brandCode} placeholder="Auto-filled from Brand" />
          </div>

          {/* Model */}
          <div className="space-y-2">
            <FieldLabel htmlFor="model">Model</FieldLabel>
            <Input
              id="model"
              value={formData.model}
              onChange={(e) => updateField('model', e.target.value)}
              placeholder="Manufacturer model/variant"
              className="h-11"
            />
          </div>
        </Grid2>
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════
          SECTION 2: Classification (6 fields)
          ═══════════════════════════════════════════════════════ */}
      <SectionCard
        title="Classification"
        fieldCount={6}
        open={expandedSections.has('Classification')}
        onToggle={() => toggleSection('Classification')}
      >
        <Grid2>
          {/* Department * */}
          <div className="space-y-2">
            <FieldLabel mandatory>Department</FieldLabel>
            <SearchableSingleSelect
              label="Department"
              value={formData.department}
              onChange={(v) => updateField('department', v)}
              suggestions={DEPARTMENTS}
              placeholder="Select department..."
              emptyMessage="No department found."
            />
            <FieldError field="department" />
          </div>

          {/* Category * (dependent on Department) */}
          <div className="space-y-2">
            <FieldLabel mandatory>Category</FieldLabel>
            <SearchableSingleSelect
              label="Category"
              value={formData.category}
              onChange={(v) => updateField('category', v)}
              suggestions={categoryOptions}
              placeholder={formData.department ? 'Select category...' : 'Select a department first...'}
              emptyMessage="No categories found."
            />
            <FieldError field="category" />
          </div>

          {/* Subcategory (dependent on Category) */}
          <div className="space-y-2">
            <FieldLabel>Subcategory</FieldLabel>
            <SearchableSingleSelect
              label="Subcategory"
              value={formData.subcategory}
              onChange={(v) => updateField('subcategory', v)}
              suggestions={subcategoryOptions}
              placeholder={
                !formData.department
                  ? 'Select a department first...'
                  : !formData.category
                    ? 'Select a category first...'
                    : hasSubcategories
                      ? 'Select subcategory...'
                      : 'No subcategories for this category'
              }
              emptyMessage="No subcategories found."
            />
          </div>

          {/* Section Code (auto) */}
          <div className="space-y-2">
            <div className="flex items-center">
              <FieldLabel>Section Code</FieldLabel>
              <AutoBadge />
            </div>
            <ReadOnlyInput value={formData.sectionCode} placeholder="Auto-filled from Department" />
          </div>

          {/* Product Family * (dependent on Subcategory) */}
          <div className="space-y-2">
            <FieldLabel mandatory>Product Family</FieldLabel>
            <SearchableSingleSelect
              label="Product Family"
              value={formData.productFamily}
              onChange={(v) => updateField('productFamily', v)}
              suggestions={productFamilyOptions}
              placeholder={formData.subcategory ? 'Select product family...' : 'Select a subcategory first...'}
              emptyMessage="No product families found."
            />
            <FieldError field="productFamily" />
          </div>

          {/* Product Type * (dependent on Product Family) */}
          <div className="space-y-2">
            <FieldLabel mandatory>Product Type</FieldLabel>
            <SearchableSingleSelect
              label="Product Type"
              value={formData.productType}
              onChange={(v) => updateField('productType', v)}
              suggestions={productTypeOptions}
              placeholder={formData.productFamily ? 'Select product type...' : 'Select a product family first...'}
              emptyMessage="No product types found."
            />
            <FieldError field="productType" />
          </div>
        </Grid2>
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════
          SECTION 3: Product Information (6 fields)
          ═══════════════════════════════════════════════════════ */}
      <SectionCard
        title="Product Information"
        fieldCount={6}
        open={expandedSections.has('Product Information')}
        onToggle={() => toggleSection('Product Information')}
      >
        <Grid2>
          {/* Name AR * */}
          <div className="space-y-2">
            <FieldLabel htmlFor="nameAr" mandatory>Name AR</FieldLabel>
            <Input
              id="nameAr"
              value={formData.nameAr}
              onChange={(e) => updateField('nameAr', e.target.value)}
              placeholder="اسم المنتج بالعربية"
              className="h-11"
              dir="rtl"
            />
            <FieldError field="nameAr" />
          </div>

          {/* Name EN * */}
          <div className="space-y-2">
            <FieldLabel htmlFor="nameEn" mandatory>Name EN</FieldLabel>
            <Input
              id="nameEn"
              value={formData.nameEn}
              onChange={(e) => updateField('nameEn', e.target.value)}
              placeholder="Product name in English"
              className="h-11"
            />
            <FieldError field="nameEn" />
          </div>
        </Grid2>

        <Grid2>
          {/* Short Desc AR (auto-derived, but editable) */}
          <div className="space-y-2">
            <div className="flex items-center">
              <FieldLabel htmlFor="shortDescAr" mandatory>Short Desc AR</FieldLabel>
              <AutoBadge />
            </div>
            <Input
              id="shortDescAr"
              value={formData.shortDescAr}
              onChange={(e) => updateField('shortDescAr', e.target.value)}
              placeholder="Auto-fills from Name AR"
              className="h-11"
              dir="rtl"
            />
          </div>

          {/* Short Desc EN (auto-derived, but editable) */}
          <div className="space-y-2">
            <div className="flex items-center">
              <FieldLabel htmlFor="shortDescEn" mandatory>Short Desc EN</FieldLabel>
              <AutoBadge />
            </div>
            <Input
              id="shortDescEn"
              value={formData.shortDescEn}
              onChange={(e) => updateField('shortDescEn', e.target.value)}
              placeholder="Auto-fills from Name EN"
              className="h-11"
            />
          </div>
        </Grid2>

        {/* Long Desc AR (optional) */}
        <div className="space-y-2">
          <FieldLabel htmlFor="longDescAr">Long Desc AR</FieldLabel>
          <Textarea
            id="longDescAr"
            value={formData.longDescAr}
            onChange={(e) => updateField('longDescAr', e.target.value)}
            placeholder="وصف تفصيلي بالعربية"
            dir="rtl"
            rows={3}
          />
        </div>

        {/* Long Desc EN (auto-derived, but editable) */}
        <div className="space-y-2">
          <div className="flex items-center">
            <FieldLabel htmlFor="longDescEn" mandatory>Long Desc EN</FieldLabel>
            <AutoBadge />
          </div>
          <Textarea
            id="longDescEn"
            value={formData.longDescEn}
            onChange={(e) => updateField('longDescEn', e.target.value)}
            placeholder="Auto-generated from Brand + Name EN"
            rows={3}
          />
        </div>
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════
          SECTION 4: Attributes (13 fields)
          ═══════════════════════════════════════════════════════ */}
      <SectionCard
        title="Attributes"
        fieldCount={13}
        open={expandedSections.has('Attributes')}
        onToggle={() => toggleSection('Attributes')}
      >
        <Grid2>
          {/* Color */}
          <div className="space-y-2">
            <FieldLabel>Color</FieldLabel>
            <SearchableSingleSelect
              label="Color"
              value={formData.color}
              onChange={(v) => updateField('color', v)}
              suggestions={COLOR_OPTIONS}
              placeholder="Select color..."
              emptyMessage="No color found."
            />
          </div>

          {/* Color AR (auto) */}
          <div className="space-y-2">
            <div className="flex items-center">
              <FieldLabel>Color AR</FieldLabel>
              <AutoBadge />
            </div>
            <ReadOnlyInput value={formData.colorAr} placeholder="Auto-filled from Color" dir="rtl" />
          </div>

          {/* Material */}
          <div className="space-y-2">
            <FieldLabel>Material</FieldLabel>
            <SearchableSingleSelect
              label="Material"
              value={formData.material}
              onChange={(v) => updateField('material', v)}
              suggestions={MATERIAL_OPTIONS}
              placeholder="Select material..."
              emptyMessage="No material found."
            />
          </div>

          {/* Material AR (auto) */}
          <div className="space-y-2">
            <div className="flex items-center">
              <FieldLabel>Material AR</FieldLabel>
              <AutoBadge />
            </div>
            <ReadOnlyInput value={formData.materialAr} placeholder="Auto-filled from Material" dir="rtl" />
          </div>
        </Grid2>

        {/* Capacity + Capacity Unit */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <FieldLabel htmlFor="capacity">Capacity</FieldLabel>
            <Input
              id="capacity"
              type="number"
              step="0.01"
              value={formData.capacity}
              onChange={(e) => updateField('capacity', e.target.value)}
              placeholder="0"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <FieldLabel>Capacity Unit</FieldLabel>
            <SearchableSingleSelect
              label="Capacity Unit"
              value={formData.capacityUnit}
              onChange={(v) => updateField('capacityUnit', v)}
              suggestions={[...CAPACITY_UNIT_OPTIONS]}
              placeholder="Unit..."
              emptyMessage="No unit found."
            />
          </div>
        </div>

        {/* Weight + Weight Unit */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <FieldLabel htmlFor="weight">Weight</FieldLabel>
            <Input
              id="weight"
              type="number"
              step="0.01"
              value={formData.weight}
              onChange={(e) => updateField('weight', e.target.value)}
              placeholder="0"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <FieldLabel>Weight Unit</FieldLabel>
            <SearchableSingleSelect
              label="Weight Unit"
              value={formData.weightUnit}
              onChange={(v) => updateField('weightUnit', v)}
              suggestions={[...WEIGHT_UNIT_OPTIONS]}
              placeholder="Unit..."
              emptyMessage="No unit found."
            />
          </div>
        </div>

        {/* Dimensions (L, W, H, Diameter) + Dimension Unit */}
        <div className="space-y-2">
          <FieldLabel>Dimensions</FieldLabel>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <span className="text-[10px] text-muted-foreground pl-1">Length</span>
              <Input
                type="number"
                step="0.01"
                value={formData.length}
                onChange={(e) => updateField('length', e.target.value)}
                placeholder="0"
                className="h-11"
              />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground pl-1">Width</span>
              <Input
                type="number"
                step="0.01"
                value={formData.width}
                onChange={(e) => updateField('width', e.target.value)}
                placeholder="0"
                className="h-11"
              />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground pl-1">Height</span>
              <Input
                type="number"
                step="0.01"
                value={formData.height}
                onChange={(e) => updateField('height', e.target.value)}
                placeholder="0"
                className="h-11"
              />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground pl-1">Diameter</span>
              <Input
                type="number"
                step="0.01"
                value={formData.diameter}
                onChange={(e) => updateField('diameter', e.target.value)}
                placeholder="0"
                className="h-11"
              />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground pl-1">Unit</span>
              <SearchableSingleSelect
                label="Dimension Unit"
                value={formData.dimensionUnit}
                onChange={(v) => updateField('dimensionUnit', v)}
                suggestions={[...DIMENSION_UNIT_OPTIONS]}
                placeholder="cm"
                emptyMessage="No unit found."
              />
            </div>
          </div>
          {formData.dimensionUnit && (
            <p className="text-xs text-muted-foreground">All dimension values are in {formData.dimensionUnit}</p>
          )}
        </div>
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════
          SECTION 5: Logistics (3 fields)
          ═══════════════════════════════════════════════════════ */}
      <SectionCard
        title="Logistics"
        fieldCount={3}
        open={expandedSections.has('Logistics')}
        onToggle={() => toggleSection('Logistics')}
      >
        <Grid2>
          {/* Country of Origin */}
          <div className="space-y-2">
            <FieldLabel>Country of Origin</FieldLabel>
            <SearchableSingleSelect
              label="Country of Origin"
              value={formData.countryOfOrigin}
              onChange={(v) => updateField('countryOfOrigin', v)}
              suggestions={[...COUNTRY_OPTIONS]}
              placeholder="Select country..."
              emptyMessage="No country found."
              allowAddNew
            />
          </div>

          {/* Unit * */}
          <div className="space-y-2">
            <FieldLabel mandatory>Unit</FieldLabel>
            <SearchableSingleSelect
              label="Unit"
              value={formData.unit}
              onChange={(v) => updateField('unit', v)}
              suggestions={[...UNIT_OPTIONS]}
              placeholder="Select unit..."
              emptyMessage="No unit found."
            />
            <FieldError field="unit" />
          </div>

          {/* Min Sales Multiples * */}
          <div className="space-y-2">
            <FieldLabel mandatory>Min Sales Multiples</FieldLabel>
            <SearchableSingleSelect
              label="Min Sales Multiples"
              value={formData.minSalesMultiples}
              onChange={(v) => updateField('minSalesMultiples', v)}
              suggestions={[...MIN_SALES_MULTIPLES_OPTIONS]}
              placeholder="Select..."
              emptyMessage="No option found."
            />
            <FieldError field="minSalesMultiples" />
          </div>
        </Grid2>
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════
          SECTION 6: Commercial (1 field — Price)
          ═══════════════════════════════════════════════════════ */}
      <SectionCard
        title="Commercial"
        fieldCount={1}
        open={expandedSections.has('Commercial')}
        onToggle={() => toggleSection('Commercial')}
      >
        <div className="space-y-2 max-w-md">
          <FieldLabel>Default Price (KWD)</FieldLabel>
          <div className="grid grid-cols-2 gap-0">
            <div className="space-y-0.5">
              <span className="text-[10px] text-muted-foreground pl-1">Dinar</span>
              <Input
                type="text"
                inputMode="numeric"
                value={priceDinar}
                onChange={(e) => handlePriceDinarChange(e.target.value)}
                placeholder="0"
                className="h-11 rounded-r-none text-right font-mono text-base"
                aria-label="Dinar"
              />
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-muted-foreground pl-1">Fils</span>
              <div className="flex items-center">
                <span className="flex h-11 items-center justify-center border-y border-input bg-muted px-1.5 text-lg font-bold text-muted-foreground select-none">
                  .
                </span>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={priceFils}
                  onChange={(e) => handlePriceFilsChange(e.target.value)}
                  placeholder="000"
                  maxLength={3}
                  className="h-11 rounded-l-none font-mono text-base"
                  aria-label="Fils"
                />
              </div>
            </div>
          </div>
          {combinedPrice && (
            <p className="text-xs text-muted-foreground font-mono">
              {combinedPrice} KWD
            </p>
          )}
        </div>
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════
          SECTION 7: SEO (5 fields)
          ═══════════════════════════════════════════════════════ */}
      <SectionCard
        title="SEO"
        fieldCount={5}
        open={expandedSections.has('SEO')}
        onToggle={() => toggleSection('SEO')}
      >
        <Grid2>
          {/* SEO Title EN */}
          <div className="space-y-2">
            <FieldLabel htmlFor="seoTitleEn">SEO Title EN</FieldLabel>
            <Input
              id="seoTitleEn"
              value={formData.seoTitleEn}
              onChange={(e) => updateField('seoTitleEn', e.target.value)}
              placeholder="SEO title in English (< 60 chars)"
              className="h-11"
              maxLength={60}
            />
            {formData.seoTitleEn && (
              <p className="text-xs text-muted-foreground">{formData.seoTitleEn.length}/60</p>
            )}
          </div>

          {/* SEO Title AR (auto-derived from Name AR) */}
          <div className="space-y-2">
            <div className="flex items-center">
              <FieldLabel htmlFor="seoTitleAr" mandatory>SEO Title AR</FieldLabel>
              <AutoBadge />
            </div>
            <Input
              id="seoTitleAr"
              value={formData.seoTitleAr}
              onChange={(e) => updateField('seoTitleAr', e.target.value)}
              placeholder="Auto-fills from Name AR"
              className="h-11"
              dir="rtl"
            />
          </div>
        </Grid2>

        {/* SEO Description EN (auto-derived) */}
        <div className="space-y-2">
          <div className="flex items-center">
            <FieldLabel htmlFor="seoDescriptionEn" mandatory>SEO Description EN</FieldLabel>
            <AutoBadge />
          </div>
          <Textarea
            id="seoDescriptionEn"
            value={formData.seoDescriptionEn}
            onChange={(e) => updateField('seoDescriptionEn', e.target.value)}
            placeholder="Auto-generated: {Brand} {Product Type}. Available in Kuwait."
            rows={2}
          />
        </div>

        {/* SEO Description AR (auto-derived) */}
        <div className="space-y-2">
          <div className="flex items-center">
            <FieldLabel htmlFor="seoDescriptionAr" mandatory>SEO Description AR</FieldLabel>
            <AutoBadge />
          </div>
          <Textarea
            id="seoDescriptionAr"
            value={formData.seoDescriptionAr}
            onChange={(e) => updateField('seoDescriptionAr', e.target.value)}
            placeholder="Auto-generated from Brand AR + Product Type"
            dir="rtl"
            rows={2}
          />
        </div>

        {/* Search Keywords (pipe-separated, auto-derived) */}
        <div className="space-y-2">
          <div className="flex items-center">
            <FieldLabel htmlFor="searchKeywords" mandatory>Search Keywords</FieldLabel>
            <AutoBadge />
          </div>
          <Textarea
            id="searchKeywords"
            value={formData.searchKeywords}
            onChange={(e) => updateField('searchKeywords', e.target.value)}
            placeholder="Auto-generated: Brand | Product Family | Product Type"
            rows={2}
          />
          <p className="text-xs text-muted-foreground">Pipe-separated keywords for search indexing</p>
        </div>
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════
          SECTION 8: Internal (8 fields)
          ═══════════════════════════════════════════════════════ */}
      <SectionCard
        title="Internal"
        fieldCount={8}
        open={expandedSections.has('Internal')}
        onToggle={() => toggleSection('Internal')}
      >
        <Grid2>
          {/* Internal Notes */}
          <div className="space-y-2 sm:col-span-2">
            <FieldLabel htmlFor="internalNotes">Internal Notes</FieldLabel>
            <Textarea
              id="internalNotes"
              value={formData.internalNotes}
              onChange={(e) => updateField('internalNotes', e.target.value)}
              placeholder="Staff notes, remarks..."
              rows={2}
            />
          </div>

          {/* Validation Status * */}
          <div className="space-y-2">
            <FieldLabel mandatory>Validation Status</FieldLabel>
            <SearchableSingleSelect
              label="Validation Status"
              value={formData.validationStatus}
              onChange={(v) => updateField('validationStatus', v)}
              suggestions={[...VALIDATION_STATUS_OPTIONS]}
              placeholder="Select status..."
              emptyMessage="No status found."
            />
            <FieldError field="validationStatus" />
          </div>

          {/* Confidence Score * */}
          <div className="space-y-2">
            <FieldLabel htmlFor="confidenceScore" mandatory>Confidence Score</FieldLabel>
            <Input
              id="confidenceScore"
              type="number"
              min={0}
              max={100}
              step={1}
              value={formData.confidenceScore}
              onChange={(e) => updateField('confidenceScore', e.target.value)}
              placeholder="0-100"
              className="h-11"
            />
            <FieldError field="confidenceScore" />
          </div>

          {/* Pieces */}
          <div className="space-y-2">
            <FieldLabel htmlFor="pieces">Pieces</FieldLabel>
            <Input
              id="pieces"
              type="number"
              step={1}
              min={0}
              value={formData.pieces}
              onChange={(e) => updateField('pieces', e.target.value)}
              placeholder="0"
              className="h-11"
            />
          </div>

          {/* Set Count */}
          <div className="space-y-2">
            <FieldLabel htmlFor="setCount">Set Count</FieldLabel>
            <Input
              id="setCount"
              type="number"
              step={1}
              min={0}
              value={formData.setCount}
              onChange={(e) => updateField('setCount', e.target.value)}
              placeholder="0"
              className="h-11"
            />
          </div>

          {/* Shape */}
          <div className="space-y-2">
            <FieldLabel>Shape</FieldLabel>
            <SearchableSingleSelect
              label="Shape"
              value={formData.shape}
              onChange={(v) => updateField('shape', v)}
              suggestions={[...SHAPE_OPTIONS]}
              placeholder="Select shape..."
              emptyMessage="No shape found."
            />
          </div>

          {/* Finish */}
          <div className="space-y-2">
            <FieldLabel>Finish</FieldLabel>
            <SearchableSingleSelect
              label="Finish"
              value={formData.finish}
              onChange={(v) => updateField('finish', v)}
              suggestions={[...FINISH_OPTIONS]}
              placeholder="Select finish..."
              emptyMessage="No finish found."
            />
          </div>

          {/* Additional Info */}
          <div className="space-y-2">
            <FieldLabel>Additional Information</FieldLabel>
            <SearchableSingleSelect
              label="Additional Information"
              value={formData.additionalInfo}
              onChange={(v) => updateField('additionalInfo', v)}
              suggestions={[...ADDITIONAL_INFO_OPTIONS]}
              placeholder="Select..."
              emptyMessage="No option found."
              allowAddNew
            />
          </div>
        </Grid2>
      </SectionCard>
    </div>
  );
}
