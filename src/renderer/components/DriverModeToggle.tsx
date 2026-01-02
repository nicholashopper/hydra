import React from 'react';
import type { DriverMode } from '../../shared/types';

interface DriverModeToggleProps {
  mode: DriverMode;
  onChange: (mode: DriverMode) => void;
}

export default function DriverModeToggle({ mode, onChange }: DriverModeToggleProps) {
  return (
    <div className="mode-toggle">
      <button
        className={`mode-toggle__btn ${mode === 'human' ? 'mode-toggle__btn--active' : ''}`}
        onClick={() => onChange('human')}
      >
        Human
      </button>
      <button
        className={`mode-toggle__btn ${mode === 'ai' ? 'mode-toggle__btn--active' : ''}`}
        onClick={() => onChange('ai')}
      >
        AI
      </button>
    </div>
  );
}
