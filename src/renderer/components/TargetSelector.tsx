import React from 'react';
import type { BrowserTarget } from '../../shared/types';

interface TargetSelectorProps {
  target: BrowserTarget;
  browserCount: number;
  onChange: (target: BrowserTarget) => void;
}

export default function TargetSelector({ target, browserCount, onChange }: TargetSelectorProps) {
  const targets: { value: BrowserTarget; label: string }[] = [
    { value: 'all', label: 'All Browsers' },
    ...Array.from({ length: browserCount }, (_, i) => ({
      value: `browser_${i + 1}` as BrowserTarget,
      label: `Browser ${i + 1}`
    }))
  ];

  return (
    <div className="input-group">
      <select
        className="select-input"
        value={target}
        onChange={(e) => onChange(e.target.value as BrowserTarget)}
      >
        {targets.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
      <span className="select-arrow">▼</span>
    </div>
  );
}
