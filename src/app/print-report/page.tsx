'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PrintReport } from '@/components/inventory/print-report';

function PrintReportPageContent() {
  const searchParams = useSearchParams();

  // Parse URL params
  const srFrom = searchParams.get('srFrom');
  const srTo = searchParams.get('srTo');
  const columns = searchParams.get('columns');
  const orientation = (searchParams.get('orientation') || 'landscape') as 'portrait' | 'landscape';
  const onlyModified = searchParams.get('onlyModified') === '1';

  const srFromNum = srFrom ? parseInt(srFrom, 10) : null;
  const srToNum = srTo ? parseInt(srTo, 10) : null;
  const selectedFields = columns ? columns.split(',').map((s) => s.trim()).filter(Boolean) : null;

  return (
    <PrintReport
      srFrom={srFromNum}
      srTo={srToNum}
      selectedFields={selectedFields}
      orientation={orientation}
      onlyModified={onlyModified}
    />
  );
}

export default function PrintReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    }>
      <PrintReportPageContent />
    </Suspense>
  );
}
