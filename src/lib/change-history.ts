/**
 * Change History — Old Value Tracking
 *
 * When a product field is updated from a non-null value to a different value,
 * the old value is preserved in a JSON map (`oldValues` column on Product).
 *
 * Rules:
 *   1. If the field's current value is null/empty → do NOT create an old value
 *      (this is the first time a value is being entered)
 *   2. If the field's current value equals the new value → no change, skip
 *   3. If the field already has an old value stored → keep the FIRST one
 *      (do NOT overwrite the original historical value on subsequent edits)
 *   4. If the field's current value is non-null AND different from the new
 *      value AND no old value exists yet → save the current value as the
 *      old value
 */

/** Fields that are tracked for change history. Same as TRACKED_FIELDS in
 *  inventory-store.ts and export route. */
export const TRACKED_FIELDS_FOR_HISTORY = [
  'productId', 'sku', 'ndNumber', 'barcode', 'legacyCode', 'brand', 'model',
  'department', 'category', 'subcategory', 'productFamily', 'productType',
  'nameAr', 'enCatalog', 'nameEn', 'shortDescAr', 'shortDescEn', 'longDescAr', 'longDescEn',
  'color', 'material', 'capacity', 'capacityUnit', 'weight', 'weightUnit',
  'length', 'width', 'height', 'diameter', 'dimensionUnit',
  'countryOfOrigin', 'unit', 'minSalesMultiples', 'defaultPrice',
  'seoTitleEn', 'seoTitleAr', 'seoDescriptionEn', 'seoDescriptionAr', 'searchKeywords',
  'internalNotes', 'validationStatus', 'confidenceScore', 'pieces', 'setCount', 'shape', 'finish', 'additionalInfo',
] as const;

const TRACKED_SET = new Set<string>(TRACKED_FIELDS_FOR_HISTORY);

/**
 * Parse the oldValues JSON string from the DB into a Map.
 * Returns an empty Map if oldValues is null/empty/invalid.
 */
export function parseOldValues(oldValuesJson: string | null | undefined): Record<string, string> {
  if (!oldValuesJson) return {};
  try {
    const parsed = JSON.parse(oldValuesJson);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<string, string>;
    }
  } catch {
    // Invalid JSON — return empty
  }
  return {};
}

/**
 * Serialize an old-values map back to a JSON string for DB storage.
 * Returns null if the map is empty (so the DB column stays null for
 * products with no modifications).
 */
export function serializeOldValues(oldValues: Record<string, string>): string | null {
  const filtered: Record<string, string> = {};
  for (const [key, value] of Object.entries(oldValues)) {
    if (value != null && value !== '') {
      filtered[key] = String(value);
    }
  }
  if (Object.keys(filtered).length === 0) return null;
  return JSON.stringify(filtered);
}

/**
 * Compute the updated oldValues map given the current product state and
 * the new values being applied.
 *
 * @param currentOldValuesJson - The current `oldValues` JSON string from the DB
 * @param currentProduct - The product's current field values (before update)
 * @param newValues - The new values being applied (only changed fields)
 * @returns The updated JSON string (or null if no old values to store)
 */
export function computeUpdatedOldValues(
  currentOldValuesJson: string | null | undefined,
  currentProduct: Record<string, any>,
  newValues: Record<string, any>
): string | null {
  const oldValues = parseOldValues(currentOldValuesJson);

  for (const field of Object.keys(newValues)) {
    // Only track known fields
    if (!TRACKED_SET.has(field)) continue;

    const currentValue = currentProduct[field];
    const newValue = newValues[field];

    // Rule 1: If current value is null/empty → skip (first-time entry)
    if (currentValue == null || currentValue === '') continue;

    // Rule 2: If values are the same → skip (no change)
    const currentStr = String(currentValue).trim();
    const newStr = newValue == null ? '' : String(newValue).trim();
    if (currentStr === newStr) continue;

    // Rule 3: If an old value already exists for this field → keep it
    if (field in oldValues) continue;

    // Rule 4: Save the current value as the old value
    oldValues[field] = currentStr;
  }

  return serializeOldValues(oldValues);
}

/**
 * Get the "Old {field}" value from the oldValues JSON.
 * Returns null if no old value exists for the field.
 */
export function getOldValue(
  oldValuesJson: string | null | undefined,
  field: string
): string | null {
  const oldValues = parseOldValues(oldValuesJson);
  return oldValues[field] ?? null;
}

/**
 * Generate a list of "Old {field}" column definitions for the export.
 * Each tracked field gets a corresponding "Old {Header}" column.
 */
export function getOldFieldLabel(field: string): string {
  // Convert camelCase to Title Case for the label
  const titleCase = field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
  return `Old ${titleCase}`;
}
