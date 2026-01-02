import React from 'react';
import type { BrowserInfo } from '../../shared/types';

interface ProxyStatusProps {
  browserInfos: BrowserInfo[];
}

export default function ProxyStatus({ browserInfos }: ProxyStatusProps) {
  return (
    <div className="proxy-status">
      {browserInfos.map((info, index) => (
        <div key={index} className="proxy-dot" title={info.proxyIp || 'No proxy'}>
          <div
            className={`proxy-dot__indicator proxy-dot__indicator--${info.proxyStatus}`}
          />
          <span className="proxy-dot__label">{index + 1}</span>
        </div>
      ))}
    </div>
  );
}
