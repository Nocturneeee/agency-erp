import { db } from '@/db';
import { organizations, quotations, projects, clients } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import Link from 'next/link';
import { 
  Building2, 
  FileText, 
  FolderKanban, 
  Wallet, 
  ArrowRight, 
  Clock, 
  AlertCircle,
  BookOpen
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApproveQuotationModalClient } from '@/components/ApproveQuotationModalClient';
import { CreateClientModal } from '@/components/CreateClientModal';
import { CreateUserModal } from '@/components/CreateUserModal';
import { CreateQuotationModal } from '@/components/CreateQuotationModal';

// Paksa dynamic agar data dari PostgreSQL selalu real-time setiap kali halaman dimuat
export const dynamic = 'force-dynamic';

export default async function AgencyERPDashboard() {
  // 1. Ambil 1 data pertama dari tabel organizations sebagai organisasi aktif
  const orgList = await db.select().from(organizations).limit(1);
  const activeOrg = orgList[0];

  // Jika tabel organizations kosong, tampilkan panduan menjalankan seed
  if (!activeOrg) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6 bg-card p-8 rounded-2xl border shadow-lg">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Database Belum Siap</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Belum ada data organisasi yang ditemukan di database PostgreSQL Anda. Jalankan perintah di bawah ini untuk mengisi data awal (seed).
            </p>
          </div>
          <div className="bg-muted p-4 rounded-xl font-mono text-xs text-foreground select-all border">
            npx tsx db/seed.ts
          </div>
          <p className="text-xs text-muted-foreground">
            Setelah menjalankan perintah tersebut, muat ulang halaman ini.
          </p>
        </div>
      </div>
    );
  }

  const currentOrgId = activeOrg.id;
  const agencyName = activeOrg.name;

  // Helper formatter mata uang Rupiah Indonesia
  const formatRupiah = (val: string | number | null | undefined) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  // 2. Ambil daftar clients berdasarkan organizationId untuk dropdown modal Quotation & lainnya
  const clientsList = await db
    .select()
    .from(clients)
    .where(eq(clients.organizationId, currentOrgId))
    .orderBy(desc(clients.createdAt));

  // 3. Ambil semua data quotations yang di-join dengan tabel clients (filter organizationId), urutkan terbaru
  const quotationsList = await db
    .select({
      quotation: quotations,
      client: clients,
    })
    .from(quotations)
    .innerJoin(clients, eq(quotations.clientId, clients.id))
    .where(eq(quotations.organizationId, currentOrgId))
    .orderBy(desc(quotations.createdAt));

  // 4. Ambil semua data projects yang di-join dengan tabel clients (filter organizationId), urutkan terbaru
  const projectsList = await db
    .select({
      project: projects,
      client: clients,
    })
    .from(projects)
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .where(eq(projects.organizationId, currentOrgId))
    .orderBy(desc(projects.createdAt));

  // ==========================================================================
  // HITUNG KPI SUMMARY
  // ==========================================================================
  
  // 1. Total Quotation Draft (jumlah dokumen & total nominal Rupiah)
  const draftQuotations = quotationsList.filter((q) => q.quotation.status === 'DRAFT');
  const totalDraftCount = draftQuotations.length;
  const totalDraftAmount = draftQuotations.reduce(
    (sum, q) => sum + Number(q.quotation.totalAmount || 0),
    0
  );

  // 2. Proyek Aktif (IN_PROGRESS)
  const activeProjects = projectsList.filter((p) => p.project.status === 'IN_PROGRESS');
  const activeProjectsCount = activeProjects.length;

  // 3. Total Nilai Kontrak Berjalan (dari quotation berstatus APPROVED)
  const approvedQuotations = quotationsList.filter((q) => q.quotation.status === 'APPROVED');
  const totalApprovedContractValue = approvedQuotations.reduce(
    (sum, q) => sum + Number(q.quotation.totalAmount || 0),
    0
  );

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* HEADER & NAVIGASI */}
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4 max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shadow-sm border border-primary/20">
              {agencyName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                  Agency ERP
                </span>
                <Badge variant="outline" className="text-[10px] py-0 h-4 font-mono">
                  Live DB
                </Badge>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {agencyName}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
            <Link href="/accounting/journals">
              <Button variant="outline" size="sm" className="gap-2 shadow-sm">
                <BookOpen className="w-4 h-4 text-primary" />
                <span>Buku Besar Jurnal</span>
              </Button>
            </Link>

            {/* 3 TOMBOL AKSI BARU BESERTA MODALNYA (Client Components yang mengelola state & reload secara internal) */}
            <CreateClientModal currentOrgId={currentOrgId} />
            <CreateUserModal currentOrgId={currentOrgId} />
            <CreateQuotationModal 
              currentOrgId={currentOrgId} 
              clientsList={clientsList} 
            />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl space-y-10">
        {/* KARTU RINGKASAN KPI (3 KOLOM) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* KPI 1: Total Quotation Draft */}
          <Card className="shadow-sm hover:shadow-md transition-shadow border-border/60 bg-gradient-to-br from-card to-muted/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Quotation Draft
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {totalDraftCount} <span className="text-sm font-normal text-muted-foreground">Dokumen</span>
              </div>
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-1">
                {formatRupiah(totalDraftAmount)} potensi nilai
              </p>
            </CardContent>
          </Card>

          {/* KPI 2: Proyek Aktif (IN_PROGRESS) */}
          <Card className="shadow-sm hover:shadow-md transition-shadow border-border/60 bg-gradient-to-br from-card to-muted/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Proyek Aktif (In Progress)
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <FolderKanban className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {activeProjectsCount} <span className="text-sm font-normal text-muted-foreground">Proyek</span>
              </div>
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-1">
                Sedang dikerjakan tim agensi
              </p>
            </CardContent>
          </Card>

          {/* KPI 3: Total Nilai Kontrak Berjalan */}
          <Card className="shadow-sm hover:shadow-md transition-shadow border-border/60 bg-gradient-to-br from-card to-muted/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Nilai Kontrak Berjalan
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {formatRupiah(totalApprovedContractValue)}
              </div>
              <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mt-1">
                Dari {approvedQuotations.length} penawaran disetujui
              </p>
            </CardContent>
          </Card>
        </div>

        {/* SECTION 1 — DAFTAR QUOTATIONS (PENAWARAN HARGA) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Daftar Penawaran Harga (Quotations)
              </h2>
              <p className="text-sm text-muted-foreground">
                Kelola dokumen penawaran klien. Setujui dokumen berstatus DRAFT untuk otomatis membuka proyek baru.
              </p>
            </div>
          </div>

          <Card className="shadow-sm border-border/60 overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[14%]">Nomor</TableHead>
                    <TableHead className="w-[26%]">Judul Proyek</TableHead>
                    <TableHead className="w-[20%]">Nama Klien</TableHead>
                    <TableHead className="w-[12%]">Tipe Billing</TableHead>
                    <TableHead className="w-[15%] text-right">Total Nominal</TableHead>
                    <TableHead className="w-[13%] text-center">Status &amp; Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotationsList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        Belum ada data quotation tercatat.
                      </TableCell>
                    </TableRow>
                  ) : (
                    quotationsList.map(({ quotation, client }) => {
                      const isDraft = quotation.status === 'DRAFT';
                      const totalAmtNum = Number(quotation.totalAmount);

                      return (
                        <TableRow key={quotation.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-mono font-medium text-xs text-muted-foreground">
                            {quotation.quotationNumber}
                          </TableCell>
                          <TableCell className="font-semibold text-foreground">
                            {quotation.title}
                          </TableCell>
                          <TableCell className="text-sm font-medium text-foreground">
                            {client.companyName}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[11px] font-mono">
                              {quotation.billingType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-foreground">
                            {formatRupiah(totalAmtNum)}
                          </TableCell>
                          <TableCell className="text-center">
                            {isDraft ? (
                              <ApproveQuotationModalClient
                                quotationId={quotation.id}
                                quotationTitle={quotation.title}
                                totalAmount={totalAmtNum}
                                currentOrgId={currentOrgId}
                              />
                            ) : (
                              <Badge 
                                className={
                                  quotation.status === 'APPROVED'
                                    ? 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/30'
                                    : 'bg-secondary text-secondary-foreground'
                                }
                              >
                                {quotation.status}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        {/* SECTION 2 — DAFTAR PROJECTS AKTIF */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-primary" /> Daftar Proyek Agensi
              </h2>
              <p className="text-sm text-muted-foreground">
                Proyek aktif dan perencanaan yang berjalan. Klik kartu proyek untuk melihat rincian jam kerja, termin, dan penagihan.
              </p>
            </div>
          </div>

          {projectsList.length === 0 ? (
            <Card className="border-dashed border-2 py-12 text-center text-muted-foreground">
              <CardContent className="space-y-2">
                <FolderKanban className="w-10 h-10 mx-auto text-muted-foreground/60" />
                <p>Belum ada proyek aktif. Setujui quotation berstatus DRAFT di atas untuk membuat proyek baru.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projectsList.map(({ project, client }) => {
                const isProgress = project.status === 'IN_PROGRESS';
                return (
                  <Link key={project.id} href={`/projects/${project.id}`} className="block group">
                    <Card className="h-full border-border/60 shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-200 flex flex-col justify-between bg-card">
                      <CardHeader className="space-y-2 pb-3">
                        <div className="flex items-center justify-between">
                          <Badge 
                            variant={isProgress ? 'default' : 'secondary'}
                            className={`text-[10px] uppercase font-semibold ${
                              isProgress 
                                ? 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/30' 
                                : ''
                            }`}
                          >
                            {project.status.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 group-hover:text-primary transition-colors">
                            Rincian <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                        <CardTitle className="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {project.name}
                        </CardTitle>
                        <CardDescription className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{client.companyName}</span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0 pb-4 text-xs space-y-3">
                        <div className="grid grid-cols-2 gap-2 bg-muted/40 p-2.5 rounded-lg border border-border/50">
                          <div className="space-y-0.5">
                            <span className="text-muted-foreground text-[10px] block">Estimasi Jam</span>
                            <span className="font-semibold text-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3 text-muted-foreground" /> {project.budgetHours} Jam
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-muted-foreground text-[10px] block">Deadline</span>
                            <span className="font-semibold text-foreground truncate block">
                              {project.deadline || '-'}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground bg-muted/20 mt-12">
        <div className="container mx-auto px-4">
          Agency ERP System &bull; Real-time PostgreSQL Data &bull; Powered by Next.js &amp; Tailwind CSS
        </div>
      </footer>
    </div>
  );
}
