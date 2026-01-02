import React from 'react';
import type { BrowserInfo, DriverMode } from '../../shared/types';

interface BrowserRowProps {
  browserInfos: BrowserInfo[];
  driverMode: DriverMode;
  onSelectDriver: (index: number) => void;
}

export default function BrowserRow({ browserInfos, driverMode, onSelectDriver }: BrowserRowProps) {
  // Browser views are rendered natively by Electron's BrowserView
  // This component just provides an overlay for driver selection in human mode
  return (
    <div className="browser-row">
      {driverMode === 'human' && browserInfos.map((info, index) => (
        <div
          key={index}
          className={`browser-overlay ${info.isDriver ? 'browser-overlay--driver' : ''}`}
          onClick={() => onSelectDriver(index)}
          title={info.isDriver ? 'Driver Browser' : 'Click to set as driver'}
        >
          {info.isDriver && (
            <div className="driver-badge">DRIVER</div>
          )}
        </div>
      ))}
    </div>
  );
}
