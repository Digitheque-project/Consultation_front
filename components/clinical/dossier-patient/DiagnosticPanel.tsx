'use client';

import React, { useState } from 'react';
import { ehr } from '@/lib/clinical/ehr-theme';

export type DiagnosticData = {
  retenu: string;
  hypotheses: string[];
};

export function defaultDiagnostic(): DiagnosticData {
  return {
    retenu: '',
    hypotheses: [],
  };
}

const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 14,
  border: `1px solid ${ehr.border}`,
  borderRadius: 6,
  backgroundColor: ehr.inputBg,
  color: ehr.text,
  boxSizing: 'border-box',
};

const labelAbove: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: ehr.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 6,
  display: 'block',
};

function TagRow({
  draft,
  setDraft,
  tags,
  onAdd,
  onRemove,
  placeholder,
}: {
  draft: string;
  setDraft: (s: string) => void;
  tags: string[];
  onAdd: () => void;
  onRemove: (t: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder={placeholder}
          style={{
            ...inputBase,
            flex: 1,
            minWidth: 160,
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
            borderRight: 'none',
          }}
        />
        <button
          type="button"
          onClick={onAdd}
          style={{
            padding: '0 20px',
            backgroundColor: ehr.primary,
            color: ehr.white,
            border: 'none',
            borderRadius: '0 6px 6px 0',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Ajouter
        </button>
      </div>
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {tags.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => onRemove(t)}
              style={{
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: 16,
                padding: '4px 12px',
                fontSize: 13,
                color: ehr.text,
                cursor: 'pointer',
              }}
              title="Retirer"
            >
              {t} ×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type Props = {
  value: DiagnosticData;
  onChange: (next: DiagnosticData) => void;
};

export function DiagnosticPanel({ value, onChange }: Props) {
  const [draftHypothese, setDraftHypothese] = useState('');

  const addHypothese = () => {
    const val = draftHypothese.trim();
    if (val && !value.hypotheses.includes(val)) {
      onChange({ ...value, hypotheses: [...value.hypotheses, val] });
    }
    setDraftHypothese('');
  };

  const removeHypothese = (t: string) => {
    onChange({ ...value, hypotheses: value.hypotheses.filter(x => x !== t) });
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <label style={labelAbove}>Diagnostic Retenu</label>
        <textarea
          style={{ ...inputBase, resize: 'vertical', minHeight: 80 }}
          value={value.retenu}
          onChange={e => onChange({ ...value, retenu: e.target.value })}
          placeholder="Diagnostic principal retenu..."
        />
      </div>

      <div>
        <label style={labelAbove}>Hypothèses de diagnostic</label>
        <p style={{ fontSize: 12, color: ehr.textMuted, marginTop: -4, marginBottom: 8 }}>
          Vous pouvez saisir plusieurs hypothèses.
        </p>
        <TagRow
          draft={draftHypothese}
          setDraft={setDraftHypothese}
          tags={value.hypotheses}
          onAdd={addHypothese}
          onRemove={removeHypothese}
          placeholder="Ajouter une hypothèse de diagnostic..."
        />
      </div>
    </div>
  );
}

export function diagnosticHasContent(v: DiagnosticData): boolean {
  return v.retenu.trim() !== '' || v.hypotheses.length > 0;
}
