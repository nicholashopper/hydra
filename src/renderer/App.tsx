import React, { useState, useEffect, useCallback } from 'react';
import TitleBar from './components/TitleBar';
import ControlPanel from './components/ControlPanel';
import BrowserNavBar from './components/BrowserNavBar';
import SettingsModal from './components/SettingsModal';
import ToastContainer from './components/ToastContainer';
import type { Profile, DriverMode, BrowserTarget, ChatMessage, BrowserInfo } from '../shared/types';
import { DEFAULT_BROWSER_COUNT, MAX_BROWSER_COUNT } from '../shared/constants';
import type { LogEntry } from './components/LogPanel';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

function createDefaultBrowserInfos(count: number): BrowserInfo[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    url: 'about:blank',
    title: '',
    isDriver: i === 0,
    proxyStatus: 'none' as const
  }));
}

export default function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [driverMode, setDriverMode] = useState<DriverMode>('ai');
  const [target, setTarget] = useState<BrowserTarget>('all');
  const [driverBrowser, setDriverBrowser] = useState<number>(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [browserInfos, setBrowserInfos] = useState<BrowserInfo[]>(
    createDefaultBrowserInfos(DEFAULT_BROWSER_COUNT)
  );
  const [toolCalls, setToolCalls] = useState<Array<{ name: string; input: unknown }>>([]);
  const [browserUrls, setBrowserUrls] = useState<string[]>(
    Array(DEFAULT_BROWSER_COUNT).fill('https://www.google.com')
  );
  const [navBarLayout, setNavBarLayout] = useState<Array<{ x: number; y: number; width: number; browserIndex: number }>>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Load profiles on mount
  useEffect(() => {
    loadProfiles();

    // Subscribe to events
    const unsubReady = window.hydra.browser.onReady(() => {
      addToast('Browsers initialized', 'success');
    });

    const unsubStatus = window.hydra.browser.onStatus((status) => {
      setBrowserInfos(status as BrowserInfo[]);
    });

    const unsubThinking = window.hydra.ai.onThinking((thinking) => {
      setIsThinking(thinking);
    });

    const unsubToolCall = window.hydra.ai.onToolCall((toolCall) => {
      setToolCalls(prev => [...prev, toolCall]);
    });

    const unsubUrlChanged = window.hydra.browser.onUrlChanged(({ browserIndex, url }) => {
      setBrowserUrls(prev => {
        const next = [...prev];
        next[browserIndex] = url;
        return next;
      });
    });

    const unsubError = window.hydra.onError((error) => {
      addToast(error, 'error');
    });

    const unsubLayout = window.hydra.browser.onLayout((layout) => {
      setNavBarLayout(layout.navBars);
    });

    return () => {
      unsubReady();
      unsubStatus();
      unsubThinking();
      unsubToolCall();
      unsubUrlChanged();
      unsubError();
      unsubLayout();
    };
  }, []);

  const loadProfiles = async () => {
    const result = await window.hydra.profiles.list();
    if (result.success && result.data) {
      setProfiles(result.data);
      if (result.data.length > 0) {
        setCurrentProfile(result.data[0]);
      }
    }
  };

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = crypto.randomUUID();
    const timestamp = new Date();

    // Add to toasts (auto-dismiss)
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);

    // Add to persistent logs
    setLogs(prev => [...prev, { id, message, type, timestamp }]);
  }, []);

  const handleProfileChange = async (profileId: string) => {
    const result = await window.hydra.profiles.load(profileId);
    if (result.success) {
      const profile = profiles.find(p => p.id === profileId);
      if (profile) {
        setCurrentProfile(profile);
        addToast(`Loaded profile: ${profile.name}`, 'success');
      }
    } else {
      addToast(result.error || 'Failed to load profile', 'error');
    }
  };

  const handleCreateProfile = async (name: string) => {
    const result = await window.hydra.profiles.create(name);
    if (result.success && result.data) {
      await loadProfiles();
      addToast(`Created profile: ${name}`, 'success');
    } else {
      addToast(result.error || 'Failed to create profile', 'error');
    }
  };

  const handleDeleteProfile = async (id: string) => {
    const result = await window.hydra.profiles.delete(id);
    if (result.success) {
      await loadProfiles();
      addToast('Profile deleted', 'success');
    } else {
      addToast(result.error || 'Failed to delete profile', 'error');
    }
  };

  const handleDriverModeChange = (mode: DriverMode) => {
    setDriverMode(mode);
  };

  const handleTargetChange = (newTarget: BrowserTarget) => {
    setTarget(newTarget);
    window.hydra.input.setTarget(newTarget);
  };

  const handleDriverBrowserChange = (index: number) => {
    setDriverBrowser(index);
    window.hydra.browser.setDriver(index);
    setBrowserInfos(prev => prev.map((info, i) => ({
      ...info,
      isDriver: i === index
    })));
  };

  const handleSendMessage = async (message: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMessage]);
    setToolCalls([]);

    // Send to AI
    const result = await window.hydra.ai.sendMessage(message);
    if (result.success && result.data) {
      setMessages(prev => [...prev, result.data!]);
    } else {
      addToast(result.error || 'AI request failed', 'error');
    }
    setToolCalls([]);
  };

  const handleStopAI = () => {
    window.hydra.ai.stop();
    setIsThinking(false);
  };

  const handleExportProfile = async () => {
    if (!currentProfile) return;
    const result = await window.hydra.profiles.export(currentProfile.id, '');
    if (result.success) {
      addToast('Profile exported', 'success');
    } else if (result.error !== 'Export cancelled') {
      addToast(result.error || 'Export failed', 'error');
    }
  };

  const handleImportProfile = async () => {
    const result = await window.hydra.profiles.import('');
    if (result.success && result.data) {
      await loadProfiles();
      addToast(`Imported profile: ${result.data.name}`, 'success');
    } else if (result.error !== 'Import cancelled') {
      addToast(result.error || 'Import failed', 'error');
    }
  };

  const handleAddBrowser = async () => {
    if (browserInfos.length >= MAX_BROWSER_COUNT) {
      addToast(`Maximum ${MAX_BROWSER_COUNT} browsers allowed`, 'error');
      return;
    }
    const result = await window.hydra.browser.add();
    if (result.success && result.data) {
      setBrowserInfos(prev => [
        ...prev,
        {
          id: prev.length,
          url: 'about:blank',
          title: '',
          isDriver: false,
          proxyStatus: 'none'
        }
      ]);
      addToast(`Browser ${result.data.count} added`, 'success');
    } else {
      addToast(result.error || 'Failed to add browser', 'error');
    }
  };

  const handleRemoveBrowser = async () => {
    if (browserInfos.length <= 1) {
      addToast('Must have at least 1 browser', 'error');
      return;
    }
    const result = await window.hydra.browser.remove();
    if (result.success && result.data) {
      setBrowserInfos(prev => prev.slice(0, -1));
      // Adjust target if needed
      if (target !== 'all') {
        const targetIndex = parseInt(target.split('_')[1]) - 1;
        if (targetIndex >= result.data.count) {
          setTarget('all');
        }
      }
      addToast(`Browser removed. ${result.data.count} remaining`, 'success');
    } else {
      addToast(result.error || 'Failed to remove browser', 'error');
    }
  };

  // Get nav bar style from main process layout (keeps nav bars aligned with browser views)
  const navBarHeight = 32;

  const getNavBarStyle = (index: number): React.CSSProperties => {
    const layout = navBarLayout[index];
    if (!layout) {
      // Fallback while waiting for layout from main process
      return { display: 'none' };
    }
    return {
      position: 'absolute',
      left: layout.x,
      top: layout.y,
      width: layout.width,
      height: navBarHeight
    };
  };

  return (
    <div className="app">
      <div className="scanlines" />
      <TitleBar />
      <div className="main-content">
        <ControlPanel
          profiles={profiles}
          currentProfile={currentProfile}
          driverMode={driverMode}
          target={target}
          browserInfos={browserInfos}
          messages={messages}
          isThinking={isThinking}
          toolCalls={toolCalls}
          logs={logs}
          onProfileChange={handleProfileChange}
          onCreateProfile={handleCreateProfile}
          onDeleteProfile={handleDeleteProfile}
          onDriverModeChange={handleDriverModeChange}
          onTargetChange={handleTargetChange}
          onSendMessage={handleSendMessage}
          onStopAI={handleStopAI}
          onOpenSettings={() => {
            window.hydra.browser.hide();
            setShowSettings(true);
          }}
          onExportProfile={handleExportProfile}
          onImportProfile={handleImportProfile}
          onAddBrowser={handleAddBrowser}
          onRemoveBrowser={handleRemoveBrowser}
        />
      </div>
      {/* Browser Navigation Bars */}
      {browserInfos.map((_, index) => (
        <BrowserNavBar
          key={index}
          browserIndex={index}
          url={browserUrls[index] || ''}
          style={getNavBarStyle(index)}
        />
      ))}
      {showSettings && (
        <SettingsModal
          currentProfile={currentProfile}
          onClose={() => {
            setShowSettings(false);
            window.hydra.browser.show();
          }}
          onSave={async (settings) => {
            if (currentProfile) {
              await window.hydra.profiles.update({
                id: currentProfile.id,
                ...settings
              });
              await loadProfiles();
              addToast('Settings saved', 'success');
            }
            setShowSettings(false);
            window.hydra.browser.show();
          }}
        />
      )}
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
    </div>
  );
}
