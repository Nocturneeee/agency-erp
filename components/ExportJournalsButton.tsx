'use client';

import { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';

interface ExportJournalsButtonProps {
  organizationId: string;
  hasData: boolean;
}

export function ExportJournalsButton({ organizationId, hasData }: ExportJournalsButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    if (!hasData) return;
    
    setIsExporting(true);
    try {
      const response = await fetch(`/api/accounting/journals/export?organizationId=${organizationId}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.status === 403) {
        setIsExporting(false);
        return alert('Akses ditolak: hanya Owner dan Finance yang boleh mengunduh laporan.');
      }

      if (!response.ok) {
        setIsExporting(false);
        throw new Error('Gagal mengunduh file.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'Buku-Besar-Jurnal.xlsx';
      if (contentDisposition && contentDisposition.includes('filename=')) {
        filename = contentDisposition.split('filename=')[1].replace(/['"]/g, '');
      }
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Terjadi kesalahan saat mengekspor file Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      type="button"
      className={hasData 
        ? "rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 inline-flex items-center gap-1.5"
        : "rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 opacity-50 cursor-not-allowed inline-flex items-center gap-1.5"
      }
      onClick={handleExportExcel}
    >
      <FileSpreadsheet className="h-4 w-4" /> {isExporting ? 'Mengekspor...' : 'Export Excel'}
    </button>
  );
}