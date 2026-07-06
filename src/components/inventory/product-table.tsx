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
            <div className="absolute left-0 top-full mt-1 z-50 w-48 bg-popover border rounded-lg shadow-lg p-2">
              <p className="text-xs font-medium px-2 py-1.5 text-muted-foreground">Visible Columns</p>
              <div className="border-t" />
              <div className="py-1 max-h-[300px] overflow-y-auto">
                {DEFAULT_COLUMNS.map(col => (
                  <button
                    key={col.key}
                    onClick={() => toggleColumn(col.key)}
                    disabled={col.alwaysVisible}
                    className={`flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded transition-colors ${
                      col.alwaysVisible 
                        ? 'text-muted-foreground cursor-default' 
                        : 'hover:bg-accent'
                    }`}
                  >
                    <div className={`h-4 w-4 rounded border flex items-center justify-center ${
                      visibleColumns.includes(col.key) 
                        ? 'bg-primary border-primary text-primary-foreground' 
                        : 'border-input'
                    }`}>
                      {visibleColumns.includes(col.key) && (
                        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span>{col.label}</span>
                    {col.alwaysVisible && <span className="text-muted-foreground ml-auto">(fixed)</span>}
                  </button>
                ))}
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
            
            {/* Taxonomy Filters - responsive grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <SearchableSingleSelect
                label="Department"
                value={filterDepartment}
                onChange={(v) => setFilter('filterDepartment', v)}
                suggestions={DEPARTMENTS}
                placeholder="All"
              />
              <SearchableSingleSelect
                label="Category"
                value={filterCategory}
                onChange={(v) => setFilter('filterCategory', v)}
                suggestions={categoryOptions}
                placeholder="All"
              />
              <SearchableSingleSelect
                label="Subcategory"
                value={filterSubcategory}
                onChange={(v) => setFilter('filterSubcategory', v)}
                suggestions={subcategoryOptions}
                placeholder="All"
              />
              <SearchableSingleSelect
                label="Product Family"
                value={filterProductFamily}
                onChange={(v) => setFilter('filterProductFamily', v)}
                suggestions={[...PRODUCT_FAMILIES]}
                placeholder="All"
              />
            </div>

            {/* Attribute Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <SearchableSingleSelect
                label="Product Type"
                value={filterProductType}
                onChange={(v) => setFilter('filterProductType', v)}
                suggestions={productTypeOptions}
                placeholder="All"
              />
              <SearchableSingleSelect
                label="Brand"
                value={filterBrand}
                onChange={(v) => setFilter('filterBrand', v)}
                suggestions={BRAND_OPTIONS}
                placeholder="All"
              />
              <SearchableSingleSelect
                label="Color"
                value={filterColor}
                onChange={(v) => setFilter('filterColor', v)}
                suggestions={COLOR_OPTIONS}
                placeholder="All"
              />
              <SearchableSingleSelect
                label="Material"
                value={filterMaterial}
                onChange={(v) => setFilter('filterMaterial', v)}
                suggestions={MATERIAL_OPTIONS}
                placeholder="All"
              />
            </div>

            {/* Logistics & Status Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <SearchableSingleSelect
                label="Origin"
                value={filterCountryOfOrigin}
                onChange={(v) => setFilter('filterCountryOfOrigin', v)}
                suggestions={[...COUNTRY_OPTIONS]}
                placeholder="All"
              />
              <SearchableSingleSelect
                label="Unit"
                value={filterUnit}
                onChange={(v) => setFilter('filterUnit', v)}
                suggestions={[...UNIT_OPTIONS]}
                placeholder="All"
              />
              <SearchableSingleSelect
                label="Status"
                value={filterValidationStatus}
                onChange={(v) => setFilter('filterValidationStatus', v)}
                suggestions={[...VALIDATION_STATUS_OPTIONS]}
                placeholder="All"
              />
              <SearchableSingleSelect
                label="Shape"
                value={filterShape}
                onChange={(v) => setFilter('filterShape', v)}
                suggestions={[...SHAPE_OPTIONS]}
                placeholder="All"
              />
            </div>

            {/* Price Range - responsive layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Min Price (KD)</label>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="0.000"
                  value={filterPriceMin}
                  onChange={(e) => setFilter('filterPriceMin', e.target.value)}
                  className="h-11"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Max Price (KD)</label>
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

            <Button onClick={() => setCurrentPage(1)} className="w-full h-11">
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
      {visibleColumns.map(key => (
        <td key={key} className="py-3 px-3">
          {renderCell(key)}
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