import { db } from '@/db';
import { journalEntries, journalLines } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { requireUser } from '@/lib/auth';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Calendar, FileText, AlertOctagon, ArrowLeft } from 'lucide-react';
import { ExportJournalsButton } from '@/components/ExportJournalsButton';

export default async function AccountingJournalsPage() {
  // 1. Ambil sesi asli user
  const session = await requireUser();

  // 2. Guard RBAC khusus Buku Besar: Hanya OWNER dan FINANCE
  if (session.role !== 'OWNER' && session.role !== 'FINANCE') {
    return (
      <div className="container mx-auto py-16 px-4 max-w-xl">
        <Card className="border-red-200 bg-red-50/50 text-center shadow-md">
          <CardHeader className="space-y-3">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl font-bold text-red-900">Akses Ditolak</CardTitle>
            <CardDescription className="text-red-700 text-sm">
              Hanya Owner dan Finance yang dapat melihat Buku Besar.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            <p className="text-xs text-muted-foreground">
              Peran Anda saat ini adalah <span className="font-semibold text-foreground uppercase">{session.role}</span> ({session.name}). Hubungi Owner jika Anda membutuhkan akses ini.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 3. Ambil semua entri jurnal diurutkan dari yang terbaru (difilter organizationId)
  const entries = await db
    .select()
    .from(journalEntries)
    .where(desc(journalEntries.createdAt) ? undefined : undefined) // or filter organizationId if needed
    .orderBy(desc(journalEntries.createdAt));

  // Filter berdasarkan organizationId session
  const orgEntries = entries.filter((e) => e.organizationId === session.organizationId);

  // Ambil seluruh lines untuk entri-entri tersebut
  const lines = await db.select().from(journalLines);

  const linesByEntryId = lines.reduce((acc, line) => {
    if (!acc[line.journalEntryId]) {
      acc[line.journalEntryId] = [];
    }
    acc[line.journalEntryId].push(line);
    return acc;
  }, {} as Record<string, typeof lines>);

  const formatRupiah = (val: string | number) =>
    Number(val) === 0
      ? '-'
      : new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          maximumFractionDigits: 0,
        }).format(Number(val));

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl space-y-8">
      <div>
        <Link
          href="/"
          className="group inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3.5 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-800 hover:text-white active:scale-[0.98] w-fit mb-4"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Kembali ke Dashboard</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-xl border shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs uppercase font-semibold">
                General Ledger
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-mono">
                {session.name} ({session.role})
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" /> Buku Besar Jurnal Akuntansi
            </h1>
            <p className="text-sm text-muted-foreground">
              Catatan transaksi otomatis (Immutable Ledger) yang mencatat setiap penerbitan invoice, pembayaran, dan biaya operasional.
            </p>
          </div>
          <div className="flex items-start justify-between gap-2">
            {(session.role === 'OWNER' || session.role === 'FINANCE') && (
              <ExportJournalsButton 
                organizationId={session.organizationId} 
                hasData={orgEntries.length > 0} 
              />
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {orgEntries.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              Belum ada jurnal akuntansi tercatat.
            </CardContent>
          </Card>
        ) : (
          orgEntries.map((entry) => {
            const entryLines = linesByEntryId[entry.id] || [];
            const totalDebit = entryLines.reduce((sum, l) => sum + Number(l.debit), 0);
            const totalCredit = entryLines.reduce((sum, l) => sum + Number(l.credit), 0);

            return (
              <Card key={entry.id} className="overflow-hidden shadow-sm hover:shadow transition-shadow">
                <CardHeader className="bg-muted/30 pb-4 border-b">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {entry.referenceType}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> {entry.entryDate}
                        </span>
                      </div>
                      <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary shrink-0" />
                        {entry.description}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/10">
                        <TableHead className="w-[15%]">Kode Akun</TableHead>
                        <TableHead className="w-[45%]">Nama Akun</TableHead>
                        <TableHead className="w-[20%] text-right">Debit</TableHead>
                        <TableHead className="w-[20%] text-right">Kredit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entryLines.map((line) => (
                        <TableRow key={line.id} className="text-sm">
                          <TableCell className="font-mono font-medium text-muted-foreground">
                            {line.accountCode}
                          </TableCell>
                          <TableCell className="font-medium text-foreground">
                            {line.accountName}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatRupiah(line.debit)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatRupiah(line.credit)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Baris Total Debit & Kredit */}
                      <TableRow className="bg-muted/30 font-semibold text-xs">
                        <TableCell colSpan={2} className="text-right">
                          Total:
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatRupiah(totalDebit)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatRupiah(totalCredit)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
