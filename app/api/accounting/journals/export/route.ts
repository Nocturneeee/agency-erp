import { NextResponse } from 'next/server';
import { db } from '@/db';
import { journalEntries, journalLines } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import ExcelJS from 'exceljs';

// Simple role check middleware approach - cache bust
// In production, this would use proper session validation from auth headers/cookies

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('organizationId');

    // Fetch journal entries and lines
    const entries = await db.select()
      .from(journalEntries)
      .where(orgId ? eq(journalEntries.organizationId, orgId) : undefined)
      .orderBy(desc(journalEntries.entryDate));

    const lines = await db.select()
      .from(journalLines);

    // Group lines by entry ID
    const linesByEntry = lines.reduce((acc: Record<string, any[]>, line: any) => {
      if (!acc[line.journalEntryId]) {
        acc[line.journalEntryId] = [];
      }
      acc[line.journalEntryId].push(line);
      return acc;
    }, {});

    // Build Excel with exceljs
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('General Ledger');

    // Set column widths FIRST before adding data
    worksheet.columns = [
      { width: 12 }, // No. Jurnal
      { width: 15 }, // Tanggal
      { width: 22 }, // Tipe Transaksi
      { width: 35 }, // Keterangan Transaksi
      { width: 14 }, // Kode Akun
      { width: 30 }, // Nama Akun
      { width: 16 }, // Debit
      { width: 16 }, // Kredit
    ];

    // --- LAPORAN HEADER (Baris 1-4) ---
    // Row 1: Company Name
    const row1 = worksheet.getRow(1);
    worksheet.mergeCells('A1:H1');
    row1.getCell(1).value = 'Telucode';
    row1.eachCell((cell) => {
      cell.fill = { fgColor: { argb: 'FF1F2937' }, pattern: 'solid' };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      cell.alignment = { horizontal: 'center' };
      cell.border = { bottom: { style: 'thin' } };
    });

    // Row 2: Report Title
    const row2 = worksheet.getRow(2);
    worksheet.mergeCells('A2:H2');
    row2.getCell(1).value = 'BUKU BESAR JURNAL AKUNTANSI - GENERAL LEDGER';
    row2.eachCell((cell) => {
      cell.fill = { fgColor: { argb: 'FF1F2937' }, pattern: 'solid' };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 14 };
      cell.alignment = { horizontal: 'center' };
      cell.border = { bottom: { style: 'thin' } };
    });

    // Row 3: Tanggal Cetak
    const row3 = worksheet.getRow(3);
    worksheet.mergeCells('A3:H3');
    const currentDateStr = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    row3.getCell(1).value = `Tanggal Cetak: ${currentDateStr}`;
    row3.eachCell((cell) => {
      cell.font = { size: 10, color: { argb: 'FF6B7280' } };
      cell.alignment = { horizontal: 'left' };
      cell.border = { bottom: { style: 'thin' } };
    });

    // Row 4: Dicetak Oleh
    const row4 = worksheet.getRow(4);
    worksheet.mergeCells('A4:H4');
    row4.getCell(1).value = 'Dicetak Oleh: Sistem Agency ERP';
    row4.eachCell((cell) => {
      cell.font = { size: 10, color: { argb: 'FF6B7280' } };
      cell.alignment = { horizontal: 'left' };
      cell.border = { bottom: { style: 'thin' } };
    });

    // --- HEADER TABLE (Baris 5) ---
    const headers = ['No. Jurnal', 'Tanggal', 'Tipe Transaksi', 'Keterangan Transaksi', 'Kode Akun', 'Nama Akun', 'Debit', 'Kredit'];
    const headerRow = worksheet.getRow(5);
    
    headers.forEach((h, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill = { fgColor: { argb: 'FF1F2937' }, pattern: 'solid' };
      cell.alignment = { horizontal: 'center' };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });

    headerRow.eachCell((cell, colIndex) => {
      cell.fill = { fgColor: { argb: 'FF1F2937' }, pattern: 'solid' };
      cell.alignment = { horizontal: colIndex >= 7 ? 'right' : 'center' };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });

    // --- ISI DATA ---
    let rowIdx = 6;
    let noUrut = 1;

    // Sort entries by date
    const sortedEntries = [...entries].sort((a: any, b: any) => 
      new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
    );

    for (const entry of sortedEntries) {
      const entryLines = linesByEntry[entry.id] || [];
      const entryTotalDebit = entryLines.reduce((sum: number, l: any) => sum + Number(l.debit), 0);
      const entryTotalCredit = entryLines.reduce((sum: number, l: any) => sum + Number(l.credit), 0);

      // Add entry header row
      const entryHeaderRow = worksheet.getRow(rowIdx);
      worksheet.mergeCells(`A${rowIdx}:H${rowIdx}`);
      entryHeaderRow.getCell(1).value = `Jurnal #${entry.id}`;
      entryHeaderRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FF1F2937' } };
        cell.fill = { fgColor: { argb: 'FFF3F4F6' }, pattern: 'solid' };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' } };
      });
      rowIdx++;

      for (const line of entryLines) {
        const row = worksheet.getRow(rowIdx);
        row.values = [
          noUrut,
          entry.entryDate || '',
          entry.referenceType || '',
          entry.description || '',
          line.accountCode || '',
          line.accountName || '',
          Number(line.debit) || 0,
          Number(line.credit) || 0,
        ];

        // Format debit and credit cells with accounting number format
        row.eachCell((cell, colIndex) => {
          if (colIndex === 7 || colIndex === 8) { // Debit/Kredit columns
            cell.numFmt = '#,##0';
            cell.alignment = { horizontal: 'right' };
          }
          cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        });

        rowIdx++;
        noUrut++;
      }

      // Add subtotal row for each entry
      const subtotalRow = worksheet.getRow(rowIdx);
      subtotalRow.values = ['', '', '', '', 'SUBTOTAL', '', entryTotalDebit, entryTotalCredit];
      
      subtotalRow.eachCell((cell, colIndex) => {
        if (colIndex === 7 || colIndex === 8) {
          cell.numFmt = '#,##0';
          cell.alignment = { horizontal: 'right' };
        }
        cell.font = { bold: true };
        cell.fill = { fgColor: { argb: 'FFE5E7EB' }, pattern: 'solid' };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'double' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });

      rowIdx += 2; // Spasi antar jurnal
    }

    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Disposition': 'attachment; filename="Buku-Besar-Jurnal.xlsx"',
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });

  } catch (error) {
    console.error('Error exporting journals:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengekspor data jurnal ke Excel.' }, { status: 500 });
  }
}
