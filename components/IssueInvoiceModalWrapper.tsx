'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { IssueInvoiceModal } from '@/components/IssueInvoiceModal';
import { FileSpreadsheet } from 'lucide-react';

interface IssueInvoiceModalWrapperProps {
  milestoneId: string;
  milestoneTitle: string;
  billableAmount: number;
  currentOrgId: string;
}

export function IssueInvoiceModalWrapper({
  milestoneId,
  milestoneTitle,
  billableAmount,
  currentOrgId,
}: IssueInvoiceModalWrapperProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setIsOpen(true)} className="gap-1.5 h-8">
        <FileSpreadsheet className="w-3.5 h-3.5" /> Terbitkan Invoice
      </Button>

      <IssueInvoiceModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        milestoneId={milestoneId}
        milestoneTitle={milestoneTitle}
        billableAmount={billableAmount}
        currentOrgId={currentOrgId}
      />
    </>
  );
}
