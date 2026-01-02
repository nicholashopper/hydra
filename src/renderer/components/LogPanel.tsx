import React, { useEffect, useRef } from 'react';

export interface LogEntry {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  timestamp: Date;
}

interface LogPanelProps {
  logs: LogEntry[];
}

export default function LogPanel({ logs }: LogPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="log-panel">
      <div className="log-panel__header">
        <span className="log-panel__title">System Log</span>
        <span className="log-panel__count">{logs.length}</span>
      </div>
      <div className="log-panel__content" ref={scrollRef}>
        {logs.length === 0 ? (
          <div className="log-panel__empty">No logs yet</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={`log-panel__entry log-panel__entry--${log.type}`}>
              <span className="log-panel__time">
                {log.timestamp.toLocaleTimeString('en-US', { hour12: false })}
              </span>
              <span className="log-panel__icon">
                {log.type === 'success' && '✓'}
                {log.type === 'error' && '✗'}
                {log.type === 'info' && 'ℹ'}
              </span>
              <span className="log-panel__message">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
