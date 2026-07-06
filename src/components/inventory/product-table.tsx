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
  Trash2,
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
  
  const totalPages = Math.ceil(totalProducts / 50);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // ── Dependent filter options ──
  const categoryOptions = useMemo(() => getCategoriesForDepartment(filterDepartment), [filterDepartment]);
  const subcategoryOptions = useMemo(() => getSubcategoriesForCategory(filterDepartment, filterCategory), [filterDepartment, filterCategory]);
  const productTypeOptions = useMemo(() => getTypesForFamily(filterProductFamily), [filterProductFamily]);

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
  }, [currentPage, searchQuery, filterDepartment, filterCategory, filterSubcategory, filterProductFamily, filterProductType, filterBrand, filterColor, filterMaterial, filterCountryOfOrigin, filterUnit, filterValidationStatus, filterShape, filterPriceMin, filterPriceMax, sortBy, sortOrder, selectedNdNumber, groupByNd]);

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
  }, [currentPage, searchQuery, filterDepartment, filterCategory, filterSubcategory, filterProductFamily, filterProductType, filterBrand, filterColor, filterMaterial, filterCountryOfOrigin, filterUnit, filterValidationStatus, filterShape, filterPriceMin, filterPriceMax, sortBy, sortOrder]);

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
  const sortOptions: { value: SortBy; label: string }[] = [
    { value: 'sourceRow', label: 'Source Row' },
    { value: 'ndNumber', label: 'ND Number' },
    { value: 'nameEn', label: 'Name EN' },
    { value: 'productType', label: 'Product Type' },
    { value: 'productFamily', label: 'Product Family' },
    { value: 'defaultPrice', label: 'Default Price' },
    { value: 'recentlyAdded', label: 'Recently Added' },
    { value: 'recentlyUpdated', label: 'Recently Updated' },
  ];

  // ── Column visibility toggle ──
  const toggleColumn = (key: string) => {
    if (DEFAULT_COLUMNS.find(c => c.key === key)?.alwaysVisible) return;
    setVisibleColumns(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
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
      setSrRangeError('Invalid format. Use: 1-7, 25-40, 100-150');
      return;
    }

    const from = parseInt(match[1], 10);
    const to = parseInt(match[2], 10);

    if (from > to) {
      setSrRangeError('Start number cannot be greater than end number.');
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
    setSearchQuery('');
    setSelectedNdNumber('');
    setCurrentPage(1);
  };

  const activeFiltersCount = useMemo(() => {
    return [
      filterDepartment, filterCategory, filterSubcategory, filterProductFamily,
      filterProductType, filterBrand, filterColor, filterMaterial,
      filterCountryOfOrigin, filterUnit, filterValidationStatus, filterShape,
      filterPriceMin, filterPriceMax
    ].filter(v => v && v.trim() !== '').length;
  }, [filterDepartment, filterCategory, filterSubcategory, filterProductFamily, filterProductType, filterBrand, filterColor, filterMaterial, filterCountryOfOrigin, filterUnit, filterValidationStatus, filterShape, filterPriceMin, filterPriceMax]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setView('dashboard')} className="h-9 w-9 p-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground">
            {groupByNd && selectedNdNumber
              ? `${totalProducts} products in ND ${selectedNdNumber}`
              : groupByNd
                ? `${ndGroups.length} ND groups`
                : `${totalProducts} total`}
          </p>
        </div>
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={isExporting}
          >
            {isExporting ? (
              <span className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>

          {showExportMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => { setShowExportMenu(false); setSrRangeError(''); }} />
              <div className="absolute right-0 top-full mt-1 z-50 w-72 bg-popover border rounded-lg shadow-lg p-3 space-y-3">
                <p className="text-sm font-medium">Export Excel</p>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start h-9"
                  onClick={handleExportAll}
                  disabled={isExporting}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Export All Products
                </Button>

                <div className="border-t" />

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Export by Serial Number Range</p>
                  <Input
                    placeholder="e.g. 1-7, 25-40, 100-150"
                    value={srRange}
                    onChange={(e) => { setSrRange(e.target.value); setSrRangeError(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleExportByRange(); }}
                    className="h-9 text-sm"
                    disabled={isExporting}
                  />
                  {srRangeError && (
                    <p className="text-xs text-destructive">{srRangeError}</p>
                  )}
                  <Button
                    size="sm"
                    className="w-full h-9"
                    onClick={handleExportByRange}
                    disabled={isExporting || !srRange.trim()}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Range
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
        <Button size="sm" onClick={() => setView('add-product')} className="h-9">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search by ND Number, Barcode, Product ID, SKU, Name, Brand, Type, Model, SEO Title..."
            className="h-11 pl-9 pr-9"
          />
          {localSearch && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowBarcodeScanner(true)}
          className="h-11 px-3 shrink-0 gap-1.5"
          title="Scan Barcode"
        >
          <ScanBarcode className="h-5 w-5" />
          <span className="text-xs">Scan</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPhotoCapture(true)}
          className="h-11 px-3 shrink-0 gap-1.5"
          title="Capture Barcode Photo"
        >
          <Camera className="h-5 w-5" />
          <span className="text-xs">Photo</span>
        </Button>
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
            {totalProducts} matching product{totalProducts !== 1 ? 's' : ''}
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
                  {ndMatches.length} product{ndMatches.length !== 1 ? 's' : ''} in {uniqueNdNumbers.length} ND group{uniqueNdNumbers.length !== 1 ? 's' : ''}
                </Badge>
              );
            }
            return null;
          })()}
        </div>
      )}

      {/* Controls row: Sort + Group toggle + Columns + Filters toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="h-9 w-[160px] text-xs">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
              <SelectValue placeholder="Sort by" />
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
            className="h-9 w-9 p-0"
          >
            {sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Group by ND Number */}
        <Button
          variant={groupByNd ? 'default' : 'outline'}
          size="sm"
          onClick={handleGroupToggle}
          className="h-9 text-xs"
        >
          <Layers className="h-3.5 w-3.5 mr-1.5" />
          {groupByNd ? 'Grouped' : 'Group by ND'}
        </Button>

        {/* Column visibility */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 text-xs">
              <Columns3 className="h-3.5 w-3.5 mr-1.5" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel className="text-xs">Visible Columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {DEFAULT_COLUMNS.map(col => (
              <DropdownMenuCheckboxItem
                key={col.key}
                checked={visibleColumns.includes(col.key)}
                onCheckedChange={() => toggleColumn(col.key)}
                disabled={col.alwaysVisible}
                className="text-xs"
              >
                {col.label}
                {col.alwaysVisible && <span className="ml-1 text-muted-foreground">(always)</span>}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Filters toggle */}
        <Button
          variant={showFilters ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="h-9 text-xs"
        >
          <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Filters</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-7 text-xs"
                disabled={activeFiltersCount === 0}
              >
                Clear All
              </Button>
            </div>
            
            {/* Taxonomy Filters - Row 1 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              <SearchableSingleSelect
                label="Department"
                value={filterDepartment}
                onChange={(v) => setFilter('filterDepartment', v)}
                suggestions={DEPARTMENTS}
                placeholder="All departments"
              />
              <SearchableSingleSelect
                label="Category"
                value={filterCategory}
                onChange={(v) => setFilter('filterCategory', v)}
                suggestions={categoryOptions}
                placeholder="All categories"
              />
              <SearchableSingleSelect
                label="Subcategory"
                value={filterSubcategory}
                onChange={(v) => setFilter('filterSubcategory', v)}
                suggestions={subcategoryOptions}
                placeholder="All subcategories"
              />
              <SearchableSingleSelect
                label="Product Family"
                value={filterProductFamily}
                onChange={(v) => setFilter('filterProductFamily', v)}
                suggestions={[...PRODUCT_FAMILIES]}
                placeholder="All families"
              />
            </div>

            {/* Attribute Filters - Row 2 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              <SearchableSingleSelect
                label="Product Type"
                value={filterProductType}
                onChange={(v) => setFilter('filterProductType', v)}
                suggestions={productTypeOptions}
                placeholder="All types"
              />
              <SearchableSingleSelect
                label="Brand"
                value={filterBrand}
                onChange={(v) => setFilter('filterBrand', v)}
                suggestions={BRAND_OPTIONS}
                placeholder="All brands"
              />
              <SearchableSingleSelect
                label="Color"
                value={filterColor}
                onChange={(v) => setFilter('filterColor', v)}
                suggestions={COLOR_OPTIONS}
                placeholder="All colors"
              />
              <SearchableSingleSelect
                label="Material"
                value={filterMaterial}
                onChange={(v) => setFilter('filterMaterial', v)}
                suggestions={MATERIAL_OPTIONS}
                placeholder="All materials"
              />
            </div>

            {/* Logistics & Status Filters - Row 3 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              <SearchableSingleSelect
                label="Country of Origin"
                value={filterCountryOfOrigin}
                onChange={(v) => setFilter('filterCountryOfOrigin', v)}
                suggestions={[...COUNTRY_OPTIONS]}
                placeholder="All countries"
              />
              <SearchableSingleSelect
                label="Unit"
                value={filterUnit}
                onChange={(v) => setFilter('filterUnit', v)}
                suggestions={[...UNIT_OPTIONS]}
                placeholder="All units"
              />
              <SearchableSingleSelect
                label="Validation Status"
                value={filterValidationStatus}
                onChange={(v) => setFilter('filterValidationStatus', v)}
                suggestions={[...VALIDATION_STATUS_OPTIONS]}
                placeholder="All statuses"
              />
              <SearchableSingleSelect
                label="Shape"
                value={filterShape}
                onChange={(v) => setFilter('filterShape', v)}
                suggestions={[...SHAPE_OPTIONS]}
                placeholder="All shapes"
              />
            </div>

            {/* Price Range */}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Min Price (KD)</label>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="0.000"
                  value={filterPriceMin}
                  onChange={(e) => setFilter('filterPriceMin', e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Max Price (KD)</label>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="999.999"
                  value={filterPriceMax}
                  onChange={(e) => setFilter('filterPriceMax', e.target.value)}
                  className="h-11"
                />
              </div>
            </div>

            <Button onClick={() => setCurrentPage(1)} className="w-full h-10">
              Apply Filters
            </Button>
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
              <Button variant="outline" className="mt-4" onClick={clearSearch}>
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
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    {expandedGroups.has(group.ndNumber) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">
                        {searchQuery ? (
                          <HighlightedText text={group.ndNumber} highlight={searchQuery} />
                        ) : (
                          group.ndNumber
                        )}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {group.count} product{group.count !== 1 ? 's' : ''}
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
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSelectedNdNumber(''); setProducts([], 0); }}
              className="h-8 px-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Groups
            </Button>
            <Badge variant="secondary" className="font-medium">
              ND {selectedNdNumber} — {totalProducts} product{totalProducts !== 1 ? 's' : ''}
            </Badge>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    {DEFAULT_COLUMNS.filter(c => visibleColumns.includes(c.key)).map(col => (
                      <th key={col.key} className="py-2 px-2 text-left font-medium whitespace-nowrap">{col.label}</th>
                    ))}
                    <th className="py-2 px-2 text-left font-medium whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
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
        </div>
      )}

      {/* ── Normal Product List (no grouping) ── */}
      {!groupByNd && (
        isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : products.length === 0 && totalProducts === 0 ? (
          <div className="text-center py-16">
            <ImageIcon className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No products found</p>
            <p className="text-sm text-muted-foreground mt-1">Import an Excel file to begin.</p>
            <div className="flex gap-3 justify-center mt-6">
              <Button onClick={() => setView('import')}>
                <Upload className="h-4 w-4 mr-2" />
                Import Excel
              </Button>
              <Button variant="outline" onClick={() => setView('add-product')}>
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
                ? `No product found for barcode ${searchQuery}`
                : 'No products match your search'}
            </p>
            <Button variant="outline" className="mt-4" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[900px]">
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
        )
      )}

      {/* Pagination */}
      {!groupByNd && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages} ({totalProducts} products)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="h-8"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="h-8"
            >
              Next
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
  const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];

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
          <span className="text-xs font-mono truncate max-w-[100px] block">
            {product.productId || '-'}
          </span>
        );
      case 'sku':
        return (
          <span className="text-xs font-mono truncate max-w-[100px] block">
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
            <p className="text-sm font-medium truncate">
              {searchQuery && product.nameEn ? (
                <HighlightedText text={product.nameEn} highlight={searchQuery} />
              ) : (
                product.nameEn || product.ndNumber || (product.sourceRow != null ? `Item #${product.sourceRow}` : 'Unnamed')
              )}
            </p>
            {product.nameAr && (
              <p className="text-xs text-muted-foreground truncate" dir="rtl">
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
          <span className="text-xs truncate max-w-[120px] block">
            {product.productType || '-'}
          </span>
        );
      case 'productFamily':
        return (
          <span className="text-xs truncate max-w-[100px] block">
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
        // Handle images array specially - don't render it in table cells
        if (Array.isArray(value)) {
          return <span className="text-xs">-</span>;
        }
        return <span className="text-xs">{value ?? '-'}</span>;
    }
  };

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      {visibleColumns.map(key => (
        <td key={key} className="py-2.5 px-3">
          {renderCell(key)}
        </td>
      ))}
      <td className="py-2.5 px-3">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onView}
            className="h-7 w-7 p-0"
            title="View details"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="h-7 w-7 p-0"
            title="Edit product"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ── Product Card (for compact/mobile view) ──
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
      <CardContent className="p-3">
        <div className="flex gap-3">
          {/* Thumbnail */}
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
            {primaryImage ? (
              <img
                src={primaryImage.imageUrl}
                alt="Product"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">
                  {searchQuery && product.nameEn ? (
                    <HighlightedText text={product.nameEn} highlight={searchQuery} />
                  ) : (
                    product.nameEn || product.ndNumber || (product.sourceRow != null ? `Item #${product.sourceRow}` : 'Unnamed Product')
                  )}
                </p>
                {product.nameAr && (
                  <p className="text-xs text-muted-foreground truncate" dir="rtl">
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

            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                Sr: {product.sourceRow ?? '-'}
              </Badge>
              {product.ndNumber && (
                <Badge
                  variant="outline"
                  className={`text-[10px] h-5 px-1.5 ${
                    searchQuery && product.ndNumber.toLowerCase().includes(searchQuery.toLowerCase())
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : ''
                  }`}
                >
                  {searchQuery ? (
                    <HighlightedText text={product.ndNumber} highlight={searchQuery} />
                  ) : (
                    product.ndNumber
                  )}
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
              {product.material && (
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                  {product.material}
                </Badge>
              )}
              {product.color && (
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                  {product.color}
                </Badge>
              )}
              {product.countryOfOrigin && (
                <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                  {product.countryOfOrigin}
                </Badge>
              )}
              {product.pieces != null && (
                <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                  {product.pieces} pcs
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