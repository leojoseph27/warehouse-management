'use client';

import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useInventoryStore, Product, SortBy, SortOrder } from '@/store/inventory-store';
import { SearchableSingleSelect } from '@/components/inventory/searchable-single-select';
import {
  DEPARTMENTS,
  getCategoriesForDepartment,
  getSubcategoriesForCategory,
  PRODUCT_FAMILIES,
  getTypesForFamily,
  BRAND_OPTIONS,
  COLOR_OPTIONS,
  MATERIAL_OPTIONS,
  COUNTRY_OPTIONS,
  UNIT_OPTIONS,
  VALIDATION_STATUS_OPTIONS,
  SHAPE_OPTIONS,
} from '@/lib/lookups';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  SlidersHorizontal,
  ArrowLeft,
  Image as ImageIcon,
  Download,
  Upload,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronRight,
  Layers,
  Columns3,
  FileDown,
  ScanBarcode,
  Camera,
  Eye,
  Pencil,
  ChevronLeft,
} from 'lucide-react';
import { BarcodeScanner } from '@/components/inventory/barcode-scanner-modal';
import { BarcodePhotoCapture } from '@/components/inventory/barcode-photo-capture';

/** Format price as KD */
function formatPrice(price: number | null): string {
  if (price == null) return '-';
  return `${price.toFixed(3)} KD`;
}

/** Highlight matching text within a string */
function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <>{text}</>;

  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-amber-200 text-amber-900 rounded px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

/** Column visibility configuration */
interface ColumnConfig {
  key: string;
  label: string;
  alwaysVisible: boolean;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'sourceRow', label: 'Sr', alwaysVisible: true },
  { key: 'productId', label: 'Product ID', alwaysVisible: false },
  { key: 'sku', label: 'SKU', alwaysVisible: false },
  { key: 'ndNumber', label: 'ND Number', alwaysVisible: true },
  { key: 'barcode', label: 'Barcode', alwaysVisible: true },
  { key: 'nameEn', label: 'Name EN', alwaysVisible: true },
  { key: 'brand', label: 'Brand', alwaysVisible: false },
  { key: 'productType', label: 'Product Type', alwaysVisible: false },
  { key: 'productFamily', label: 'Product Family', alwaysVisible: false },
  { key: 'material', label: 'Material', alwaysVisible: false },
  { key: 'color', label: 'Color', alwaysVisible: false },
  { key: 'countryOfOrigin', label: 'Origin', alwaysVisible: false },
  { key: 'defaultPrice', label: 'Price', alwaysVisible: false },
  { key: 'pieces', label: 'Pcs', alwaysVisible: false },
];

export function ProductTable() {
  const {
    products,
    totalProducts,
    currentPage,
    searchQuery,
    filterDepartment,
    filterCategory,
    filterSubcategory,
    filterProductFamily,
    filterProductType,
    filterBrand,
    filterColor,
    filterMaterial,
    filterCountryOfOrigin,
    filterUnit,
    filterValidationStatus,
    filterShape,
    filterPriceMin,
    filterPriceMax,
    filterSourceRow,
    filterNdNumber,
    filterNameEn,
    filterOnlyModified,
    filterRecentlyAddedDays,
    sortBy,
    sortOrder,
    groupByNd,
    ndGroups,
    expandedGroups,
    selectedNdNumber,
    isLoading,
    setView,
    setProducts,
    setCurrentProduct,
    setSearchQuery,
    setFilter,
    clearFilters,
    setLoading,
    setCurrentPage,
    setSortBy,
    setSortOrder,
    setGroupByNd,
    setNdGroups,
    toggleGroup,
    setSelectedNdNumber,
    scrollPosition,
    setScrollPosition,
  } = useInventoryStore();

  const [showFilters, setShowFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [srRange, setSrRange] = useState('');
  const [srRangeError, setSrRangeError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    DEFAULT_COLUMNS.filter(c => c.alwaysVisible || ['brand', 'defaultPrice', 'pieces'].includes(c.key)).map(c => c.key)
  );
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const columnMenuRef = useRef<HTMLDivElement>(null);
  // Local raw input for the smart Default Price filter. The user types things
  // like ">5", "<0.5", "1-2", or "1"; we parse it into min/max and write those
  // to the store (filterPriceMin / filterPriceMax) which the API actually reads.
  const [localPriceInput, setLocalPriceInput] = useState('');
  const [localSourceRowInput, setLocalSourceRowInput] = useState('');
  // DB-backed suggestions for Product Type / Product Family dropdowns.
  // These merge actual DB values with the hardcoded lookup tables so the
  // dropdown always shows values that exist in the database (fixes the
  // "Product Type filter returns 0 results" bug where lookup values didn't
  // match DB values).
  const [dbSuggestions, setDbSuggestions] = useState<{
    productTypes: string[];
    productFamilies: string[];
  }>({ productTypes: [], productFamilies: [] });

  // ── Parse a Source Row input string into { min, max } ──
  // Supports:  "100" (exact), "100-500" (range), ">100" (min), "<500" (max)
  const parseSourceRowInput = useCallback((raw: string): { min?: number; max?: number } => {
    const trimmed = raw.trim();
    if (!trimmed) return {};
    // Range: "100-500" or "100 - 500"
    const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const a = parseInt(rangeMatch[1], 10);
      const b = parseInt(rangeMatch[2], 10);
      return { min: Math.min(a, b), max: Math.max(a, b) };
    }
    // Greater than: ">100" or ">=100"
    const gtMatch = trimmed.match(/^>\s*=?\s*(\d+)$/);
    if (gtMatch) return { min: parseInt(gtMatch[1], 10) };
    // Less than: "<100" or "<=100"
    const ltMatch = trimmed.match(/^<\s*=?\s*(\d+)$/);
    if (ltMatch) return { max: parseInt(ltMatch[1], 10) };
    // Exact value: "100"
    const exactMatch = trimmed.match(/^(\d+)$/);
    if (exactMatch) return { min: parseInt(exactMatch[1], 10), max: parseInt(exactMatch[1], 10) };
    return {};
  }, []);

  // ── Parse a Default Price input string into { min, max } ──
  // Supports:  "1" (exact), "1-2" (range), ">5" (min), "<0.5" (max)
  const parsePriceInput = useCallback((raw: string): { min?: number; max?: number } => {
    const trimmed = raw.trim();
    if (!trimmed) return {};
    const rangeMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
    if (rangeMatch) {
      const a = parseFloat(rangeMatch[1]);
      const b = parseFloat(rangeMatch[2]);
      return { min: Math.min(a, b), max: Math.max(a, b) };
    }
    const gtMatch = trimmed.match(/^>\s*=?\s*(\d+(?:\.\d+)?)$/);
    if (gtMatch) return { min: parseFloat(gtMatch[1]) };
    const ltMatch = trimmed.match(/^<\s*=?\s*(\d+(?:\.\d+)?)$/);
    if (ltMatch) return { max: parseFloat(ltMatch[1]) };
    const exactMatch = trimmed.match(/^(\d+(?:\.\d+)?)$/);
    if (exactMatch) return { min: parseFloat(exactMatch[1]), max: parseFloat(exactMatch[1]) };
    return {};
  }, []);
  
  const totalPages = Math.ceil(totalProducts / 50);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // ── Dependent filter options ──
  const categoryOptions = useMemo(() => getCategoriesForDepartment(filterDepartment), [filterDepartment]);
  const subcategoryOptions = useMemo(() => getSubcategoriesForCategory(filterDepartment, filterCategory), [filterDepartment, filterCategory]);
  // Product Type suggestions: prefer DB-backed values (so dropdown matches DB),
  // fall back to lookup-table values for the selected family.
  const productTypeOptions = useMemo(() => {
    if (dbSuggestions.productTypes.length > 0) return dbSuggestions.productTypes;
    return getTypesForFamily(filterProductFamily);
  }, [dbSuggestions.productTypes, filterProductFamily]);
  // Product Family suggestions: prefer DB-backed values.
  const productFamilyOptions = useMemo(() => {
    if (dbSuggestions.productFamilies.length > 0) return dbSuggestions.productFamilies;
    return [...PRODUCT_FAMILIES];
  }, [dbSuggestions.productFamilies]);

  // ── Fetch DB-backed suggestions once on mount ──
  // This merges actual DB distinct values with lookup tables, so the Product
  // Type / Product Family dropdowns show values that actually exist in the DB
  // (fixes the "filter returns 0 results" bug).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/products?mode=suggestions');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setDbSuggestions({
          productTypes: data.productTypes || [],
          productFamilies: data.productFamilies || [],
        });
      } catch {
        // Network error — silently fall back to lookup-table values
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Debounce the smart Price input → filterPriceMin / filterPriceMax ──
  // User types freely (e.g. ">5", "1-2", "<0.5"); 300ms after they stop, we
  // parse it and write the numeric min/max to the store. The load effect then
  // picks up the change and refetches from the API.
  useEffect(() => {
    const t = setTimeout(() => {
      const { min, max } = parsePriceInput(localPriceInput);
      const newMin = min != null ? String(min) : '';
      const newMax = max != null ? String(max) : '';
      // Only update store if changed, to avoid infinite loops
      if (filterPriceMin !== newMin) setFilter('filterPriceMin', newMin);
      if (filterPriceMax !== newMax) setFilter('filterPriceMax', newMax);
    }, 300);
    return () => clearTimeout(t);
  }, [localPriceInput, parsePriceInput, filterPriceMin, filterPriceMax, setFilter]);

  // ── Debounce the smart Source Row input → filterSourceRow ──
  // The raw input string IS what we store (loadProducts parses it into min/max
  // when building the API request), but we still debounce so rapid typing
  // doesn't fire one API request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      if (filterSourceRow !== localSourceRowInput) {
        setFilter('filterSourceRow', localSourceRowInput);
        setCurrentPage(1);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [localSourceRowInput, filterSourceRow, setFilter]);

  // ── Reset dependent filters when parent changes ──
  useEffect(() => {
    if (filterDepartment && !categoryOptions.includes(filterCategory)) {
      setFilter('filterCategory', '');
      setFilter('filterSubcategory', '');
    }
  }, [filterDepartment, categoryOptions, filterCategory, setFilter]);

  useEffect(() => {
    if (filterCategory && !subcategoryOptions.includes(filterSubcategory)) {
      setFilter('filterSubcategory', '');
    }
  }, [filterCategory, subcategoryOptions, filterSubcategory, setFilter]);

  useEffect(() => {
    if (filterProductFamily && !productTypeOptions.includes(filterProductType)) {
      setFilter('filterProductType', '');
    }
  }, [filterProductFamily, productTypeOptions, filterProductType, setFilter]);

  // ── Load products (normal / search mode) ──
  useEffect(() => {
    if (groupByNd && selectedNdNumber) {
      loadProductsByNdNumber(selectedNdNumber);
    } else if (!groupByNd) {
      loadProducts();
    }
  }, [currentPage, searchQuery, filterDepartment, filterCategory, filterSubcategory, filterProductFamily, filterProductType, filterBrand, filterColor, filterMaterial, filterCountryOfOrigin, filterUnit, filterValidationStatus, filterShape, filterPriceMin, filterPriceMax, filterSourceRow, filterNdNumber, filterNameEn, filterOnlyModified, filterRecentlyAddedDays, sortBy, sortOrder, selectedNdNumber, groupByNd]);

  // ── Load ND groups when grouping is enabled ──
  useEffect(() => {
    if (groupByNd) {
      loadNdGroups();
    }
  }, [groupByNd, searchQuery]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
        sortBy,
        sortOrder,
      });
      if (searchQuery) params.set('search', searchQuery);
      if (filterDepartment) params.set('department', filterDepartment);
      if (filterCategory) params.set('category', filterCategory);
      if (filterSubcategory) params.set('subcategory', filterSubcategory);
      if (filterProductFamily) params.set('productFamily', filterProductFamily);
      if (filterProductType) params.set('productType', filterProductType);
      if (filterBrand) params.set('brand', filterBrand);
      if (filterColor) params.set('color', filterColor);
      if (filterMaterial) params.set('material', filterMaterial);
      if (filterCountryOfOrigin) params.set('countryOfOrigin', filterCountryOfOrigin);
      if (filterUnit) params.set('unit', filterUnit);
      if (filterValidationStatus) params.set('validationStatus', filterValidationStatus);
      if (filterShape) params.set('shape', filterShape);
      if (filterPriceMin) params.set('priceMin', filterPriceMin);
      if (filterPriceMax) params.set('priceMax', filterPriceMax);
      // Dedicated ND Number filter (case-insensitive partial)
      if (filterNdNumber) params.set('ndNumber', filterNdNumber);
      // Dedicated Name EN filter (case-insensitive partial, scoped to nameEn only)
      if (filterNameEn) params.set('nameEn', filterNameEn);
      // Source Row range filter — parse the raw input string into min/max
      if (filterSourceRow) {
        const { min, max } = parseSourceRowInput(filterSourceRow);
        if (min != null) params.set('sourceRowMin', String(min));
        if (max != null) params.set('sourceRowMax', String(max));
      }
      // Recently Updated filter — only show products where updatedAt > createdAt
      if (filterOnlyModified) params.set('onlyModified', '1');
      // Recently Added filter — only show products added within last N days
      if (filterRecentlyAddedDays > 0) params.set('recentlyAddedDays', String(filterRecentlyAddedDays));

      const res = await fetch(`/api/products?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products, data.total);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, filterDepartment, filterCategory, filterSubcategory, filterProductFamily, filterProductType, filterBrand, filterColor, filterMaterial, filterCountryOfOrigin, filterUnit, filterValidationStatus, filterShape, filterPriceMin, filterPriceMax, filterNdNumber, filterNameEn, filterSourceRow, filterOnlyModified, filterRecentlyAddedDays, sortBy, sortOrder, parseSourceRowInput]);

  const loadProductsByNdNumber = useCallback(async (ndNumber: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ndNumber,
        limit: '500',
        sortBy,
        sortOrder,
      });
      const res = await fetch(`/api/products?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products, data.total);
      }
    } catch (error) {
      console.error('Error loading products by ND Number:', error);
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortOrder]);

  const loadNdGroups = useCallback(async () => {
    try {
      const params = new URLSearchParams({ mode: 'nd-groups' });
      if (searchQuery) params.set('search', searchQuery);
      const res = await fetch(`/api/products?${params}`);
      if (res.ok) {
        const data = await res.json();
        setNdGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Error loading ND groups:', error);
    }
  }, [searchQuery]);

  // ── Debounced instant search ──
  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(value);
      setCurrentPage(1);
    }, 300);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setSearchQuery(localSearch);
      setCurrentPage(1);
    }
  };

  const clearSearch = () => {
    setLocalSearch('');
    setSearchQuery('');
    setSelectedNdNumber('');
    setCurrentPage(1);
  };

  const openProduct = (product: Product) => {
    setScrollPosition(window.scrollY);
    setCurrentProduct(product);
    setView('product-detail');
  };

  // ── Restore scroll position when returning from edit/save ──
  useEffect(() => {
    if (scrollPosition > 0 && products.length > 0 && !isLoading) {
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPosition);
        setScrollPosition(0);
      });
    }
  }, [products, isLoading, scrollPosition]);

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const handleGroupToggle = () => {
    if (groupByNd) {
      setGroupByNd(false);
      setSelectedNdNumber('');
      setProducts([], 0);
    } else {
      setGroupByNd(true);
      setSelectedNdNumber('');
    }
  };

  const handleGroupClick = (ndNumber: string) => {
    if (selectedNdNumber === ndNumber) {
      setSelectedNdNumber('');
      setProducts([], 0);
    } else {
      setSelectedNdNumber(ndNumber);
      toggleGroup(ndNumber);
    }
  };

  // ── Sort options ──
  // NOTE: "Recently Added" and "Recently Updated" are NOT sort options here.
  // They are FILTER toggles (see the main toolbar buttons below). Sorting by
  // updatedAt/createdAt alone would show ALL products, not just the modified
  // ones — which is why they were moved out of this dropdown.
  const sortOptions: { value: SortBy; label: string }[] = [
    { value: 'sourceRow', label: 'Source Row' },
    { value: 'ndNumber', label: 'ND Number' },
    { value: 'nameEn', label: 'Name EN' },
    { value: 'productType', label: 'Product Type' },
    { value: 'productFamily', label: 'Product Family' },
    { value: 'defaultPrice', label: 'Default Price' },
  ];

  // ── Column visibility toggle ──
  // Every column is toggleable — there are no fixed columns. The user can
  // hide any column (including Source Row, ND Number, Barcode, Name EN) and
  // show any column. We only prevent hiding the LAST visible column so the
  // table never becomes completely empty.
  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => {
      // If currently visible, hide it — unless it's the only visible column
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev; // keep at least 1 column
        return prev.filter(k => k !== key);
      }
      // If currently hidden, show it
      return [...prev, key];
    });
  };

  // ── Export handlers ──
  const downloadBlob = async (url: string, filename: string) => {
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Export failed');
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  const handleExportAll = async () => {
    setIsExporting(true);
    setShowExportMenu(false);
    try {
      await downloadBlob('/api/products/export', 'products_export.xlsx');
    } catch (err: any) {
      toast.error(err.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportByRange = async () => {
    setSrRangeError('');

    const trimmed = srRange.trim();
    const match = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (!match) {
      setSrRangeError('Invalid format. Use: 1-7, 25-40');
      return;
    }

    const from = parseInt(match[1], 10);
    const to = parseInt(match[2], 10);

    if (from > to) {
      setSrRangeError('Start cannot be greater than end.');
      return;
    }

    setIsExporting(true);
    try {
      await downloadBlob(
        `/api/products/export?srFrom=${from}&srTo=${to}`,
        `products_sr_${from}_${to}.xlsx`,
      );
      setShowExportMenu(false);
      setSrRange('');
    } catch (err: any) {
      toast.error(err.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearFilters = () => {
    clearFilters();
    setLocalSearch('');
    setLocalPriceInput('');
    setLocalSourceRowInput('');
    setSelectedNdNumber('');
    setCurrentPage(1);
  };

  const activeFiltersCount = useMemo(() => {
    return [
      filterDepartment, filterCategory, filterSubcategory, filterProductFamily,
      filterProductType, filterBrand, filterColor, filterMaterial,
      filterCountryOfOrigin, filterUnit, filterValidationStatus, filterShape,
      filterPriceMin, filterPriceMax,
      // New dedicated field filters
      filterSourceRow, filterNdNumber, filterNameEn,
      // Recently Updated / Recently Added toggles
      filterOnlyModified ? '1' : '',
      filterRecentlyAddedDays > 0 ? String(filterRecentlyAddedDays) : '',
    ].filter(v => v && v.trim() !== '').length;
  }, [filterDepartment, filterCategory, filterSubcategory, filterProductFamily, filterProductType, filterBrand, filterColor, filterMaterial, filterCountryOfOrigin, filterUnit, filterValidationStatus, filterShape, filterPriceMin, filterPriceMax, filterSourceRow, filterNdNumber, filterNameEn, filterOnlyModified, filterRecentlyAddedDays]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
      if (columnMenuRef.current && !columnMenuRef.current.contains(e.target as Node)) {
        setShowColumnMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-4 pb-6">
      {/* Header - improved for mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setView('dashboard')} 
            className="h-11 w-11 p-0 shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-truncate">Products</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {groupByNd && selectedNdNumber
                ? `${totalProducts} in ND ${selectedNdNumber}`
                : groupByNd
                  ? `${ndGroups.length} ND groups`
                  : `${totalProducts} total`}
            </p>
          </div>
        </div>
        
        {/* Actions - right aligned on desktop */}
        <div className="flex items-center gap-2 sm:ml-auto">
          <div className="relative" ref={exportMenuRef}>
            <Button
              variant="outline"
              size="sm"
              className="h-11 px-3"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={isExporting}
            >
              {isExporting ? (
                <span className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full" />
              ) : (
                <Download className="h-5 w-5" />
              )}
              <span className="ml-1 hidden sm:inline text-xs">Export</span>
            </Button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 w-72 bg-popover border rounded-lg shadow-lg p-3 space-y-3">
                <p className="text-sm font-medium">Export Excel</p>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start h-11"
                  onClick={handleExportAll}
                  disabled={isExporting}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Export All Products
                </Button>

                <div className="border-t" />

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Export by SR Range</p>
                  <Input
                    placeholder="e.g. 1-7, 25-40"
                    value={srRange}
                    onChange={(e) => { setSrRange(e.target.value); setSrRangeError(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleExportByRange(); }}
                    className="h-11 text-sm"
                    disabled={isExporting}
                  />
                  {srRangeError && <p className="text-xs text-destructive">{srRangeError}</p>}
                  <Button
                    size="sm"
                    className="w-full h-11"
                    onClick={handleExportByRange}
                    disabled={isExporting || !srRange.trim()}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Range
                  </Button>
                </div>
              </div>
            )}
          </div>
          <Button 
            size="sm" 
            onClick={() => setView('add-product')} 
            className="h-11 px-3 sm:px-4"
          >
            <Plus className="h-5 w-5 sm:h-4 sm:w-4" />
            <span className="ml-1 text-xs sm:text-sm">Add</span>
          </Button>
        </div>
      </div>

      {/* Search Bar - responsive layout */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search ND, Barcode, ID, SKU, Name, Brand..."
            className="h-11 pl-9 pr-9 text-sm"
          />
          {localSearch && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        
        {/* Scanner buttons - stack on very small screens */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBarcodeScanner(true)}
            className="h-11 px-3 sm:px-4 shrink-0 gap-1.5 flex-1 sm:flex-none"
            title="Scan Barcode"
          >
            <ScanBarcode className="h-5 w-5" />
            <span className="text-xs">Scan</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPhotoCapture(true)}
            className="h-11 px-3 sm:px-4 shrink-0 gap-1.5 flex-1 sm:flex-none"
            title="Capture Barcode Photo"
          >
            <Camera className="h-5 w-5" />
            <span className="text-xs">Photo</span>
          </Button>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      {showBarcodeScanner && (
        <BarcodeScanner
          onScan={(barcode) => {
            setShowBarcodeScanner(false);
            setLocalSearch(barcode);
            setSearchQuery(barcode);
            setCurrentPage(1);
          }}
          onClose={() => setShowBarcodeScanner(false)}
        />
      )}

      {/* Barcode Photo Capture Modal */}
      {showPhotoCapture && (
        <BarcodePhotoCapture
          onScan={(barcode) => {
            setShowPhotoCapture(false);
            setLocalSearch(barcode);
            setSearchQuery(barcode);
            setCurrentPage(1);
          }}
          onClose={() => setShowPhotoCapture(false)}
        />
      )}

      {/* Search result info */}
      {searchQuery && !groupByNd && totalProducts > 0 && (
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <Badge variant="secondary" className="font-normal">
            <Search className="h-3 w-3 mr-1" />
            {totalProducts} matching
          </Badge>
          {(() => {
            const ndMatches = products.filter(p =>
              p.ndNumber?.toLowerCase().includes(searchQuery.toLowerCase())
            );
            if (ndMatches.length > 0) {
              const uniqueNdNumbers = [...new Set(ndMatches.map(p => p.ndNumber))];
              return (
                <Badge variant="outline" className="font-normal bg-amber-50 border-amber-300 text-amber-800">
                  <Layers className="h-3 w-3 mr-1" />
                  {ndMatches.length} in {uniqueNdNumbers.length} ND groups
                </Badge>
              );
            }
            return null;
          })()}
        </div>
      )}

      {/* Controls row - improved responsive layout */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Sort */}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
          <SelectTrigger className="h-11 w-full sm:w-[140px] text-xs">
            <ArrowUpDown className="h-4 w-4 mr-1" />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleSortOrder}
          className="h-11 w-11 p-0"
        >
          {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
        </Button>

        {/* Group by ND Number */}
        <Button
          variant={groupByNd ? 'default' : 'outline'}
          size="sm"
          onClick={handleGroupToggle}
          className="h-11 text-xs px-3"
        >
          <Layers className="h-4 w-4 mr-1" />
          {groupByNd ? 'Grouped' : 'Group'}
        </Button>

        {/* Column visibility */}
        <div className="relative" ref={columnMenuRef}>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-11 text-xs px-3"
            onClick={() => setShowColumnMenu(!showColumnMenu)}
          >
            <Columns3 className="h-4 w-4 mr-1" />
            Columns
          </Button>
          
          {showColumnMenu && (
            <div className="absolute left-0 top-full mt-1 z-50 w-56 bg-popover border rounded-lg shadow-lg p-2">
              <div className="flex items-center justify-between px-2 py-1.5">
                <p className="text-xs font-medium text-muted-foreground">Visible Columns</p>
                <span className="text-[10px] text-muted-foreground">{visibleColumns.length}/{DEFAULT_COLUMNS.length}</span>
              </div>
              <div className="border-t" />
              <div className="py-1 max-h-[300px] overflow-y-auto">
                {DEFAULT_COLUMNS.map(col => {
                  const isVisible = visibleColumns.includes(col.key);
                  const isLastVisible = isVisible && visibleColumns.length <= 1;
                  return (
                    <button
                      key={col.key}
                      onClick={() => toggleColumn(col.key)}
                      disabled={isLastVisible}
                      className={`flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded transition-colors ${
                        isLastVisible
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-accent'
                      }`}
                      title={isLastVisible ? 'Cannot hide the last visible column' : undefined}
                    >
                      <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                        isVisible
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-input'
                      }`}>
                        {isVisible && (
                          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span>{col.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Filters toggle */}
        <Button
          variant={showFilters ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="h-11 text-xs px-3"
        >
          <SlidersHorizontal className="h-4 w-4 mr-1" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        {/* Recently Updated — FILTER toggle (not a sort).
            When ON: only shows products where updatedAt > createdAt (actually
            edited after creation), sorted by updatedAt DESC. So if you edit
            A, then B, then C, the list shows C, B, A (most recent edit first). */}
        <Button
          variant={filterOnlyModified ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setFilter('filterOnlyModified', !filterOnlyModified);
            if (!filterOnlyModified && filterRecentlyAddedDays > 0) {
              setFilter('filterRecentlyAddedDays', 0);
            }
            setCurrentPage(1);
          }}
          className="h-11 text-xs px-3"
        >
          Recently Updated
          {filterOnlyModified && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">ON</Badge>}
        </Button>

        {/* Recently Added — FILTER (not a sort).
            Cycles through: off → 1 day → 7 days → 30 days → off.
            When ON: only shows products added within the last N days, sorted
            by createdAt DESC (newest addition first). */}
        <Button
          variant={filterRecentlyAddedDays > 0 ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            // Cycle: 0 → 1 → 7 → 30 → 0
            const next = filterRecentlyAddedDays === 0 ? 1
                       : filterRecentlyAddedDays === 1 ? 7
                       : filterRecentlyAddedDays === 7 ? 30
                       : 0;
            setFilter('filterRecentlyAddedDays', next);
            if (next > 0 && filterOnlyModified) {
              setFilter('filterOnlyModified', false);
            }
            setCurrentPage(1);
          }}
          className="h-11 text-xs px-3"
        >
          Recently Added
          {filterRecentlyAddedDays > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {filterRecentlyAddedDays}d
            </Badge>
          )}
        </Button>
      </div>

      {/* Filters Panel - improved responsive grid */}
      {showFilters && (
        <Card>
          <CardContent className="pt-4 pb-4 px-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Filters</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-9 text-xs"
                disabled={activeFiltersCount === 0}
              >
                Clear All
              </Button>
            </div>
            
            {/* Field Filters — Source Row / ND Number / Name EN / Default Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Source Row</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="100  or  100-500  or  >100  or  <500"
                  value={localSourceRowInput}
                  onChange={(e) => setLocalSourceRowInput(e.target.value)}
                  className="h-11"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">ND Number</label>
                <Input
                  type="text"
                  placeholder="ND-6605  or  6605  (partial)"
                  value={filterNdNumber}
                  onChange={(e) => { setFilter('filterNdNumber', e.target.value); setCurrentPage(1); }}
                  className="h-11"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Name EN</label>
                <Input
                  type="text"
                  placeholder="knife, container, rolling pin..."
                  value={filterNameEn}
                  onChange={(e) => { setFilter('filterNameEn', e.target.value); setCurrentPage(1); }}
                  className="h-11"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Default Price (KD)</label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="1  or  1-2  or  >5  or  <0.5"
                  value={localPriceInput}
                  onChange={(e) => setLocalPriceInput(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>

            {/* Taxonomy Filters - responsive grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <SearchableSingleSelect
                label="Department"
                value={filterDepartment}
                onChange={(v) => { setFilter('filterDepartment', v); setCurrentPage(1); }}
                suggestions={DEPARTMENTS}
                placeholder="All"
              />
              <SearchableSingleSelect
                label="Category"
                value={filterCategory}
                onChange={(v) => { setFilter('filterCategory', v); setCurrentPage(1); }}
                suggestions={categoryOptions}
                placeholder="All"
              />
              <SearchableSingleSelect
                label="Subcategory"
                value={filterSubcategory}
                onChange={(v) => { setFilter('filterSubcategory', v); setCurrentPage(1); }}
                suggestions={subcategoryOptions}
                placeholder="All"
              />
              <SearchableSingleSelect
                label="Product Family"
                value={filterProductFamily}
                onChange={(v) => { setFilter('filterProductFamily', v); setCurrentPage(1); }}
                suggestions={productFamilyOptions}
                placeholder="All"
              />
            </div>

            {/* Attribute Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <SearchableSingleSelect
                label="Product Type"
                value={filterProductType}
                onChange={(v) => { setFilter('filterProductType', v); setCurrentPage(1); }}
                suggestions={productTypeOptions}
                placeholder="All"
              />
              <SearchableSingleSelect
                label="Brand"
                value={filterBrand}
                onChange={(v) => { setFilter('filterBrand', v); setCurrentPage(1); }}
                suggestions={BRAND_OPTIONS}
                placeholder="All"
              />
              <SearchableSingleSelect
                label="Color"
                value={filterColor}
                onChange={(v) => { setFilter('filterColor', v); setCurrentPage(1); }}
                suggestions={COLOR_OPTIONS}
                placeholder="All"
              />
              <SearchableSingleSelect
                label="Material"
                value={filterMaterial}
                onChange={(v) => { setFilter('filterMaterial', v); setCurrentPage(1); }}
                suggestions={MATERIAL_OPTIONS}
                placeholder="All"
              />
            </div>

            {/* Logistics & Status Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <SearchableSingleSelect
                label="Origin"
                value={filterCountryOfOrigin}
                onChange={(v) => { setFilter('filterCountryOfOrigin', v); setCurrentPage(1); }}
                suggestions={[...COUNTRY_OPTIONS]}
                placeholder="All"
              />
              <SearchableSingleSelect
                label="Unit"
                value={filterUnit}
                onChange={(v) => { setFilter('filterUnit', v); setCurrentPage(1); }}
                suggestions={[...UNIT_OPTIONS]}
                placeholder="All"
              />
              <SearchableSingleSelect
                label="Status"
                value={filterValidationStatus}
                onChange={(v) => { setFilter('filterValidationStatus', v); setCurrentPage(1); }}
                suggestions={[...VALIDATION_STATUS_OPTIONS]}
                placeholder="All"
              />
              <SearchableSingleSelect
                label="Shape"
                value={filterShape}
                onChange={(v) => { setFilter('filterShape', v); setCurrentPage(1); }}
                suggestions={[...SHAPE_OPTIONS]}
                placeholder="All"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Group by ND Number View ── */}
      {groupByNd && !selectedNdNumber ? (
        isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : ndGroups.length === 0 ? (
          <div className="text-center py-12">
            <Layers className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No ND Number groups found</p>
            {searchQuery && (
              <Button variant="outline" className="mt-4 h-11" onClick={clearSearch}>
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {ndGroups.map((group) => (
              <Card
                key={group.ndNumber}
                className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
                onClick={() => handleGroupClick(group.ndNumber)}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-3">
                    {expandedGroups.has(group.ndNumber) ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base">
                        {searchQuery ? (
                          <HighlightedText text={group.ndNumber} highlight={searchQuery} />
                        ) : (
                          group.ndNumber
                        )}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs sm:text-sm">
                      {group.count}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : null}

      {/* ── Products in selected ND group ── */}
      {groupByNd && selectedNdNumber && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSelectedNdNumber(''); setProducts([], 0); }}
              className="h-11 px-3"
            >
              <ChevronLeft className="h-5 w-5 mr-1" />
              Back
            </Button>
            <Badge variant="secondary" className="font-medium text-xs sm:text-sm">
              ND {selectedNdNumber} — {totalProducts}
            </Badge>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            /* Mobile-friendly card list + desktop table */
            <div className="hidden sm:block overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                    {DEFAULT_COLUMNS.filter(c => visibleColumns.includes(c.key)).map(col => (
                      <th key={col.key} className="py-3 px-3 text-left font-medium whitespace-nowrap">{col.label}</th>
                    ))}
                    <th className="py-3 px-3 text-left font-medium whitespace-nowrap w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {products.map((product) => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      searchQuery={searchQuery}
                      visibleColumns={visibleColumns}
                      onView={() => openProduct(product)}
                      onEdit={() => { setCurrentProduct(product); setView('edit-product'); }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Mobile card view */}
          {!isLoading && products.length > 0 && (
            <div className="sm:hidden space-y-2">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  searchQuery={searchQuery}
                  onClick={() => openProduct(product)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Normal Product List (no grouping) ── */}
      {!groupByNd && (
        isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 sm:h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : products.length === 0 && totalProducts === 0 ? (
          <div className="text-center py-12 sm:py-16">
            <ImageIcon className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-base sm:text-lg font-medium text-muted-foreground">No products found</p>
            <p className="text-sm text-muted-foreground mt-1">Import an Excel file to begin.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <Button onClick={() => setView('import')} className="h-11 w-full sm:w-auto">
                <Upload className="h-4 w-4 mr-2" />
                Import Excel
              </Button>
              <Button variant="outline" onClick={() => setView('add-product')} className="h-11 w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <ScanBarcode className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              {searchQuery && /^\d+$/.test(searchQuery)
                ? `No product for barcode ${searchQuery}`
                : 'No matching products'}
            </p>
            <Button variant="outline" className="mt-4 h-11" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop table view */}
            <div className="hidden sm:block overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                    {DEFAULT_COLUMNS.filter(c => visibleColumns.includes(c.key)).map(col => (
                      <th key={col.key} className="py-3 px-3 text-left font-medium whitespace-nowrap">{col.label}</th>
                    ))}
                    <th className="py-3 px-3 text-left font-medium whitespace-nowrap w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {products.map((product) => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      searchQuery={searchQuery}
                      visibleColumns={visibleColumns}
                      onView={() => openProduct(product)}
                      onEdit={() => { setCurrentProduct(product); setView('edit-product'); }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Mobile card view */}
            <div className="sm:hidden space-y-2">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  searchQuery={searchQuery}
                  onClick={() => openProduct(product)}
                />
              ))}
            </div>
          </>
        )
      )}

      {/* Pagination - larger touch targets */}
      {!groupByNd && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
          <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
            Page {currentPage} of {totalPages} • {totalProducts} products
          </p>
          <div className="flex gap-2 w-full sm:w-auto justify-center">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="h-11 px-4 flex-1 sm:flex-none"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="h-11 px-4 flex-1 sm:flex-none"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Product Table Row ──
function ProductRow({
  product,
  searchQuery,
  visibleColumns,
  onView,
  onEdit,
}: {
  product: Product;
  searchQuery: string;
  visibleColumns: string[];
  onView: () => void;
  onEdit: () => void;
}) {
  const renderCell = (key: string) => {
    const value = product[key as keyof Product];
    
    switch (key) {
      case 'sourceRow':
        return (
          <span className="text-xs font-mono">
            {product.sourceRow ?? '-'}
          </span>
        );
      case 'productId':
        return (
          <span className="text-xs font-mono text-truncate max-w-[100px] block">
            {product.productId || '-'}
          </span>
        );
      case 'sku':
        return (
          <span className="text-xs font-mono text-truncate max-w-[100px] block">
            {product.sku || '-'}
          </span>
        );
      case 'ndNumber':
        return (
          <Badge 
            variant="outline" 
            className={`text-xs h-5 px-1.5 font-mono ${
              searchQuery && product.ndNumber?.toLowerCase().includes(searchQuery.toLowerCase())
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : ''
            }`}
          >
            {searchQuery && product.ndNumber ? (
              <HighlightedText text={product.ndNumber} highlight={searchQuery} />
            ) : (
              product.ndNumber || '-'
            )}
          </Badge>
        );
      case 'barcode':
        return (
          <span className="text-xs font-mono">
            {searchQuery && product.barcode ? (
              <HighlightedText text={product.barcode} highlight={searchQuery} />
            ) : (
              product.barcode || '-'
            )}
          </span>
        );
      case 'nameEn':
        return (
          <div className="min-w-0 max-w-[200px]">
            <p className="text-sm font-medium text-truncate">
              {searchQuery && product.nameEn ? (
                <HighlightedText text={product.nameEn} highlight={searchQuery} />
              ) : (
                product.nameEn || product.ndNumber || (product.sourceRow != null ? `Item #${product.sourceRow}` : 'Unnamed')
              )}
            </p>
            {product.nameAr && (
              <p className="text-xs text-muted-foreground text-truncate" dir="rtl">
                {product.nameAr}
              </p>
            )}
          </div>
        );
      case 'brand':
        return (
          <Badge variant="secondary" className="text-xs h-5 px-1.5">
            {product.brand || '-'}
          </Badge>
        );
      case 'productType':
        return (
          <span className="text-xs text-truncate max-w-[120px] block">
            {product.productType || '-'}
          </span>
        );
      case 'productFamily':
        return (
          <span className="text-xs text-truncate max-w-[100px] block">
            {product.productFamily || '-'}
          </span>
        );
      case 'material':
        return (
          <Badge variant="outline" className="text-xs h-5 px-1.5">
            {product.material || '-'}
          </Badge>
        );
      case 'color':
        return (
          <Badge variant="outline" className="text-xs h-5 px-1.5">
            {product.color || '-'}
          </Badge>
        );
      case 'countryOfOrigin':
        return (
          <Badge variant="outline" className="text-xs h-5 px-1.5">
            {product.countryOfOrigin || '-'}
          </Badge>
        );
      case 'defaultPrice':
        return (
          <span className="text-sm font-semibold">
            {formatPrice(product.defaultPrice)}
          </span>
        );
      case 'pieces':
        return (
          <Badge variant="outline" className="text-xs h-5 px-1.5">
            {product.pieces != null ? `${product.pieces} pcs` : '-'}
          </Badge>
        );
      default:
        // Handle special types that can't be rendered directly
        if (Array.isArray(value)) {
          return <span className="text-xs">-</span>;
        }
        if (typeof value === 'object' && value !== null) {
          return <span className="text-xs">-</span>;
        }
        return <span className="text-xs">{String(value ?? '-')}</span>;
    }
  };

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      {/* IMPORTANT: iterate columns in DEFAULT_COLUMNS order (filtered by
          visibleColumns), NOT in visibleColumns array order. The <th> headers
          above use DEFAULT_COLUMNS.filter(...).map(...), so the cells MUST use
          the same ordering — otherwise headers and values misalign (e.g. the
          "Price" header ends up above "Product Family" values) when the user
          toggles columns on in a different order than DEFAULT_COLUMNS. */}
      {DEFAULT_COLUMNS.filter(c => visibleColumns.includes(c.key)).map(col => (
        <td key={col.key} className="py-3 px-3">
          {renderCell(col.key)}
        </td>
      ))}
      <td className="py-3 px-3">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onView}
            className="h-9 w-9 p-0"
            title="View"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-9 w-9 p-0"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ── Product Card (for mobile view) ──
function ProductCard({
  product,
  searchQuery,
  onClick,
}: {
  product: Product;
  searchQuery: string;
  onClick: () => void;
}) {
  const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex gap-3">
          {/* Thumbnail */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-muted shrink-0">
            {primaryImage ? (
              <img
                src={primaryImage.imageUrl}
                alt="Product"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground/50" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-truncate">
                  {searchQuery && product.nameEn ? (
                    <HighlightedText text={product.nameEn} highlight={searchQuery} />
                  ) : (
                    product.nameEn || product.ndNumber || (product.sourceRow != null ? `Item #${product.sourceRow}` : 'Unnamed')
                  )}
                </p>
                {product.nameAr && (
                  <p className="text-xs text-muted-foreground text-truncate" dir="rtl">
                    {product.nameAr}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-sm">
                  {formatPrice(product.defaultPrice)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {product.ndNumber && (
                <Badge
                  variant="outline"
                  className={`text-[10px] h-5 px-1.5 ${
                    searchQuery && product.ndNumber.toLowerCase().includes(searchQuery.toLowerCase())
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : ''
                  }`}
                >
                  {product.ndNumber}
                </Badge>
              )}
              {product.barcode && (
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-mono">
                  {product.barcode}
                </Badge>
              )}
              {product.brand && (
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                  {product.brand}
                </Badge>
              )}
              {product.images.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                  {product.images.length} img
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}