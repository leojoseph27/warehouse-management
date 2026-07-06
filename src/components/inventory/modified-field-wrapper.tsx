'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ModifiedFieldWrapperProps {
  fieldName: string;
  isModified: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper component that highlights a form field with red styling
 * when the field value has been modified from the original ERP import.
 */
export function ModifiedFieldWrapper({
  fieldName,
  isModified,
  children,
  className,
}: ModifiedFieldWrapperProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      {isModified && (
        <div className="absolute -right-1 -top-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-sm" />
      )}
    </div>
  );
}

/**
 * CSS class generator for modified field styling.
 * Returns red text and border classes when the field is modified.
 */
export function getModifiedFieldClasses(isModified: boolean, baseClasses: string = ''): string {
  if (isModified) {
    return `${baseClasses} text-red-600 border-red-400 focus:border-red-500 focus:ring-red-500/20`;
  }
  return baseClasses;
}

/**
 * Badge component to show "Modified" indicator next to field label.
 */
export function ModifiedBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 ml-2">
      Modified
    </span>
  );
}