'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Product, VariantGroup, VariantMember } from '@/store/inventory-store';
import { COLOR_OPTIONS, getColorAr } from '@/lib/lookups';
import { BarcodeScanner as BarcodeScannerModal } from './barcode-scanner-modal';
import { BarcodePhotoCapture } from './barcode-photo-capture';
import { Plus, Link2, Unlink2, Trash2, Camera, Loader2, Layers, ChevronDown, ChevronRight, X, Check, Barcode } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// VariantMember now includes optional product data from API

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
  images?: { imageUrl: string; thumbnailUrl: string | null }[];
  variantMemberships?: { variantGroupId: string; variantGroup: { primaryProductId: string } }[];
}

/**
 * Variant Manager Component
 * Allows linking/unlinking products as variants, managing variant-specific
 * images and properties like color overrides.
 */
export function VariantManager({ product, onVariantChange }: VariantManagerProps) {
  const [variantGroup, setVariantGroup] = useState<(VariantGroup & { members: VariantMember[] }) | null>(null);
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
      // Fetch products with images and variant memberships so we can show
      // the product thumbnail and whether it's already linked as a variant.
      const res = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        // Filter out the current product. Do NOT filter out already-linked
        // products — instead, mark them as "Already linked" so the user
        // can see WHY they can't be selected.
        const linkedIds = variantGroup?.members.map(m => m.productId) || [];
        const filtered = data.products.filter(
          (p: ProductSearchResult) => p.id !== product.id
        );
        // Mark each result with its availability status
        const enriched = filtered.map((p: ProductSearchResult) => {
          const isAlreadyInGroup = linkedIds.includes(p.id);
          const isLinkedElsewhere = !isAlreadyInGroup &&
            p.variantMemberships &&
            p.variantMemberships.length > 0 &&
            p.variantMemberships[0].variantGroup.primaryProductId !== product.id;
          return {
            ...p,
            isAvailable: !isAlreadyInGroup && !isLinkedElsewhere,
            isAlreadyInGroup,
            isLinkedElsewhere,
          };
        });
        setSearchResults(enriched);
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

  // Unlink a single variant member — asks for confirmation first,
  // removes ONLY the relationship (not the product, images, or data).
  // If the group is left with ≤1 member, the entire group is deleted.
  const [unlinkTarget, setUnlinkTarget] = useState<VariantMember | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);

  const confirmUnlink = async () => {
    if (!unlinkTarget || !variantGroup) return;
    setIsUnlinking(true);
    try {
      const res = await fetch(`/api/variants/member/${unlinkTarget.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        // Check how many members remain after this removal
        const remainingMembers = variantGroup.members.filter(
          m => m.id !== unlinkTarget.id
        );

        if (remainingMembers.length <= 1) {
          // If 0 or 1 members remain, the variant group is no longer useful.
          // Delete the entire group (the remaining product is just a normal product again).
          if (variantGroup) {
            await fetch(`/api/variants/${variantGroup.id}`, { method: 'DELETE' });
          }
          setVariantGroup(null);
        } else {
          // Update local state — remove only this member, keep all others
          setVariantGroup(prev => prev ? {
            ...prev,
            members: remainingMembers,
          } : null);
        }

        toast.success('Variant unlinked successfully');
        onVariantChange?.();
      } else {
        toast.error('Failed to unlink variant');
      }
    } catch (error) {
      console.error('Error unlinking variant:', error);
      toast.error('Failed to unlink variant');
    } finally {
      setIsUnlinking(false);
      setUnlinkTarget(null);
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

  // Is this product the PARENT (primary) or a VARIANT (child)?
  // If the product has a variantGroup but is NOT the primaryProductId,
  // it's a variant of another product. In that case, we hide the "Link as
  // Variant" button and show "Already linked as a variant of {parent}".
  const isParent = variantGroup?.primaryProductId === product.id;
  const isVariant = variantGroup && !isParent;
  const parentProduct = isVariant
    ? variantGroup?.members.find(m => m.productId === variantGroup.primaryProductId)?.product
    : null;
  const parentIdLabel = parentProduct?.ndNumber ||
    (parentProduct?.barcode ? `Barcode: ${parentProduct.barcode}` : null);

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
              <Label className="text-sm font-medium">Linked Variants ({variantGroup.members.length})</Label>
              <div className="space-y-2">
                {variantGroup.members.map((member) => {
                  const isCurrentProduct = member.productId === product.id;
                  const memberProduct = member.product;
                  const memberImage = memberProduct?.images?.[0]?.imageUrl || memberProduct?.images?.[0]?.thumbnailUrl;
                  return (
                    <div
                      key={member.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        isCurrentProduct ? 'bg-primary/5 border-primary/30' : 'bg-card border-border'
                      }`}
                    >
                      {/* Product image thumbnail */}
                      <div className="w-12 h-12 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                        {memberImage ? (
                          <img src={memberImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Layers className="h-5 w-5 text-muted-foreground/50" />
                        )}
                      </div>

                      {/* Product info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">
                            {memberProduct?.nameEn || 'Unnamed'}
                          </span>
                          {isCurrentProduct && (
                            <Badge variant="default" className="text-[10px] py-0">Current</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {memberProduct?.ndNumber && (
                            <span className="font-mono">{memberProduct.ndNumber}</span>
                          )}
                          {memberProduct?.barcode && (
                            <span className="font-mono">· {memberProduct.barcode}</span>
                          )}
                        </div>
                        {/* Variant attributes */}
                        {(member.color || memberProduct?.color) && (
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant="outline" className="text-[10px] py-0">
                              {member.color || memberProduct?.color}
                            </Badge>
                            {member.colorAr && (
                              <Badge variant="outline" className="text-[10px] py-0" dir="rtl">
                                {member.colorAr}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Unlink button — NOT shown for the current product */}
                      {!isCurrentProduct && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-9 px-3 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                              title="Unlink this variant"
                              aria-label={`Unlink ${memberProduct?.nameEn || 'this variant'}`}
                            >
                              <Unlink2 className="h-4 w-4 sm:mr-1" />
                              <span className="text-xs hidden sm:inline">Unlink</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Unlink this variant?</AlertDialogTitle>
                              <AlertDialogDescription>
                                <strong>{memberProduct?.nameEn || 'This product'}</strong>
                                {memberProduct?.ndNumber && ` (${memberProduct.ndNumber})`}
                                {' will be unlinked from the variant group.'}
                                <br /><br />
                                The product itself, its images, inventory, and pricing will NOT be affected.
                                Only the variant relationship will be removed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={isUnlinking}>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={(e) => {
                                  e.preventDefault();
                                  setUnlinkTarget(member);
                                  confirmUnlink();
                                }}
                                disabled={isUnlinking}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {isUnlinking ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                    Unlinking...
                                  </>
                                ) : (
                                  'Unlink Variant'
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* If this product IS a variant (not the parent), show parent info
              and DO NOT show the "Link as Variant" button. A product that is
              already a variant cannot be a parent of its own variants. */}
          {isVariant ? (
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  This product is already linked as a variant
                </span>
              </div>
              {parentIdLabel && (
                <p className="text-sm text-muted-foreground ml-6">
                  Parent: <span className="font-mono font-medium">{parentIdLabel}</span>
                </p>
              )}
              {parentProduct?.nameEn && (
                <p className="text-xs text-muted-foreground ml-6">
                  {parentProduct.nameEn}
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="ml-6 h-8 text-xs"
                onClick={() => {
                  // Navigate to the parent product
                  if (variantGroup?.primaryProductId) {
                    window.location.href = `/?product=${variantGroup.primaryProductId}`;
                  }
                }}
              >
                View Parent Product
              </Button>
            </div>
          ) : (
            /* Link new variant — only shown if this product is NOT already a variant */
            <Button
              variant="outline"
              size="sm"
              className="w-full h-9"
              onClick={() => setShowLinkDialog(true)}
            >
              <Link2 className="h-4 w-4 mr-2" />
              Link as Variant
            </Button>
          )}

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
                  <div className="h-[200px] rounded-md border overflow-y-auto">
                    {searchResults.map((result: any) => {
                      const img = result.images?.[0]?.thumbnailUrl || result.images?.[0]?.imageUrl;
                      const isAvailable = result.isAvailable !== false;
                      return (
                        <div
                          key={result.id}
                          className={`flex items-center gap-2 p-2 ${
                            isAvailable ? 'cursor-pointer hover:bg-accent' : 'opacity-50 cursor-not-allowed'
                          } ${selectedProductId === result.id ? 'bg-accent' : ''}`}
                          onClick={() => {
                            if (isAvailable) setSelectedProductId(result.id);
                          }}
                        >
                          {/* Product thumbnail */}
                          <div className="w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                            {img ? (
                              <img src={img} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Layers className="h-4 w-4 text-muted-foreground/50" />
                            )}
                          </div>
                          {/* Product info */}
                          <div className="flex-1 min-w-0 text-sm">
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-xs">
                                {result.ndNumber || result.barcode || '(no ID)'}
                              </span>
                              <span className="truncate ml-1">
                                {result.nameEn || 'Unnamed'}
                              </span>
                            </div>
                            {/* Status badge */}
                            {result.isAlreadyInGroup ? (
                              <Badge variant="secondary" className="text-[10px] mt-0.5">Already in this group</Badge>
                            ) : result.isLinkedElsewhere ? (
                              <Badge variant="destructive" className="text-[10px] mt-0.5">Already linked as variant</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] mt-0.5 text-green-600">Available</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
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