/**
 * Multi-value field helpers — shared between API, import, export, and UI.
 *
 * Storage format (in DB / API / Excel):
 *   Simple multi-value:  "23, 32, 43"
 *   Named multi-value:   "Knife: 23, Scissors: 32, Peeler: 43"
 *   Single value:        "23"  (backward compatible)
 *
 * Parsing rules:
 *   - Split by comma
 *   - Each segment is trimmed
 *   - If a segment contains a colon, the part before the colon is the item
 *     name, and the part after is the value
 *   - Empty segments are dropped
 *   - Empty/whitespace-only strings parse to an empty array
 *
 * Serialization rules:
 *   - Join segments with ", "
 *   - Named segments: "Name: value"
 *   - Unnamed segments: "value"
 *   - Empty array → null (for DB storage) or "" (for form fields)
 */

export interface MultiValueEntry {
  /** Optional item name, e.g. "Knife". If absent, the value is unnamed. */
  name?: string;
  /** The value, e.g. "23" or "Red". Always a string. */
  value: string;
}

/**
 * Parse a stored multi-value string into an array of entries.
 *
 * Examples:
 *   parseMultiValue("23, 32, 43")
 *     → [{value:"23"}, {value:"32"}, {value:"43"}]
 *
 *   parseMultiValue("Knife: 23, Scissors: 32")
 *     → [{name:"Knife", value:"23"}, {name:"Scissors", value:"32"}]
 *
 *   parseMultiValue("23")
 *     → [{value:"23"}]
 *
 *   parseMultiValue(null) → []
 *   parseMultiValue("") → []
 *   parseMultiValue("  ,  ") → []
 */
export function parseMultiValue(stored: string | null | undefined): MultiValueEntry[] {
  if (!stored || typeof stored !== 'string') return [];

  return stored
    .split(',')
    .map((segment) => {
      const trimmed = segment.trim();
      if (!trimmed) return null;

      const colonIdx = trimmed.indexOf(':');
      if (colonIdx > 0) {
        // Named segment: "Knife: 23"
        const name = trimmed.slice(0, colonIdx).trim();
        const value = trimmed.slice(colonIdx + 1).trim();
        if (!value) return null;
        return { name: name || undefined, value } as MultiValueEntry;
      }

      // Unnamed segment: "23"
      return { value: trimmed } as MultiValueEntry;
    })
    .filter((entry): entry is MultiValueEntry => entry !== null);
}

/**
 * Serialize an array of entries back to the stored string format.
 *
 * Examples:
 *   serializeMultiValue([{value:"23"}, {value:"32"}])
 *     → "23, 32"
 *
 *   serializeMultiValue([{name:"Knife", value:"23"}])
 *     → "Knife: 23"
 *
 *   serializeMultiValue([]) → null  (for DB storage)
 */
export function serializeMultiValue(entries: MultiValueEntry[]): string | null {
  const segments = entries
    .filter((e) => e.value && e.value.trim())
    .map((e) => {
      const value = e.value.trim();
      const name = e.name?.trim();
      return name ? `${name}: ${value}` : value;
    });

  if (segments.length === 0) return null;
  return segments.join(', ');
}

/**
 * Parse a stored multi-value string into a simple array of value strings
 * (dropping any item names). Useful for backward-compatible display where
 * only the values matter.
 *
 * Example:
 *   parseMultiValueSimple("Knife: 23, Scissors: 32") → ["23", "32"]
 */
export function parseMultiValueSimple(stored: string | null | undefined): string[] {
  return parseMultiValue(stored).map((e) => e.value);
}

/**
 * Serialize a simple array of value strings into the stored format.
 * No item names are used.
 *
 * Example:
 *   serializeMultiValueSimple(["23", "32"]) → "23, 32"
 */
export function serializeMultiValueSimple(values: string[]): string | null {
  return serializeMultiValue(values.map((v) => ({ value: v })));
}
