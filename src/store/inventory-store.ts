import { create } from 'zustand';

export type ViewMode = 'dashboard' | 'products' | 'add-product' | 'edit-product' | 'product-detail' | 'import' | 'filters';

export type SortBy =
  | 'sourceRow'
  | 'ndNumber'
  | 'nameEn'
  | 'productType'
  | 'productFamily'
  | 'defaultPrice'
  | 'recentlyUpdated'
  | 'recentlyAdded';
export type SortOrder = 'asc' | 'desc';

export interface ProductImage {
  id: string;
  productId: string;
  imageUrl: string;
  displayOrder: number;
  isPrimary: boolean;
  createdAt: string;
}

export interface Product {
  id: string;

  // Product Identity Group
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

  // Classification Group
  department: string | null;
  category: string | null;
  subcategory: string | null;
  sectionCode: string | null;
  productFamily: string | null;
  productType: string | null;

  // Product Information Group
  nameAr: string | null;
  nameEn: string | null;
  shortDescAr: string | null;
  shortDescEn: string | null;
  longDescAr: string | null;
  longDescEn: string | null;

  // Attributes Group
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

  // Logistics Group
  countryOfOrigin: string | null;
  unit: string | null;
  minSalesMultiples: string | null;

  // Commercial Group
  defaultPrice: number | null;

  // SEO Group
  seoTitleEn: string | null;
  seoTitleAr: string | null;
  seoDescriptionEn: string | null;
  seoDescriptionAr: string | null;
  searchKeywords: string | null;

  // Internal Group
  internalNotes: string | null;
  validationStatus: string | null;
  confidenceScore: number | null;
  pieces: number | null;
  setCount: number | null;
  shape: string | null;
  finish: string | null;
  additionalInfo: string | null;

  // System
  createdAt: string;
  updatedAt: string;
  images: ProductImage[];
}

export interface NdGroup {
  ndNumber: string;
  count: number;
}

export interface DashboardStats {
  totalProducts: number;
  productsAddedToday: number;
  productsMissingImages: number;
  productsMissingBarcode: number;
  productsMissingDimensions: number;
  productsMissingClassification: number;
  productsMissingNameEn: number;
  productsMissingPrice: number;
}

export interface DuplicateCheck {
  ndNumber?: { id: string; sourceRow: number | null; nameEn: string | null; ndNumber: string };
  barcode?: { id: string; sourceRow: number | null; nameEn: string | null; barcode: string };
  productId?: { id: string; nameEn: string | null; productId: string };
  sku?: { id: string; nameEn: string | null; sku: string };
}

interface InventoryState {
  // Auth
  isAuthenticated: boolean;
  user: { id: string; email: string; name: string | null } | null;

  // Navigation
  currentView: ViewMode;
  previousView: ViewMode | null;

  // Products
  products: Product[];
  totalProducts: number;
  currentPage: number;
  currentProduct: Product | null;

  // Stats
  stats: DashboardStats | null;

  // Search & Filters
  searchQuery: string;
  filterMaterial: string;
  filterColour: string;
  filterMade: string;
  filterPriceMin: string;
  filterPriceMax: string;
  // New filter fields
  filterDepartment: string;
  filterCategory: string;
  filterSubcategory: string;
  filterProductFamily: string;
  filterProductType: string;
  filterBrand: string;
  filterColor: string;
  filterCountryOfOrigin: string;
  filterShape: string;
  filterValidationStatus: string;
  filterUnit: string;

  // Sort
  sortBy: SortBy;
  sortOrder: SortOrder;

  // ND Number Groups
  groupByNd: boolean;
  ndGroups: NdGroup[];
  expandedGroups: Set<string>;
  selectedNdNumber: string;

  // Scroll position preservation
  scrollPosition: number;

  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';

  // Duplicates
  duplicates: DuplicateCheck | null;

  // Actions
  setAuthenticated: (auth: boolean, user?: any) => void;
  setView: (view: ViewMode) => void;
  goBack: () => void;
  setProducts: (products: Product[], total: number) => void;
  setCurrentProduct: (product: Product | null) => void;
  setStats: (stats: DashboardStats) => void;
  setSearchQuery: (query: string) => void;
  setFilter: (key: string, value: string) => void;
  clearFilters: () => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
  setDuplicates: (duplicates: DuplicateCheck | null) => void;
  setCurrentPage: (page: number) => void;
  setSortBy: (sortBy: SortBy) => void;
  setSortOrder: (sortOrder: SortOrder) => void;
  setGroupByNd: (enabled: boolean) => void;
  setNdGroups: (groups: NdGroup[]) => void;
  toggleGroup: (ndNumber: string) => void;
  setSelectedNdNumber: (ndNumber: string) => void;
  setScrollPosition: (position: number) => void;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
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
  expandedGroups: new Set<string>(),
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
  setAuthenticated: (auth, user) => set({ isAuthenticated: auth, user: user || null }),
  setView: (view) => set((state) => ({ previousView: state.currentView, currentView: view })),
  goBack: () => set((state) => ({ currentView: state.previousView || 'dashboard', previousView: null })),
  setProducts: (products, total) => set({ products, totalProducts: total }),
  setCurrentProduct: (product) => set({ currentProduct: product }),
  setStats: (stats) => set({ stats }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilter: (key, value) => set((state) => ({ ...state, [key]: value })),
  clearFilters: () => set({
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
    filterUnit: '',
  }),
  setLoading: (loading) => set({ isLoading: loading }),
  setSaving: (saving) => set({ isSaving: saving }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  setDuplicates: (duplicates) => set({ duplicates }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setSortBy: (sortBy) => set({ sortBy, currentPage: 1 }),
  setSortOrder: (sortOrder) => set({ sortOrder, currentPage: 1 }),
  setGroupByNd: (enabled) => set({ groupByNd: enabled, currentPage: 1 }),
  setNdGroups: (groups) => set({ ndGroups: groups }),
  toggleGroup: (ndNumber) => set((state) => {
    const next = new Set(state.expandedGroups);
    if (next.has(ndNumber)) {
      next.delete(ndNumber);
    } else {
      next.add(ndNumber);
    }
    return { expandedGroups: next };
  }),
  setSelectedNdNumber: (ndNumber) => set({ selectedNdNumber: ndNumber, currentPage: 1 }),
  setScrollPosition: (position) => set({ scrollPosition: position }),
}));
