'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApproveQuotationModal } from '@/components/ApproveQuotationModal';
import { CheckCircle } from 'lucide-react';

interface ApproveQuotationModalClientProps {
  quotationId: string;
  quotationTitle: string;
  totalAmount: number;
  currentOrgId: string;
}

export function ApproveQuotationModalClient({
  quotationId,
  quotationTitle,
  totalAmount,
  currentOrgId,
}: ApproveQuotationModalClientProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-1.5 h-8 text-xs font-medium shadow-sm bg-primary hover:bg-primary/90"
      >
        <CheckCircle className="w-3.5 h-3.5" /> Approve
      </Button>

      <ApproveQuotationModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        quotationId={quotationId}
        quotationTitle={quotationTitle}
        totalAmount={totalAmount}
        currentOrgId={currentOrgId}
        onSuccess={() => {
          setIsOpen(false);
          window.location.reload();
        }}
      />
    </>
  );
}
