import React, { useState } from 'react';
import type { Profile, ProxyConfig } from '../../shared/types';

interface SettingsModalProps {
  currentProfile: Profile | null;
  onClose: () => void;
  onSave: (settings: Partial<Profile>) => void;
}

export default function SettingsModal({ currentProfile, onClose, onSave }: SettingsModalProps) {
  const [proxies, setProxies] = useState<(ProxyConfig | null)[]>([
    null, null, null, null
  ]);
  const [notes, setNotes] = useState(currentProfile?.notes || '');

  const handleProxyChange = (index: number, field: keyof ProxyConfig, value: string | number) => {
    setProxies(prev => {
      const updated = [...prev];
      if (!updated[index]) {
        updated[index] = { type: 'http', host: '', port: 8080 };
      }
      const proxy = updated[index]!;
      if (field === 'type') {
        proxy.type = value as 'http' | 'https' | 'socks5';
      } else if (field === 'port') {
        proxy.port = value as number;
      } else if (field === 'host') {
        proxy.host = value as string;
      } else if (field === 'username') {
        proxy.username = value as string;
      } else if (field === 'password') {
        proxy.password = value as string;
      }
      return updated;
    });
  };

  const handleSave = () => {
    const proxyConfig: Record<string, ProxyConfig> = {};
    proxies.forEach((proxy, index) => {
      if (proxy && proxy.host) {
        proxyConfig[`proxy_${index}`] = proxy;
      }
    });

    onSave({
      proxy_config: Object.keys(proxyConfig).length > 0 ? proxyConfig as unknown as ProxyConfig : undefined,
      notes
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <span className="modal__title">Settings</span>
          <button className="modal__close" onClick={onClose}>×</button>
        </div>

        <div className="modal__body">
          {/* Proxy Configuration */}
          <div className="modal__section">
            <div className="modal__section-title">Proxy Configuration</div>
            {[0, 1, 2, 3].map((index) => (
              <div key={index} style={{ marginBottom: '15px' }}>
                <label className="control-panel__label" style={{ marginBottom: '5px' }}>
                  Browser {index + 1}
                </label>
                <div className="form-row">
                  <div className="form-field" style={{ width: '80px' }}>
                    <select
                      className="select-input"
                      value={proxies[index]?.type || 'http'}
                      onChange={(e) => handleProxyChange(index, 'type', e.target.value as ProxyConfig['type'])}
                    >
                      <option value="http">HTTP</option>
                      <option value="https">HTTPS</option>
                      <option value="socks5">SOCKS5</option>
                    </select>
                  </div>
                  <div className="form-field" style={{ flex: 1 }}>
                    <input
                      type="text"
                      className="text-input"
                      placeholder="Host"
                      value={proxies[index]?.host || ''}
                      onChange={(e) => handleProxyChange(index, 'host', e.target.value)}
                    />
                  </div>
                  <div className="form-field" style={{ width: '70px' }}>
                    <input
                      type="number"
                      className="text-input"
                      placeholder="Port"
                      value={proxies[index]?.port || ''}
                      onChange={(e) => handleProxyChange(index, 'port', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <input
                      type="text"
                      className="text-input"
                      placeholder="Username (optional)"
                      value={proxies[index]?.username || ''}
                      onChange={(e) => handleProxyChange(index, 'username', e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <input
                      type="password"
                      className="text-input"
                      placeholder="Password (optional)"
                      value={proxies[index]?.password || ''}
                      onChange={(e) => handleProxyChange(index, 'password', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Profile Notes */}
          <div className="modal__section">
            <div className="modal__section-title">Profile Notes</div>
            <textarea
              className="text-input"
              style={{ minHeight: '80px', resize: 'vertical' }}
              placeholder="Notes about this profile..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Fingerprint Info */}
          {currentProfile?.fingerprint && (
            <div className="modal__section">
              <div className="modal__section-title">Fingerprint Info</div>
              <div style={{
                background: 'var(--bg-input)',
                padding: '10px',
                border: '1px solid var(--border-dim)',
                fontSize: '10px',
                fontFamily: 'monospace',
                color: 'var(--text-secondary)'
              }}>
                <div>User Agent: {currentProfile.fingerprint.userAgent.substring(0, 60)}...</div>
                <div>Timezone: {currentProfile.fingerprint.timezone}</div>
                <div>WebGL: {currentProfile.fingerprint.webgl.vendor}</div>
                <div>Seed: {currentProfile.fingerprint.seed.substring(0, 16)}...</div>
              </div>
            </div>
          )}
        </div>

        <div className="modal__footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
