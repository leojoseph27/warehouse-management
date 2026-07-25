'use client';

import { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { flushSync } from 'react-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Plus, GripVertical } from 'lucide-react';
import { parseMultiValue, serializeMultiValue, type MultiValueEntry } from '@/lib/multi-value';

interface NamedMultiValueInputProps {
  label: string;
  /** The stored string value (e.g. "23, 32, 43" or "Knife: 23, Scissors: 32") */
  value: string | null;
  /** Called with the new serialized string (or null if empty) */
  onChange: (value: string | null) => void;
  placeholder?: string;
  /** Placeholder for the item-name input. If omitted, the name input is hidden. */
  namePlaceholder?: string;
  /** Input type for the value field — "text" by default, "number" for dimensions */
  inputType?: 'text' | 'number';
  /** Step for number inputs */
  step?: string;
  /** Whether to show the item-name field. Defaults to true. */
  allowNames?: boolean;
}

export interface NamedMultiValueInputHandle {
  /** Commit any pending text in the inputs to the values array. */
  flush: () => void;
}

/**
 * A multi-value input that supports both:
 *   - Simple values:  [23, 32, 43]            → stored as "23, 32, 43"
 *   - Named values:   [Knife:23, Scissors:32] → stored as "Knife: 23, Scissors: 32"
 *
 * Features:
 *   - Add/remove/reorder entries
 *   - Optional item-name field (e.g. "Knife", "Scissors")
 *   - Number or text input mode
 *   - Auto-commit on blur (no value lost when clicking Save)
 *   - Flush API for parent forms to call before saving
 *
 * The serialized format is comma-separated, with optional "Name: value" segments.
 * This format is Excel-friendly: the entire value goes in ONE Excel cell.
 */
export const NamedMultiValueInput = forwardRef<NamedMultiValueInputHandle, NamedMultiValueInputProps>(
  function NamedMultiValueInput({
    label,
    value,
    onChange,
    placeholder,
    namePlaceholder = 'Item name (optional)',
    inputType = 'text',
    step,
    allowNames = true,
  }, ref) {
    // Parse the stored string into entries for internal state
    const [entries, setEntries] = useState<MultiValueEntry[]>(() => parseMultiValue(value));
    // New-entry inputs
    const [newName, setNewName] = useState('');
    const [newValue, setNewValue] = useState('');

    // Keep entries in sync when the external `value` prop changes
    // (e.g. when the form loads a different product)
    useEffect(() => {
      const parsed = parseMultiValue(value);
      setEntries(parsed);
    }, [value]);

    // Refs for flush() — always hold the latest values
    const entriesRef = useRef(entries);
    entriesRef.current = entries;
    const newNameRef = useRef(newName);
    newNameRef.current = newName;
    const newValueRef = useRef(newValue);
    newValueRef.current = newValue;
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    // Helper: commit entries to parent
    const commit = useCallback((next: MultiValueEntry[]) => {
      setEntries(next);
      onChangeRef.current(serializeMultiValue(next));
    }, []);

    const addEntry = useCallback(() => {
      const trimmedValue = newValueRef.current.trim();
      const trimmedName = newNameRef.current.trim();
      if (!trimmedValue) return;
      const entry: MultiValueEntry = { value: trimmedValue };
      if (trimmedName) entry.name = trimmedName;
      const next = [...entriesRef.current, entry];
      flushSync(() => {
        commit(next);
      });
      setNewName('');
      setNewValue('');
    }, [commit]);

    const flush = useCallback(() => {
      const trimmedValue = newValueRef.current.trim();
      const trimmedName = newNameRef.current.trim();
      if (!trimmedValue) return;
      const entry: MultiValueEntry = { value: trimmedValue };
      if (trimmedName) entry.name = trimmedName;
      // Avoid duplicates
      const exists = entriesRef.current.some(
        (e) => e.value === entry.value && (e.name || '') === (entry.name || '')
      );
      if (exists) {
        setNewName('');
        setNewValue('');
        return;
      }
      flushSync(() => {
        commit([...entriesRef.current, entry]);
      });
      setNewName('');
      setNewValue('');
    }, [commit]);

    useImperativeHandle(ref, () => ({ flush }), [flush]);

    const removeEntry = useCallback((index: number) => {
      const next = entriesRef.current.filter((_, i) => i !== index);
      commit(next);
    }, [commit]);

    const updateEntry = useCallback((index: number, field: 'name' | 'value', val: string) => {
      const next = entriesRef.current.map((e, i) =>
        i === index ? { ...e, [field]: val } : e
      );
      commit(next);
    }, [commit]);

    const moveEntry = useCallback((index: number, direction: -1 | 1) => {
      const target = index + direction;
      if (target < 0 || target >= entriesRef.current.length) return;
      const next = [...entriesRef.current];
      [next[index], next[target]] = [next[target], next[index]];
      commit(next);
    }, [commit]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addEntry();
      }
    };

    const handleBlur = () => {
      // Auto-commit on blur (like the simple MultiValueInput)
      const trimmedValue = newValueRef.current.trim();
      if (trimmedValue) {
        const activeEl = document.activeElement;
        const isPlusButton = activeEl?.closest('button[data-plus-button]') ||
          activeEl?.getAttribute('data-plus-button') !== null;
        if (!isPlusButton) {
          flush();
        }
      }
    };

    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <div className="space-y-2">
          {/* Existing entries */}
          {entries.map((entry, index) => (
            <div key={index} className="flex items-center gap-1.5">
              {/* Reorder buttons */}
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => moveEntry(index, -1)}
                  disabled={index === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors p-0.5 leading-none"
                  title="Move up"
                >
                  <span className="text-xs">▲</span>
                </button>
                <button
                  type="button"
                  onClick={() => moveEntry(index, 1)}
                  disabled={index === entries.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors p-0.5 leading-none"
                  title="Move down"
                >
                  <span className="text-xs">▼</span>
                </button>
              </div>

              {/* Name input (optional) */}
              {allowNames && (
                <Input
                  type="text"
                  value={entry.name || ''}
                  onChange={(e) => updateEntry(index, 'name', e.target.value)}
                  placeholder="Item name"
                  className="flex-1 h-10 max-w-[140px] text-sm"
                />
              )}

              {/* Value input */}
              <Input
                type={inputType}
                step={step}
                value={entry.value}
                onChange={(e) => updateEntry(index, 'value', e.target.value)}
                className="flex-1 h-10 text-sm"
              />

              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeEntry(index)}
                className="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0"
                title="Remove"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}

          {/* Add new entry row */}
          <div className="flex items-center gap-1.5">
            {allowNames && (
              <Input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                placeholder={namePlaceholder}
                className="flex-1 h-10 max-w-[140px] text-sm"
              />
            )}
            <Input
              type={inputType}
              step={step}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              placeholder={placeholder || `Add ${label.toLowerCase()}...`}
              className="flex-1 h-10 text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addEntry}
              disabled={!newValue.trim()}
              className="h-10 px-3 shrink-0"
              data-plus-button="true"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Preview of the serialized value */}
          {entries.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Stored as: <code className="bg-muted px-1 rounded">
                {serializeMultiValue(entries) || '(empty)'}
              </code>
            </p>
          )}
        </div>
      </div>
    );
  }
);
