import React, { useEffect } from 'react';
import { useParams, useSearch } from 'wouter';
import { useGetBulletin, getGetBulletinQueryKey } from '@workspace/api-client-react';
import { BulletinPreview } from '@/components/bulletins/BulletinPreview';
import { Skeleton } from '@/components/ui/skeleton';

export function PreviewBulletin() {
  const { id: idParam } = useParams<{ id: string }>();
  const id = parseInt(idParam || '0', 10);
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const shouldPrint = searchParams.get('print') === 'true';

  const { data: bulletin, isLoading } = useGetBulletin(id, {
    query: {
      enabled: !!id,
      queryKey: getGetBulletinQueryKey(id)
    }
  });

  useEffect(() => {
    if (bulletin && shouldPrint && !isLoading) {
      // Small delay to let images load
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [bulletin, isLoading, shouldPrint]);

  if (isLoading || !bulletin) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted">
        <Skeleton className="h-[297mm] w-[210mm] max-w-full max-h-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200 print:bg-white flex justify-center p-8 print:p-0 overflow-auto">
      <div className="w-[210mm] min-h-[297mm] bg-white shadow-2xl print:shadow-none shrink-0 print:m-0">
        <BulletinPreview data={bulletin} />
      </div>
    </div>
  );
}
