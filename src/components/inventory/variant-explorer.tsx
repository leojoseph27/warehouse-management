'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  ArrowLeft,
  Search,
  ChevronDown,
  ChevronRight,
  Star,
  Loader2,
  Download,
  Unlink2,
  Eye,
  Layers,
  Package,
} from 'lucide-react';
import { useInventoryStore } from '@/store/inventory-store';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VariantProductInfo {
  id: string;
  sourceRow: number | null;
  ndNumber: string | null;
  barcode: string | null;
  productId: string | null;
  nameEn: string | null;
  nameAr: string | null;
  color: string | null;
  colorAr: string | null;
  brand: string | null;
  category: string | null;
  productFamily: string | null;
  productType: string | null;
  validationStatus: string | null;
  images?: { imageUrl: string; thumbnailUrl: string | null; isPrimary: boolean }[];
}

interface VariantMemberInfo {
  id: string;
  variantGroupId: string;
  productId: string;
  color: string | null;
  colorAr: string | null;
  displayOrder: number;
  product: VariantProductInfo;
}

interface VariantGroupInfo {
  id: string;
  name: string | null;
  primaryProductId: string;
  createdAt: string;
  updatedAt: string;
  members: VariantMemberInfo[];
}

interface ExplorerStats {
  totalGroups: number;
  totalVariantProducts: number;
  totalParentProducts: number;
  unlinkedProducts: number;
  totalProducts: number;
}

type FilterMode = 'all' | 'largest' | 'recent';

export function VariantExplorer() {
  const { setView, setCurrentProduct } = useInventoryStore();
  const [groups, setGroups] = useState<VariantGroupInfo[]>([]);
  const [stats, setStats] = useState<ExplorerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [unlinkTarget, setUnlinkTarget] = useState<VariantMemberInfo | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Load all variant groups in a single query (no N+1)
  const loadGroups = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/variants');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.variantGroups || []);
        setStats(data.stats || null);
        // Auto-expand the first group
        if (data.variantGroups?.length > 0) {
          setExpandedGroups(new Set([data.variantGroups[0].id]));
        }
      }
    } catch (error) {
      console.error('Error loading variant groups:', error);
      toast.error('Failed to load variant groups');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Search + filter
  const filteredGroups = useMemo(() => {
    let result = [...groups];

    // Search by ND Number, Barcode, Product Name, SKU
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(group => {
        return group.members.some(member => {
          const p = member.product;
          return (
            p.ndNumber?.toLowerCase().includes(q) ||
            p.barcode?.toLowerCase().includes(q) ||
            p.nameEn?.toLowerCase().includes(q) ||
            p.productId?.toLowerCase().includes(q)
          );
        });
      });
    }

    // Filter
    if (filter === 'largest') {
      result.sort((a, b) => b.members.length - a.members.length);
    } else if (filter === 'recent') {
      result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    return result;
  }, [groups, searchQuery, filter]);

  // Toggle group expansion
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // View a product
  const viewProduct = (productId: string) => {
    // Fetch the product, then set it as current product and navigate
    fetch(`/api/products/${productId}`)
      .then(res => res.json())
      .then(data => {
        setCurrentProduct(data);
        setView('product-detail');
      })
      .catch(() => toast.error('Failed to load product'));
  };

  // Unlink a variant
  const confirmUnlink = async () => {
    if (!unlinkTarget) return;
    setIsUnlinking(true);
    try {
      const res = await fetch(`/api/variants/member/${unlinkTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        // Update local state
        setGroups(prev => prev.map(g => {
          if (g.id !== unlinkTarget.variantGroupId) return g;
          const newMembers = g.members.filter(m => m.id !== unlinkTarget.id);
          return { ...g, members: newMembers };
        })).then(() => {
          // Remove empty groups
          setGroups(prev => prev.filter(g => g.members.length > 1));
        });
        toast.success('Variant unlinked successfully');
      } else {
        toast.error('Failed to unlink variant');
      }
    } catch (error) {
      toast.error('Failed to unlink variant');
    } finally {
      setIsUnlinking(false);
      setUnlinkTarget(null);
    }
  };

  // Export variant relationships
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/variants?mode=export');
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'variant_relationships.xlsx';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Variant relationships exported');
      } else {
        toast.error('Export failed');
      }
    } catch {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  // Helper: get product identifier (ND Number preferred, Barcode fallback)
  const getIdentifier = (p: VariantProductInfo): string => {
    return p.ndNumber || (p.barcode ? `Barcode: ${p.barcode}` : '(no ID)');
  };

  // Helper: get product image
  const getImage = (p: VariantProductInfo): string | null => {
    return p.images?.[0]?.thumbnailUrl || p.images?.[0]?.imageUrl || null;
  };

  // Largest group
  const largestGroup = useMemo(() => {
    if (groups.length === 0) return null;
    return groups.reduce((max, g) => g.members.length > max.members.length ? g : max, groups[0]);
  }, [groups]);

  // Average variants per parent
  const avgVariants = useMemo(() => {
    if (groups.length === 0) return 0;
    const total = groups.reduce((sum, g) => sum + g.members.length - 1, 0); // -1 for parent
    return (total / groups.length).toFixed(1);
  }, [groups]);

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView('dashboard')} className="h-9">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Variant Relationship Explorer
            </h1>
            <p className="text-sm text-muted-foreground">Manage and inspect all product variant relationships.</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={isExporting || groups.length === 0}
          className="h-9"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-1" />
          )}
          Export Relationships
        </Button>
      </div>

      {/* Summary cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card className="overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className="bg-blue-50 p-2 rounded-lg shrink-0">
                  <Star className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{stats.totalParentProducts}</p>
                  <p className="text-xs text-muted-foreground">Parent Products</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className="bg-purple-50 p-2 rounded-lg shrink-0">
                  <Layers className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{stats.totalGroups}</p>
                  <p className="text-xs text-muted-foreground">Variant Groups</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className="bg-green-50 p-2 rounded-lg shrink-0">
                  <Package className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{stats.totalVariantProducts}</p>
                  <p className="text-xs text-muted-foreground">Variant Products</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className="bg-amber-50 p-2 rounded-lg shrink-0">
                  <Layers className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">
                    {largestGroup ? largestGroup.members.length - 1 : 0}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Largest Group{largestGroup ? ` (${largestGroup.members[0]?.product?.ndNumber || 'N/A'})` : ''}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className="bg-gray-100 p-2 rounded-lg shrink-0">
                  <Package className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{stats.unlinkedProducts}</p>
                  <p className="text-xs text-muted-foreground">Unlinked Products</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats row */}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">Average: {avgVariants} variants/parent</Badge>
        <Badge variant="outline">Parents with no variants: {stats?.unlinkedProducts ?? 0}</Badge>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ND Number, Barcode, Product Name, or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterMode)}>
          <SelectTrigger className="h-11 w-full sm:w-[180px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            <SelectItem value="largest">Largest Groups</SelectItem>
            <SelectItem value="recent">Recently Modified</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && groups.length === 0 && (
        <div className="text-center py-16">
          <Layers className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No Variant Relationships Found</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first variant group by linking products.</p>
          <Button variant="outline" className="mt-4" onClick={() => setView('products')}>
            Browse Products
          </Button>
        </div>
      )}

      {/* Variant groups */}
      {!isLoading && filteredGroups.length === 0 && groups.length > 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">No groups match your search.</p>
        </div>
      )}

      {!isLoading && filteredGroups.length > 0 && (
        <div className="space-y-3">
          {filteredGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.id);
            const parentMember = group.members.find(m => m.productId === group.primaryProductId);
            const parent = parentMember?.product;
            const variants = group.members.filter(m => m.productId !== group.primaryProductId);
            const parentIdentifier = parent ? getIdentifier(parent) : '(unknown)';

            return (
              <Card key={group.id} className="overflow-hidden">
                {/* Parent header (clickable to expand/collapse) */}
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => toggleGroup(group.id)}
                >
                  {/* Expand/collapse icon */}
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}

                  {/* Parent image */}
                  <div className="w-12 h-12 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                    {parent && getImage(parent) ? (
                      <img src={getImage(parent)!} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="h-5 w-5 text-muted-foreground/50" />
                    )}
                  </div>

                  {/* Parent info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Star className="h-4 w-4 text-amber-500 shrink-0" />
                      <span className="font-mono text-sm font-medium">{parentIdentifier}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {variants.length} variant{variants.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {parent?.nameEn || 'Unnamed'}
                    </p>
                  </div>

                  {/* Quick actions */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {parent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0"
                        onClick={() => viewProduct(parent.id)}
                        title="View product"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded variant list */}
                {isExpanded && (
                  <div className="border-t bg-muted/30">
                    {variants.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-4 text-center">
                        No variants linked (only the parent product is in this group).
                      </p>
                    ) : (
                      <div className="divide-y">
                        {variants.map((member) => {
                          const p = member.product;
                          const img = getImage(p);
                          const identifier = getIdentifier(p);
                          return (
                            <div
                              key={member.id}
                              className="flex items-center gap-3 p-3 hover:bg-accent/30 transition-colors"
                            >
                              {/* Tree branch indicator */}
                              <div className="text-muted-foreground/40 text-lg shrink-0 w-5 text-center">
                                ↳
                              </div>

                              {/* Variant image */}
                              <div className="w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                                {img ? (
                                  <img src={img} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Package className="h-4 w-4 text-muted-foreground/50" />
                                )}
                              </div>

                              {/* Variant info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-xs font-medium">{identifier}</span>
                                  <span className="text-sm truncate">{p.nameEn || 'Unnamed'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                                  {member.color && (
                                    <Badge variant="outline" className="text-[10px] py-0">{member.color}</Badge>
                                  )}
                                  {p.brand && <span>· {p.brand}</span>}
                                  {p.category && <span>· {p.category}</span>}
                                  {p.validationStatus && <span>· {p.validationStatus}</span>}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-9 w-9 p-0"
                                  onClick={() => viewProduct(p.id)}
                                  title="View product"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                                      title="Unlink variant"
                                    >
                                      <Unlink2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Unlink this variant?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        <strong>{p.nameEn || 'This product'}</strong>
                                        {` (${identifier})`}
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
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
