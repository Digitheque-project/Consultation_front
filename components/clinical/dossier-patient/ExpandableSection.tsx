'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import { ehr } from '@/lib/clinical/ehr-theme';

interface Props {
  number: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  isComplete?: boolean;
}

export function ExpandableSection({
  number,
  title,
  children,
  defaultOpen = false,
  isComplete = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const iconStroke = 1.75;

  return (
    <div
      style={{
        border: `1px solid ${ehr.border}`,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: ehr.white,
        boxShadow: ehr.shadowCard,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          backgroundColor: ehr.white,
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          {isComplete ? (
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: ehr.success,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Check size={18} strokeWidth={2.5} color={ehr.white} />
            </span>
          ) : (
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: ehr.primary,
                color: ehr.white,
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {number}
            </span>
          )}
          <div style={{ minWidth: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: ehr.text }}>{title}</span>
            {!open && (
              <p style={{ fontSize: 12, color: ehr.textMuted, margin: '4px 0 0 0', fontWeight: 400 }}>
                Cliquez pour ouvrir
              </p>
            )}
          </div>
        </div>
        <span style={{ color: ehr.textMuted, display: 'flex', flexShrink: 0 }}>
          {open ? (
            <ChevronDown size={20} strokeWidth={iconStroke} />
          ) : (
            <ChevronRight size={20} strokeWidth={iconStroke} />
          )}
        </span>
      </button>

      {open && (
        <div style={{ padding: '16px 20px 20px', borderTop: `1px solid ${ehr.borderSoft}` }}>{children}</div>
      )}
    </div>
  );
}
