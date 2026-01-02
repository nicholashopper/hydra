import React, { useState } from 'react';
import ProfileSelector from './ProfileSelector';
import ProxyStatus from './ProxyStatus';
import DriverModeToggle from './DriverModeToggle';
import TargetSelector from './TargetSelector';
import AIChat from './AIChat';
import PromptInput from './PromptInput';
import LogPanel from './LogPanel';
import type { LogEntry } from './LogPanel';
import type { Profile, DriverMode, BrowserTarget, ChatMessage, BrowserInfo } from '../../shared/types';
import { MAX_BROWSER_COUNT } from '../../shared/constants';

interface ControlPanelProps {
  profiles: Profile[];
  currentProfile: Profile | null;
  driverMode: DriverMode;
  target: BrowserTarget;
  browserInfos: BrowserInfo[];
  messages: ChatMessage[];
  isThinking: boolean;
  toolCalls: Array<{ name: string; input: unknown }>;
  logs: LogEntry[];
  onProfileChange: (id: string) => void;
  onCreateProfile: (name: string) => void;
  onDeleteProfile: (id: string) => void;
  onDriverModeChange: (mode: DriverMode) => void;
  onTargetChange: (target: BrowserTarget) => void;
  onSendMessage: (message: string) => void;
  onStopAI: () => void;
  onOpenSettings: () => void;
  onExportProfile: () => void;
  onImportProfile: () => void;
  onAddBrowser: () => void;
  onRemoveBrowser: () => void;
}

export default function ControlPanel({
  profiles,
  currentProfile,
  driverMode,
  target,
  browserInfos,
  messages,
  isThinking,
  toolCalls,
  logs,
  onProfileChange,
  onCreateProfile,
  onDeleteProfile,
  onDriverModeChange,
  onTargetChange,
  onSendMessage,
  onStopAI,
  onOpenSettings,
  onExportProfile,
  onImportProfile,
  onAddBrowser,
  onRemoveBrowser
}: ControlPanelProps) {
  const [showNewProfile, setShowNewProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  const handleCreateProfile = () => {
    if (newProfileName.trim()) {
      onCreateProfile(newProfileName.trim());
      setNewProfileName('');
      setShowNewProfile(false);
    }
  };

  return (
    <div className="control-panel">
      {/* Profile Section */}
      <div className="control-panel__section">
        <label className="control-panel__label">Session Profile</label>
        {showNewProfile ? (
          <div style={{ display: 'flex', gap: '5px' }}>
            <input
              type="text"
              className="text-input"
              placeholder="Profile name..."
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProfile()}
              autoFocus
            />
            <button className="btn btn--primary" onClick={handleCreateProfile}>+</button>
            <button className="btn" onClick={() => setShowNewProfile(false)}>X</button>
          </div>
        ) : (
          <ProfileSelector
            profiles={profiles}
            currentProfile={currentProfile}
            onChange={onProfileChange}
            onNew={() => setShowNewProfile(true)}
            onDelete={onDeleteProfile}
          />
        )}
      </div>

      {/* Browser Count */}
      <div className="control-panel__section">
        <label className="control-panel__label">Browsers ({browserInfos.length}/{MAX_BROWSER_COUNT})</label>
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <button
            className="btn"
            onClick={onRemoveBrowser}
            disabled={browserInfos.length <= 1}
            title="Remove browser"
            style={{ padding: '6px 12px' }}
          >
            −
          </button>
          <div style={{
            flex: 1,
            textAlign: 'center',
            padding: '6px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-dim)',
            color: 'var(--neon-green)',
            fontFamily: 'monospace'
          }}>
            {browserInfos.length}
          </div>
          <button
            className="btn"
            onClick={onAddBrowser}
            disabled={browserInfos.length >= MAX_BROWSER_COUNT}
            title="Add browser"
            style={{ padding: '6px 12px' }}
          >
            +
          </button>
        </div>
      </div>

      {/* Proxy Status */}
      <div className="control-panel__section">
        <label className="control-panel__label">Proxy Status</label>
        <ProxyStatus browserInfos={browserInfos} />
      </div>

      {/* Driver Mode */}
      <div className="control-panel__section">
        <label className="control-panel__label">Driver Mode</label>
        <DriverModeToggle mode={driverMode} onChange={onDriverModeChange} />
      </div>

      {/* Target Selector */}
      <div className="control-panel__section">
        <label className="control-panel__label">Target</label>
        <TargetSelector target={target} browserCount={browserInfos.length} onChange={onTargetChange} />
      </div>

      {/* AI Chat */}
      <div className="chat-container">
        <AIChat
          messages={messages}
          isThinking={isThinking}
          toolCalls={toolCalls}
          driverMode={driverMode}
        />
        <PromptInput
          onSend={onSendMessage}
          onStop={onStopAI}
          isThinking={isThinking}
          disabled={driverMode !== 'ai'}
        />
        <div className="action-buttons">
          {isThinking ? (
            <button className="btn btn--danger" onClick={onStopAI}>
              Stop
            </button>
          ) : (
            <button
              className="btn btn--primary"
              onClick={() => {
                const input = document.querySelector('.prompt-input') as HTMLTextAreaElement;
                if (input?.value) {
                  onSendMessage(input.value);
                  input.value = '';
                }
              }}
              disabled={driverMode !== 'ai'}
            >
              Send
            </button>
          )}
          <button className="btn" onClick={onOpenSettings}>
            Settings
          </button>
          <button className="btn" onClick={onExportProfile} title="Export Profile">
            Export
          </button>
          <button className="btn" onClick={onImportProfile} title="Import Profile">
            Import
          </button>
        </div>
      </div>

      {/* System Log */}
      <LogPanel logs={logs} />
    </div>
  );
}
