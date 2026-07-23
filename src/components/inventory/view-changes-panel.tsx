'use client';

import { Fragment } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Eye, Edit3 } from 'lucide-react';
import { FieldChange, Product } from '@/store/inventory-store';

interface ViewChangesPanelProps {
  product: Product;
  changes: FieldChange[];
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
 * and current edited values for a product.
 */
export function ViewChangesPanel({ product, changes }: ViewChangesPanelProps) {
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

  return (
    <Dialog>
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
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-red-500" />
            Modified Fields
            <Badge variant="outline" className="text-muted-foreground">
              {product.ndNumber || product.sourceRow || 'New Product'}
            </Badge>
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
                    <div key={change.field} className="grid grid-cols-3 gap-2 text-sm">
                      <div className="font-medium text-muted-foreground">
                        {FIELD_LABELS[change.field] || change.field}
                      </div>
                      <div className="text-gray-500 truncate" title={change.original || 'Empty'}>
                        {change.original || <span className="text-gray-400 italic">empty</span>}
                      </div>
                      <div className="text-red-600 font-medium truncate" title={change.current || 'Empty'}>
                        {change.current || <span className="text-gray-400 italic">empty</span>}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
            <div className="text-xs text-muted-foreground pt-2">
              <span className="font-medium">Legend:</span>
              <span className="ml-2">Original → Current (modified)</span>
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