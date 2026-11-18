import { db } from '@/db';
import { journalEntries, journalLines } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Calendar, FileText } from 'lucide-react';

export default async function AccountingJournalsPage() {
  // Ambil semua entri jurnal diurutkan dari yang terbaru
  const entries = await db
    .select()
    .from(journalEntries)
    .orderBy(desc(journalEntries.createdAt));

  // Ambil seluruh lines untuk entri-entri tersebut
  const lines = await db.select().from(journalLines);

  // Group lines berdasarkan journalEntryId
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-xl border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs uppercase font-semibold">
              General Ledger
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" /> Buku Besar Jurnal Akuntansi
          </h1>
          <p className="text-sm text-muted-foreground">
            Catatan transaksi otomatis (Immutable Ledger) yang mencatat setiap penerbitan invoice, pembayaran, dan biaya operasional.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {entries.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              Belum ada jurnal akuntansi tercatat.
            </CardContent>
          </Card>
        ) : (
          entries.map((entry) => {
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
