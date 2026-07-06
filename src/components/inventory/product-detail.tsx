'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ImageGallery } from './image-gallery';
import { useInventoryStore, Product, hasModifications, getFieldChanges } from '@/store/inventory-store';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Fingerprint,
  Layers,
  FileText,
  Palette,
  Truck,
  DollarSign,
  Search,
  Settings,
  Package,
  LucideIcon,
  ChevronLeft,
  Edit3,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Helper function to display value or dash
const displayValue = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return value.toString();
  return value;
};

// Field row component - responsive layout
function FieldRow({ label, value, isArabic = false, className = '' }: { 
  label: string; 
  value: string | number | null | undefined; 
  isArabic?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-2 py-2 ${isArabic ? 'dir-rtl' : ''} ${className}`}>
      <span className="text-xs sm:text-sm font-medium text-muted-foreground shrink-0 min-w-[100px] sm:min-w-[120px]">{label}</span>
      <span className={`text-xs sm:text-sm flex-1 ${isArabic ? 'text-right' : ''}`} dir={isArabic ? 'rtl' : undefined}>
        {displayValue(value)}
      </span>
    </div>
  );
}

// Compact field row for mobile
function CompactFieldRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium">{displayValue(value)}</span>
    </div>
  );
}

// Section card component - responsive padding
function SectionCard({ 
  title, 
  icon: Icon, 
  children,
  className = '',
}: { 
  title: string; 
  icon: LucideIcon; 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2 sm:pb-3 pt-3 sm:pt-4 px-3 sm:px-4">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
        {children}
      </CardContent>
    </Card>
  );
}

export function ProductDetail() {
  const { currentProduct, setView, setCurrentProduct } = useInventoryStore();
  const [product, setProduct] = useState(currentProduct);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (currentProduct?.id) {
      fetch(`/api/products/${currentProduct.id}`)
        .then(res => res.json())
        .then(data => {
          setProduct(data);
          setCurrentProduct(data);
        })
        .catch(console.error);
    }
  }, [currentProduct?.id]);

  // Fetch related products with same ND Number
  useEffect(() => {
    if (product?.ndNumber) {
      fetch(`/api/products?ndNumber=${encodeURIComponent(product.ndNumber)}&limit=10`)
        .then(res => res.json())
        .then(data => {
          const filtered = (data.products || []).filter((p: Product) => p.id !== product.id);
          setRelatedProducts(filtered);
        })
        .catch(console.error);
    }
  }, [product?.ndNumber]);

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Product not found</p>
      </div>
    );
  }

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Product deleted successfully');
        setCurrentProduct(null);
        setView('products');
      } else {
        toast.error('Failed to delete product');
      }
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const handleImageUpload = async (file: File, isPrimary?: boolean) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('productId', product.id);
    if (isPrimary) formData.append('isPrimary', 'true');

    const res = await fetch('/api/images/upload', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const newImage = await res.json();
      const updatedProduct = {
        ...product,
        images: [...product.images, newImage],
      };
      setProduct(updatedProduct);
      setCurrentProduct(updatedProduct);
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
    if (res.ok) {
      const updatedProduct = {
        ...product,
        images: product.images.filter(img => img.id !== imageId),
      };
      setProduct(updatedProduct);
      setCurrentProduct(updatedProduct);
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    const res = await fetch(`/api/images/${imageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPrimary: true }),
    });
    if (res.ok) {
      const updatedProduct = {
        ...product,
        images: product.images.map(img => ({
          ...img,
          isPrimary: img.id === imageId,
        })),
      };
      setProduct(updatedProduct);
      setCurrentProduct(updatedProduct);
    }
  };

  // Check for modifications
  const modifications = product ? getFieldChanges(product) : [];
  const hasMods = modifications.length > 0;

  return (
    <div className="space-y-4 pb-6">
      {/* Header - responsive layout */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setView('products')} 
            className="h-11 w-11 p-0 shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-truncate">
              {product.nameEn || product.ndNumber || (product.sourceRow != null ? `Item #${product.sourceRow}` : 'Product Details')}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {product.ndNumber && (
                <Badge variant="outline" className="text-xs font-mono">
                  {product.ndNumber}
                </Badge>
              )}
              {product.barcode && (
                <Badge variant="outline" className="text-xs font-mono">
                  {product.barcode}
                </Badge>
              )}
              {hasMods && (
                <Badge variant="destructive" className="text-xs gap-1">
                  <Edit3 className="h-3 w-3" />
                  {modifications.length} Modified
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center gap-2 sm:ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView('edit-product')}
            className="h-11 px-3 sm:px-4"
          >
            <Edit className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="h-11 px-3 sm:px-4">
                <Trash2 className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Product</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &ldquo;{product.nameEn || product.ndNumber}&rdquo;? 
                  This will also delete all images. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete} 
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Images Section */}
      <Card>
        <CardHeader className="pb-2 sm:pb-3 pt-3 sm:pt-4 px-3 sm:px-4">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Package className="h-4 w-4 shrink-0" />
            Images
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
          <ImageGallery
            images={product.images}
            productId={product.id}
            onUpload={handleImageUpload}
            onDelete={handleImageDelete}
            onSetPrimary={handleSetPrimary}
          />
        </CardContent>
      </Card>

      {/* Product Identity Section */}
      <SectionCard title="Product Identity" icon={Fingerprint}>
        <div className="space-y-0 divide-y divide-border">
          <FieldRow label="Source Row" value={product.sourceRow} />
          <FieldRow label="Product ID" value={product.productId} />
          <FieldRow label="SKU" value={product.sku} />
          <FieldRow label="ND Number" value={product.ndNumber} />
          <FieldRow label="Barcode" value={product.barcode} />
          <FieldRow label="Legacy Code" value={product.legacyCode} />
          <FieldRow label="Brand" value={product.brand} />
          <FieldRow label="Brand (Arabic)" value={product.brandAr} isArabic />
          <FieldRow label="Brand Code" value={product.brandCode} />
          <FieldRow label="Model" value={product.model} />
        </div>
      </SectionCard>

      {/* Classification Section */}
      <SectionCard title="Classification" icon={Layers}>
        <div className="space-y-0 divide-y divide-border">
          <FieldRow label="Department" value={product.department} />
          <FieldRow label="Category" value={product.category} />
          <FieldRow label="Subcategory" value={product.subcategory} />
          <FieldRow label="Section Code" value={product.sectionCode} />
          <FieldRow label="Product Family" value={product.productFamily} />
          <FieldRow label="Product Type" value={product.productType} />
        </div>
      </SectionCard>

      {/* Product Information Section */}
      <SectionCard title="Product Information" icon={FileText}>
        <div className="space-y-3">
          <div className="space-y-0 divide-y divide-border">
            <FieldRow label="Name (English)" value={product.nameEn} />
            <FieldRow label="Name (Arabic)" value={product.nameAr} isArabic />
          </div>
          
          {(product.shortDescEn || product.shortDescAr) && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Short Description (EN)</p>
                <p className="text-xs sm:text-sm">{displayValue(product.shortDescEn)}</p>
              </div>
              {product.shortDescAr && (
                <div className="space-y-2" dir="rtl">
                  <p className="text-xs font-medium text-muted-foreground" dir="ltr">Short Description (AR)</p>
                  <p className="text-xs sm:text-sm text-right">{product.shortDescAr}</p>
                </div>
              )}
            </>
          )}

          {(product.longDescEn || product.longDescAr) && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Long Description (EN)</p>
                <p className="text-xs sm:text-sm whitespace-pre-wrap">{displayValue(product.longDescEn)}</p>
              </div>
              {product.longDescAr && (
                <div className="space-y-2" dir="rtl">
                  <p className="text-xs font-medium text-muted-foreground" dir="ltr">Long Description (AR)</p>
                  <p className="text-xs sm:text-sm text-right whitespace-pre-wrap">{product.longDescAr}</p>
                </div>
              )}
            </>
          )}
        </div>
      </SectionCard>

      {/* Attributes Section */}
      <SectionCard title="Attributes" icon={Palette}>
        <div className="space-y-3">
          {/* Color & Material - responsive grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-0 divide-y divide-border">
              <FieldRow label="Color" value={product.color} />
              <FieldRow label="Color (Arabic)" value={product.colorAr} isArabic />
            </div>
            <div className="space-y-0 divide-y divide-border">
              <FieldRow label="Material" value={product.material} />
              <FieldRow label="Material (Arabic)" value={product.materialAr} isArabic />
            </div>
          </div>

          <Separator />

          {/* Dimensions - responsive grid */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Dimensions</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-muted/50 rounded p-2 sm:p-2.5">
                <p className="text-xs text-muted-foreground">Length</p>
                <p className="text-sm sm:text-base font-semibold">{displayValue(product.length)}</p>
              </div>
              <div className="bg-muted/50 rounded p-2 sm:p-2.5">
                <p className="text-xs text-muted-foreground">Width</p>
                <p className="text-sm sm:text-base font-semibold">{displayValue(product.width)}</p>
              </div>
              <div className="bg-muted/50 rounded p-2 sm:p-2.5">
                <p className="text-xs text-muted-foreground">Height</p>
                <p className="text-sm sm:text-base font-semibold">{displayValue(product.height)}</p>
              </div>
              <div className="bg-muted/50 rounded p-2 sm:p-2.5">
                <p className="text-xs text-muted-foreground">Diameter</p>
                <p className="text-sm sm:text-base font-semibold">{displayValue(product.diameter)}</p>
              </div>
            </div>
            {product.dimensionUnit && (
              <p className="text-xs text-muted-foreground text-center mt-1">Unit: {product.dimensionUnit}</p>
            )}
          </div>

          <Separator />

          {/* Capacity & Weight */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Capacity</p>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-semibold">{displayValue(product.capacity)}</span>
                {product.capacityUnit && <span className="text-xs sm:text-sm text-muted-foreground">{product.capacityUnit}</span>}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Weight</p>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-semibold">{displayValue(product.weight)}</span>
                {product.weightUnit && <span className="text-xs sm:text-sm text-muted-foreground">{product.weightUnit}</span>}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Logistics Section */}
      <SectionCard title="Logistics" icon={Truck}>
        <div className="space-y-0 divide-y divide-border">
          <FieldRow label="Country of Origin" value={product.countryOfOrigin} />
          <FieldRow label="Unit" value={product.unit} />
          <FieldRow label="Min Sales Multiples" value={product.minSalesMultiples} />
        </div>
      </SectionCard>

      {/* Commercial Section */}
      <SectionCard title="Commercial" icon={DollarSign}>
        <div className="flex items-center justify-between py-2">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">Default Price</span>
          <span className="text-base sm:text-lg font-bold">
            {product.defaultPrice != null ? `${product.defaultPrice.toFixed(3)} KD` : '—'}
          </span>
        </div>
      </SectionCard>

      {/* SEO Section */}
      <SectionCard title="SEO" icon={Search}>
        <div className="space-y-3">
          <div className="space-y-0 divide-y divide-border">
            <FieldRow label="Title (English)" value={product.seoTitleEn} />
            <FieldRow label="Title (Arabic)" value={product.seoTitleAr} isArabic />
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Description (EN)</p>
            <p className="text-xs sm:text-sm">{displayValue(product.seoDescriptionEn)}</p>
          </div>
          
          {product.seoDescriptionAr && (
            <div className="space-y-2" dir="rtl">
              <p className="text-xs font-medium text-muted-foreground" dir="ltr">Description (AR)</p>
              <p className="text-xs sm:text-sm text-right">{product.seoDescriptionAr}</p>
            </div>
          )}
          
          <Separator />
          
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Search Keywords</p>
            <p className="text-xs sm:text-sm">{displayValue(product.searchKeywords)}</p>
          </div>
        </div>
      </SectionCard>

      {/* Internal Section */}
      <SectionCard title="Internal" icon={Settings}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-0 divide-y divide-border">
              <CompactFieldRow label="Pieces" value={product.pieces} />
              <CompactFieldRow label="Set Count" value={product.setCount} />
              <CompactFieldRow label="Shape" value={product.shape} />
              <CompactFieldRow label="Finish" value={product.finish} />
            </div>
            <div className="space-y-0 divide-y divide-border">
              <CompactFieldRow label="Status" value={product.validationStatus} />
              <CompactFieldRow label="Confidence" value={product.confidenceScore != null ? `${(product.confidenceScore * 100).toFixed(0)}%` : null} />
            </div>
          </div>

          {(product.internalNotes || product.additionalInfo) && (
            <>
              <Separator />
              {product.internalNotes && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Internal Notes</p>
                  <p className="text-xs sm:text-sm whitespace-pre-wrap">{product.internalNotes}</p>
                </div>
              )}
              {product.additionalInfo && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Additional Info</p>
                  <p className="text-xs sm:text-sm whitespace-pre-wrap">{product.additionalInfo}</p>
                </div>
              )}
            </>
          )}
        </div>
      </SectionCard>

      {/* System Info */}
      <Card className="bg-muted/30">
        <CardContent className="py-2 sm:py-3 px-3 sm:px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Created: {new Date(product.createdAt).toLocaleString()}</span>
            <span>Updated: {new Date(product.updatedAt).toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <Card>
          <CardHeader className="pb-2 sm:pb-3 pt-3 sm:pt-4 px-3 sm:px-4">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Package className="h-4 w-4 shrink-0" />
              Other Products with Same ND ({product.ndNumber})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
            <div className="max-h-48 sm:max-h-64 overflow-y-auto space-y-2">
              {relatedProducts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => {
                    setCurrentProduct(p);
                    setView('product-detail');
                  }}
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-muted rounded flex items-center justify-center overflow-hidden shrink-0">
                    {p.images?.[0]?.imageUrl ? (
                      <img src={p.images[0].imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="h-5 sm:h-6 w-5 sm:w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-truncate">{p.nameEn || 'No name'}</p>
                    <p className="text-xs text-muted-foreground text-truncate">
                      {p.productId && `ID: ${p.productId}`}
                      {p.barcode && ` | ${p.barcode}`}
                    </p>
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground shrink-0">
                    {p.defaultPrice != null ? `${p.defaultPrice.toFixed(3)} KD` : ''}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}