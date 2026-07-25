'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, Edit3, Undo2, RotateCcw, Loader2 } from 'lucide-react';
import { FieldChange, Product } from '@/store/inventory-store';
import { toast } from 'sonner';

interface ViewChangesPanelProps {
  product: Product;
  changes: FieldChange[];
  /** Called after a successful undo to refresh the product in the parent. */
  onUndoComplete?: (updatedProduct: Product) => void;
}

// Field label mapping for display
const FIELD_LABELS: Record<string, string> = {
  productId: 'Product ID',
  sku: 'SKU',
  ndNumber: 'ND Number',
  barcode: 'Barcode',
  legacyCode: 'Legacy Code',
  brand: 'Brand',
  model: 'Model',
  department: 'Department',
  category: 'Category',
  subcategory: 'Subcategory',
  productFamily: 'Product Family',
  productType: 'Product Type',
  nameAr: 'Name AR',
  enCatalog: 'EN Catalog',
  nameEn: 'Name EN',
  shortDescAr: 'Short Desc AR',
  shortDescEn: 'Short Desc EN',
  longDescAr: 'Long Desc AR',
  longDescEn: 'Long Desc EN',
  color: 'Color',
  material: 'Material',
  capacity: 'Capacity',
  capacityUnit: 'Capacity Unit',
  weight: 'Weight',
  weightUnit: 'Weight Unit',
  length: 'Length',
  width: 'Width',
  height: 'Height',
  diameter: 'Diameter',
  dimensionUnit: 'Dimension Unit',
  countryOfOrigin: 'Country of Origin',
  unit: 'Unit',
  minSalesMultiples: 'Min Sales Multiples',
  defaultPrice: 'Price',
  seoTitleEn: 'SEO Title EN',
  seoTitleAr: 'SEO Title AR',
  seoDescriptionEn: 'SEO Desc EN',
  seoDescriptionAr: 'SEO Desc AR',
  searchKeywords: 'Search Keywords',
  internalNotes: 'Internal Notes',
  validationStatus: 'Validation Status',
  confidenceScore: 'Confidence Score',
  pieces: 'Pieces',
  setCount: 'Set Count',
  shape: 'Shape',
  finish: 'Finish',
  additionalInfo: 'Additional Info',
};

// Group fields by section for organized display
const FIELD_GROUPS = {
  'Product Identity': ['productId', 'sku', 'ndNumber', 'barcode', 'legacyCode', 'brand', 'model'],
  'Classification': ['department', 'category', 'subcategory', 'productFamily', 'productType'],
  'Product Information': ['nameAr', 'enCatalog', 'nameEn', 'shortDescAr', 'shortDescEn', 'longDescAr', 'longDescEn'],
  'Attributes': ['color', 'material', 'capacity', 'capacityUnit', 'weight', 'weightUnit', 'length', 'width', 'height', 'diameter', 'dimensionUnit'],
  'Logistics': ['countryOfOrigin', 'unit', 'minSalesMultiples'],
  'Commercial': ['defaultPrice'],
  'SEO': ['seoTitleEn', 'seoTitleAr', 'seoDescriptionEn', 'seoDescriptionAr', 'searchKeywords'],
  'Internal': ['internalNotes', 'validationStatus', 'confidenceScore', 'pieces', 'setCount', 'shape', 'finish', 'additionalInfo'],
};

/**
 * Panel component that shows a comparison between original imported values
 * and current edited values for a product. Includes undo buttons to revert
 * individual fields or all fields back to the original imported values.
 */
export function ViewChangesPanel({ product, changes, onUndoComplete }: ViewChangesPanelProps) {
  const [undoingField, setUndoingField] = useState<string | null>(null);
  const [undoingAll, setUndoingAll] = useState(false);
  const [open, setOpen] = useState(false);

  if (changes.length === 0) {
    return null;
  }

  // Group changes by section
  const groupedChanges: Record<string, FieldChange[]> = {};
  for (const change of changes) {
    for (const [section, fields] of Object.entries(FIELD_GROUPS)) {
      if (fields.includes(change.field)) {
        if (!groupedChanges[section]) groupedChanges[section] = [];
        groupedChanges[section].push(change);
        break;
      }
    }
    // If not found in any group, add to 'Other'
    if (!Object.values(FIELD_GROUPS).flat().includes(change.field)) {
      if (!groupedChanges['Other']) groupedChanges['Other'] = [];
      groupedChanges['Other'].push(change);
    }
  }

  /** Undo a single field by calling the undo API with that one field. */
  const handleUndoField = async (field: string) => {
    setUndoingField(field);
    try {
      const res = await fetch(`/api/products/${product.id}/undo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: [field] }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to undo field');
      }
      toast.success(`Reverted ${FIELD_LABELS[field] || field} to original value`);
      if (onUndoComplete && data.product) {
        onUndoComplete(data.product as Product);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to undo field');
    } finally {
      setUndoingField(null);
    }
  };

  /** Undo all modified fields at once. */
  const handleUndoAll = async () => {
    setUndoingAll(true);
    try {
      const res = await fetch(`/api/products/${product.id}/undo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: [] }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to undo all changes');
      }
      toast.success(`Reverted all ${changes.length} modified field(s) to original values`);
      if (onUndoComplete && data.product) {
        onUndoComplete(data.product as Product);
      }
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to undo all changes');
    } finally {
      setUndoingAll(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <Eye className="h-4 w-4" />
          View Changes
          <Badge variant="destructive" className="ml-1 h-5 px-1.5">
            {changes.length}
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <Edit3 className="h-5 w-5 text-red-500" />
            Modified Fields
            <Badge variant="outline" className="text-muted-foreground">
              {product.ndNumber || product.sourceRow || 'New Product'}
            </Badge>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleUndoAll}
              disabled={undoingAll || undoingField !== null}
              className="ml-auto h-8 gap-1.5"
            >
              {undoingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              Undo All
            </Button>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4">
            {Object.entries(groupedChanges).map(([section, sectionChanges]) => (
              <Card key={section}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {section}
                    <Badge variant="secondary" className="text-xs">
                      {sectionChanges.length} changes
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sectionChanges.map((change) => (
                    <div
                      key={change.field}
                      className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-sm items-center"
                    >
                      <div className="font-medium text-muted-foreground">
                        {FIELD_LABELS[change.field] || change.field}
                      </div>
                      <div className="text-gray-500 truncate" title={change.original || 'Empty'}>
                        {change.original || <span className="text-gray-400 italic">empty</span>}
                      </div>
                      <div className="text-red-600 font-medium truncate" title={change.current || 'Empty'}>
                        {change.current || <span className="text-gray-400 italic">empty</span>}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUndoField(change.field)}
                        disabled={undoingAll || undoingField !== null}
                        className="h-7 px-2 gap-1 text-xs shrink-0"
                        title={`Revert ${FIELD_LABELS[change.field] || change.field} to original`}
                      >
                        {undoingField === change.field ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Undo2 className="h-3 w-3" />
                        )}
                        Undo
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
            <div className="text-xs text-muted-foreground pt-2 space-y-1">
              <div>
                <span className="font-medium">Legend:</span>
                <span className="ml-2">Original → Current (modified)</span>
              </div>
              <div className="text-amber-600">
                <Undo2 className="h-3 w-3 inline mr-1" />
                Undo reverts the field to its original imported value. The red highlight will disappear.
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Compact inline badge showing number of modified fields.
 */
export function ModifiedCountBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <Badge variant="destructive" className="gap-1">
      <Edit3 className="h-3 w-3" />
      {count} modified
    </Badge>
  );
}
