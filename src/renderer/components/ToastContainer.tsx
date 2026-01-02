import React from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast--${toast.type}`}
          onClick={() => onDismiss(toast.id)}
          style={{ cursor: 'pointer' }}
        >
          <span style={{ marginRight: '10px' }}>
            {toast.type === 'success' && '✓'}
            {toast.type === 'error' && '✗'}
            {toast.type === 'info' && 'ℹ'}
          </span>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
