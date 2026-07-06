'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Product, VariantGroup, VariantMember } from '@/store/inventory-store';
import { COLOR_OPTIONS, getColorAr } from '@/lib/lookups';
import { BarcodeScanner as BarcodeScannerModal } from './barcode-scanner-modal';
import { BarcodePhotoCapture } from './barcode-photo-capture';
import { Plus, Link2, Unlink2, Trash2, Camera, Loader2, Layers, ChevronDown, ChevronRight, X, Check, Barcode } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Extended variant member type with included product data
interface VariantMemberWithProduct extends VariantMember {
  product?: {
    id: string;
    sourceRow: number | null;
    ndNumber: string | null;
    barcode: string | null;
    nameEn: string | null;
    color: string | null;
    colorAr: string | null;
    images?: { id: string; imageUrl: string; isPrimary: boolean }[];
  };
}

interface VariantManagerProps {
  product: Product;
  onVariantChange?: () => void;
}

interface ProductSearchResult {
  id: string;
  sourceRow: number | null;
  ndNumber: string | null;
  barcode: string | null;
  nameEn: string | null;
  color: string | null;
}

/**
 * Variant Manager Component
 * Allows linking/unlinking products as variants, managing variant-specific
 * images and properties like color overrides.
 */
export function VariantManager({ product, onVariantChange }: VariantManagerProps) {
  const [variantGroup, setVariantGroup] = useState<(VariantGroup & { members: VariantMemberWithProduct[] }) | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [scannerOpen, setScannerOpen] = useState(false);

  // Load variant group info for this product
  const loadVariantGroup = useCallback(async () => {
    if (!product) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/variants?productId=${product.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.memberships && data.memberships.length > 0) {
          // Get the variant group from the first membership
          const membership = data.memberships[0];
          const groupRes = await fetch(`/api/variants/${membership.variantGroupId}`);
          if (groupRes.ok) {
            const groupData = await groupRes.json();
            setVariantGroup(groupData.variantGroup);
          }
        } else {
          setVariantGroup(null);
        }
      }
    } catch (error) {
      console.error('Error loading variant group:', error);
    } finally {
      setIsLoading(false);
    }
  }, [product?.id]);

  useEffect(() => {
    loadVariantGroup();
  }, [loadVariantGroup]);

  // Search products to link as variant
  const searchProducts = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        // Filter out current product and already-linked products
        const linkedIds = variantGroup?.members.map(m => m.productId) || [];
        const filtered = data.products.filter(
          (p: Product) => p.id !== product.id && !linkedIds.includes(p.id)
        );
        setSearchResults(filtered);
      }
    } catch (error) {
      console.error('Error searching products:', error);
    }
  }, [product?.id, variantGroup?.members]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      searchProducts(searchQuery);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, searchProducts]);

  // Handle barcode scanned - search by barcode
  const handleBarcodeScanned = useCallback(async (barcode: string) => {
    setSearchQuery(barcode);
    setScannerOpen(false);
    // Search for product with this barcode
    try {
      const res = await fetch(`/api/products?barcode=${encodeURIComponent(barcode)}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.products && data.products.length > 0) {
          const foundProduct = data.products[0];
          if (foundProduct.id !== product.id) {
            setSelectedProductId(foundProduct.id);
          } else {
            toast.error('Cannot link the same product as a variant');
          }
        } else {
          toast.error('No product found with this barcode');
        }
      }
    } catch (error) {
      console.error('Error finding product by barcode:', error);
    }
  }, [product?.id]);

  // Create new variant group
  const createVariantGroup = async () => {
    if (!selectedProductId) {
      toast.error('Please select a product to link');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryProductId: product.id,
          productIds: [product.id, selectedProductId],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setVariantGroup(data.variantGroup);
        setShowLinkDialog(false);
        setSelectedProductId(null);
        setSearchQuery('');
        setSearchResults([]);
        toast.success('Variant group created');
        onVariantChange?.();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create variant group');
      }
    } catch (error) {
      console.error('Error creating variant group:', error);
      toast.error('Failed to create variant group');
    } finally {
      setIsLoading(false);
    }
  };

  // Add member to existing group
  const addMemberToGroup = async () => {
    if (!variantGroup || !selectedProductId) {
      toast.error('Please select a product to link');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/variants/${variantGroup.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          color: selectedColor || undefined,
          colorAr: selectedColor ? getColorAr(selectedColor) : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setVariantGroup(prev => prev ? {
          ...prev,
          members: [...prev.members, data.member],
        } : null);
        setShowLinkDialog(false);
        setSelectedProductId(null);
        setSearchQuery('');
        setSearchResults([]);
        setSelectedColor('');
        toast.success('Product added as variant');
        onVariantChange?.();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to add variant');
      }
    } catch (error) {
      console.error('Error adding variant:', error);
      toast.error('Failed to add variant');
    } finally {
      setIsLoading(false);
    }
  };

  // Remove member from group
  const removeMember = async (memberId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/variants/member/${memberId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setVariantGroup(prev => {
          if (!prev) return null;
          const newMembers = prev.members.filter(m => m.id !== memberId);
          // If only one member left, delete the whole group
          if (newMembers.length <= 1) {
            return null;
          }
          return { ...prev, members: newMembers };
        });
        toast.success('Variant removed');
        onVariantChange?.();
      } else {
        toast.error('Failed to remove variant');
      }
    } catch (error) {
      console.error('Error removing variant:', error);
      toast.error('Failed to remove variant');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete entire variant group
  const deleteVariantGroup = async () => {
    if (!variantGroup) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/variants/${variantGroup.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setVariantGroup(null);
        toast.success('Variant group deleted');
        onVariantChange?.();
      } else {
        toast.error('Failed to delete variant group');
      }
    } catch (error) {
      console.error('Error deleting variant group:', error);
      toast.error('Failed to delete variant group');
    } finally {
      setIsLoading(false);
    }
  };

  // Get current product's member info
  const currentMember = variantGroup?.members.find(m => m.productId === product.id);

  return (
    <Card>
      <CardHeader
        className="pb-0 cursor-pointer select-none hover:bg-accent/30 transition-colors rounded-t-lg"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Product Variants
            </CardTitle>
            {variantGroup && (
              <Badge variant="secondary" className="text-xs">
                {variantGroup.members.length} variants
              </Badge>
            )}
          </div>
          {variantGroup && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-destructive hover:text-destructive">
                  <Unlink2 className="h-3.5 w-3.5 mr-1" />
                  Unlink All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Variant Group?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will unlink all {variantGroup.members.length} products from this variant group.
                    The products themselves will remain intact.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteVariantGroup} className="bg-destructive text-destructive-foreground">
                    Delete Group
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-4 space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Existing variants */}
          {variantGroup && !isLoading && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Linked Variants</Label>
              <ScrollArea className="h-[200px] rounded-md border p-2">
                {variantGroup.members.map((member) => {
                  const isCurrentProduct = member.productId === product.id;
                  const memberProduct = member.product;
                  return (
                    <div
                      key={member.id}
                      className={`flex items-center justify-between p-2 rounded ${
                        isCurrentProduct ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="text-sm">
                          <span className="font-medium">
                            {memberProduct?.sourceRow ? `SR ${memberProduct.sourceRow}` : ''}
                          </span>
                          <span className="text-muted-foreground ml-1">
                            {memberProduct?.ndNumber || memberProduct?.barcode || member.productId}
                          </span>
                          <span className="ml-2 truncate max-w-[150px]">
                            {memberProduct?.nameEn || 'Unnamed'}
                          </span>
                        </div>
                        {(member.color || memberProduct?.color) && (
                          <Badge variant="outline" className="text-xs">
                            {member.color || memberProduct?.color}
                          </Badge>
                        )}
                        {isCurrentProduct && (
                          <Badge variant="default" className="text-xs">Current</Badge>
                        )}
                      </div>
                      {!isCurrentProduct && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-destructive hover:text-destructive"
                          onClick={() => removeMember(member.id)}
                        >
                          <Unlink2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </ScrollArea>
            </div>
          )}

          {/* Link new variant */}
          <Button
            variant="outline"
            size="sm"
            className="w-full h-9"
            onClick={() => setShowLinkDialog(true)}
          >
            <Link2 className="h-4 w-4 mr-2" />
            Link as Variant
          </Button>

          {/* Link Dialog */}
          <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Link Product as Variant</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Scanner button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-9"
                  onClick={() => setScannerOpen(true)}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Scan Barcode to Find Product
                </Button>

                {/* Search input */}
                <div>
                  <Label className="text-sm font-medium">Search Product</Label>
                  <Input
                    placeholder="Search by ND Number, Barcode, or Name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 mt-1"
                  />
                </div>

                {/* Search results */}
                {searchResults.length > 0 && (
                  <ScrollArea className="h-[150px] rounded-md border">
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        className={`flex items-center gap-2 p-2 cursor-pointer hover:bg-accent ${
                          selectedProductId === result.id ? 'bg-accent' : ''
                        }`}
                        onClick={() => setSelectedProductId(result.id)}
                      >
                        <div className="text-sm">
                          <span className="font-mono text-xs">{result.ndNumber || result.barcode}</span>
                          <span className="ml-2">{result.nameEn || 'Unnamed'}</span>
                          {result.color && (
                            <Badge variant="outline" className="ml-2 text-xs">{result.color}</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                )}

                {/* Color override - simple dropdown */}
                {selectedProductId && (
                  <div>
                    <Label className="text-sm font-medium">Variant Color Override</Label>
                    <select
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      className="w-full h-10 mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select color (optional)</option>
                      {COLOR_OPTIONS.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={variantGroup ? addMemberToGroup : createVariantGroup}
                  disabled={!selectedProductId || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Link2 className="h-4 w-4 mr-2" />
                  )}
                  Link Variant
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Pro Scanner Modal - using full barcode scanner with html5-qrcode */}
          {scannerOpen && (
            <BarcodeScannerModal
              onScan={handleBarcodeScanned}
              onClose={() => setScannerOpen(false)}
            />
          )}
        </CardContent>
      )}
    </Card>
  );
}