import { db } from '@/db';
import { 
  projects, 
  clients, 
  quotations, 
  milestones, 
  invoices, 
  timeEntries, 
  projectExpenses, 
  users 
} from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Calendar, 
  Clock, 
  FileText, 
  CheckCircle2, 
  Building2, 
  TrendingUp, 
  Users, 
  Receipt, 
  AlertTriangle 
} from 'lucide-react';
import { IssueInvoiceModalWrapper } from '@/components/IssueInvoiceModalWrapper';
import { LogTimeModal } from '@/components/LogTimeModal';
import { AddExpenseModal } from '@/components/AddExpenseModal';
import { ReceivePaymentModal } from '@/components/ReceivePaymentModal';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;

  // 1. Ambil data Project beserta Client & Quotation
  const [projectData] = await db
    .select({
      project: projects,
      client: clients,
      quotation: quotations,
    })
    .from(projects)
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .leftJoin(quotations, eq(projects.quotationId, quotations.id))
    .where(eq(projects.id, id));

  if (!projectData) {
    notFound();
  }

  const { project, client, quotation } = projectData;
  const organizationId = project.organizationId;

  // 2. Ambil daftar milestones untuk project ini
  const milestoneList = await db
    .select({
      milestone: milestones,
      invoice: invoices,
    })
    .from(milestones)
    .leftJoin(invoices, eq(milestones.invoiceId, invoices.id))
    .where(eq(milestones.projectId, project.id));

  // 3. Ambil daftar invoices milik proyek ini
  const invoiceList = await db
    .select()
    .from(invoices)
    .where(eq(invoices.projectId, project.id))
    .orderBy(desc(invoices.createdAt));

  // 4. Ambil daftar users berdasarkan organizationId proyek (untuk dropdown staf timesheet)
  const orgUsers = await db
    .select()
    .from(users)
    .where(eq(users.organizationId, organizationId));

  // 5. Ambil daftar timeEntries milik proyek ini (di-join dengan users)
  const timeEntriesList = await db
    .select({
      entry: timeEntries,
      user: users,
    })
    .from(timeEntries)
    .innerJoin(users, eq(timeEntries.userId, users.id))
    .where(eq(timeEntries.projectId, project.id))
    .orderBy(desc(timeEntries.workDate));

  // 6. Ambil daftar projectExpenses milik proyek ini
  const expensesList = await db
    .select()
    .from(projectExpenses)
    .where(eq(projectExpenses.projectId, project.id))
    .orderBy(desc(projectExpenses.expenseDate));

  // ==========================================================================
  // KALKULASI PROFITABILITAS PROYEK (PROJECT P&L)
  // ==========================================================================
  const contractValue = quotation ? Number(quotation.totalAmount || 0) : 0;

  // Total Biaya Jam Kerja Tim = sum(hours * hourlyCostRateSnapshot)
  const totalLaborCost = timeEntriesList.reduce((sum, { entry }) => {
    const hours = Number(entry.hours || 0);
    const rate = Number(entry.hourlyCostRateSnapshot || 0);
    return sum + hours * rate;
  }, 0);

  // Total Biaya Vendor / Freelancer = sum(amount)
  const totalExpenseCost = expensesList.reduce((sum, exp) => {
    return sum + Number(exp.amount || 0);
  }, 0);

  const totalCost = totalLaborCost + totalExpenseCost;
  const netProfit = contractValue - totalCost;
  const grossMarginPercentage = contractValue > 0 ? (netProfit / contractValue) * 100 : 0;
  const isLowMargin = grossMarginPercentage < 30;

  const formatRupiah = (val: string | number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(Number(val));

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl space-y-8">
      {/* HEADER INFO PROYEK */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-xl border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs uppercase font-semibold">
              {project.status.replace('_', ' ')}
            </Badge>
            {quotation && (
              <span className="text-xs text-muted-foreground font-mono">
                Ref: {quotation.quotationNumber}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{project.name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
            <Building2 className="w-4 h-4" />
            <span>{client.companyName}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm bg-muted/50 p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Budget Jam</p>
              <p className="font-semibold text-foreground">{project.budgetHours} Jam</p>
            </div>
          </div>
          <div className="w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Jadwal</p>
              <p className="font-semibold text-foreground">
                {project.startDate || '-'} s/d {project.deadline || '-'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 1. KARTU RINGKASAN PROFITABILITAS PROYEK (PROJECT P&L) */}
      <Card className="shadow-sm border-border/60 bg-gradient-to-br from-card via-muted/10 to-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Analisis Profitabilitas Proyek (Project P&L)
            </CardTitle>
            <CardDescription>
              Perhitungan real-time nilai kontrak dikurangi HPP tenaga kerja dan biaya vendor eksternal.
            </CardDescription>
          </div>
          {isLowMargin && contractValue > 0 && (
            <Badge variant="destructive" className="gap-1 px-3 py-1 text-xs">
              <AlertTriangle className="w-3.5 h-3.5" /> Margin Rendah (&lt; 30%)
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-background p-4 rounded-xl border shadow-2xs space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Nilai Kontrak</span>
              <p className="text-xl font-bold font-mono text-foreground">{formatRupiah(contractValue)}</p>
            </div>
            <div className="bg-background p-4 rounded-xl border shadow-2xs space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Biaya Tenaga Kerja</span>
              <p className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
                {formatRupiah(totalLaborCost)}
              </p>
            </div>
            <div className="bg-background p-4 rounded-xl border shadow-2xs space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Biaya Vendor/Eksternal</span>
              <p className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                {formatRupiah(totalExpenseCost)}
              </p>
            </div>
            <div className="bg-background p-4 rounded-xl border shadow-2xs space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Sisa Profit Bersih</span>
              <p className={`text-xl font-bold font-mono ${netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                {formatRupiah(netProfit)}
              </p>
            </div>
            <div className="bg-background p-4 rounded-xl border shadow-2xs space-y-1">
              <span className="text-xs text-muted-foreground font-medium">Gross Margin</span>
              <p className={`text-xl font-bold font-mono ${isLowMargin ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {grossMarginPercentage.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. DAFTAR TERMIN PEMBAYARAN (MILESTONES) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Termin Pembayaran &amp; Penagihan (Milestones)</CardTitle>
          <CardDescription>
            Daftar tahapan penagihan proyek. Terbitkan invoice untuk termin yang belum ditagih.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[40%]">Judul Termin</TableHead>
                  <TableHead>Nominal Tagihan</TableHead>
                  <TableHead>Status Termin</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {milestoneList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Belum ada termin pembayaran untuk proyek ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  milestoneList.map(({ milestone, invoice }) => {
                    const isBilled = Boolean(milestone.invoiceId);
                    return (
                      <TableRow key={milestone.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span>{milestone.title}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {formatRupiah(milestone.billableAmount)}
                        </TableCell>
                        <TableCell>
                          {isBilled ? (
                            <div className="flex flex-col gap-1">
                              <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/30 w-fit">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Sudah Ditagih
                              </Badge>
                              {invoice && (
                                <span className="text-xs text-muted-foreground font-mono">
                                  {invoice.invoiceNumber} (Net: {formatRupiah(invoice.netReceivable)})
                                </span>
                              )}
                            </div>
                          ) : (
                            <Badge variant="secondary" className="w-fit">
                              Belum Ditagih
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isBilled ? (
                            <Button variant="ghost" size="sm" disabled className="text-xs">
                              Selesai
                            </Button>
                          ) : (
                            <IssueInvoiceModalWrapper
                              milestoneId={milestone.id}
                              milestoneTitle={milestone.title}
                              billableAmount={Number(milestone.billableAmount)}
                              currentOrgId={organizationId}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 3. BAGIAN DAFTAR TAGIHAN (INVOICES) - DI BAWAH MILESTONES */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" /> Daftar Tagihan (Invoices)
          </CardTitle>
          <CardDescription>
            Riwayat invoice resmi yang telah diterbitkan untuk proyek ini beserta status pelunasannya.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-[14%]">Nomor Invoice</TableHead>
                  <TableHead className="w-[12%]">Tgl Terbit</TableHead>
                  <TableHead className="w-[12%]">Jatuh Tempo</TableHead>
                  <TableHead className="w-[13%] text-right">Subtotal</TableHead>
                  <TableHead className="w-[11%] text-right">PPN (11%)</TableHead>
                  <TableHead className="w-[11%] text-right">PPh 23 (2%)</TableHead>
                  <TableHead className="w-[14%] text-right">Tagihan Bersih</TableHead>
                  <TableHead className="w-[13%] text-center">Status &amp; Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoiceList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Belum ada invoice yang diterbitkan untuk proyek ini.
                    </TableCell>
                  </TableRow>
                ) : (
                  invoiceList.map((inv) => {
                    const isPaid = inv.status === 'PAID';
                    const isPosted = inv.status === 'POSTED';

                    return (
                      <TableRow key={inv.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono font-semibold text-xs text-foreground">
                          {inv.invoiceNumber}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {inv.issueDate}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {inv.dueDate}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatRupiah(inv.subtotal)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                          {formatRupiah(inv.ppnAmount)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                          {formatRupiah(inv.pph23Amount)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-foreground">
                          {formatRupiah(inv.netReceivable)}
                        </TableCell>
                        <TableCell className="text-center">
                          {isPosted ? (
                            <ReceivePaymentModal
                              invoiceId={inv.id}
                              invoiceNumber={inv.invoiceNumber}
                              netReceivable={Number(inv.netReceivable)}
                              currentOrgId={organizationId}
                            />
                          ) : (
                            <Badge
                              className={
                                isPaid
                                  ? 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/30'
                                  : 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                              }
                            >
                              {inv.status === 'POSTED' ? 'Menunggu Bayar' : inv.status}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 4. SECTION TIMESHEET (LOG JAM KERJA TIM) */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Timesheet (Jam Kerja Tim)
              </CardTitle>
              <CardDescription>
                Catatan jam kerja staf &amp; HPP tenaga kerja.
              </CardDescription>
            </div>
            <LogTimeModal
              projectId={project.id}
              currentOrgId={organizationId}
              users={orgUsers.map((u) => ({ id: u.id, name: u.name }))}
            />
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-b-lg border-t overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[20%]">Tanggal</TableHead>
                    <TableHead className="w-[25%]">Staf</TableHead>
                    <TableHead className="w-[15%]">Jam</TableHead>
                    <TableHead className="w-[20%] text-right">Subtotal</TableHead>
                    <TableHead className="w-[20%]">Ket</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeEntriesList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs">
                        Belum ada catatan timesheet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    timeEntriesList.map(({ entry, user }) => {
                      const hours = Number(entry.hours || 0);
                      const rate = Number(entry.hourlyCostRateSnapshot || 0);
                      const subtotal = hours * rate;

                      return (
                        <TableRow key={entry.id} className="text-xs">
                          <TableCell className="font-mono text-muted-foreground">
                            {entry.workDate}
                          </TableCell>
                          <TableCell className="font-semibold text-foreground">
                            {user.name}
                          </TableCell>
                          <TableCell className="font-mono">{hours} Jam</TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {formatRupiah(subtotal)}
                          </TableCell>
                          <TableCell className="text-muted-foreground truncate max-w-[120px]" title={entry.description || ''}>
                            {entry.description || '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 5. SECTION BIAYA VENDOR & EKSTERNAL */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" /> Biaya Vendor &amp; Eksternal
              </CardTitle>
              <CardDescription>
                Pengeluaran langsung freelancer, ads, &amp; lisensi.
              </CardDescription>
            </div>
            <AddExpenseModal
              projectId={project.id}
              currentOrgId={organizationId}
            />
          </CardHeader>
          <CardContent className="p-0">
            <div className="rounded-b-lg border-t overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[25%]">Vendor</TableHead>
                    <TableHead className="w-[20%]">Kategori</TableHead>
                    <TableHead className="w-[25%] text-right">Nominal</TableHead>
                    <TableHead className="w-[30%]">Tanggal &amp; Ket</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expensesList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-xs">
                        Belum ada biaya vendor tercatat.
                      </TableCell>
                    </TableRow>
                  ) : (
                    expensesList.map((exp) => (
                      <TableRow key={exp.id} className="text-xs">
                        <TableCell className="font-semibold text-foreground">
                          {exp.vendorName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {exp.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-foreground">
                          {formatRupiah(exp.amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div>{exp.expenseDate}</div>
                          {exp.description && (
                            <div className="text-[10px] truncate max-w-[140px]" title={exp.description}>
                              {exp.description}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
