import { contextBridge, ipcRenderer } from 'electron';
import type {
  Profile,
  BrowserTarget,
  ChatMessage,
  MouseEventData,
  KeyboardEventData,
  IPCResponse
} from '../shared/types';
import { IPC } from '../shared/ipc-channels';

// Expose protected APIs to renderer
const api = {
  // Profile Management
  profiles: {
    list: (): Promise<IPCResponse<Profile[]>> =>
      ipcRenderer.invoke(IPC.PROFILE_LIST),
    get: (id: string): Promise<IPCResponse<Profile>> =>
      ipcRenderer.invoke(IPC.PROFILE_GET, id),
    create: (name: string): Promise<IPCResponse<Profile>> =>
      ipcRenderer.invoke(IPC.PROFILE_CREATE, name),
    update: (profile: Partial<Profile> & { id: string }): Promise<IPCResponse<void>> =>
      ipcRenderer.invoke(IPC.PROFILE_UPDATE, profile),
    delete: (id: string): Promise<IPCResponse<void>> =>
      ipcRenderer.invoke(IPC.PROFILE_DELETE, id),
    export: (id: string, path: string): Promise<IPCResponse<void>> =>
      ipcRenderer.invoke(IPC.PROFILE_EXPORT, id, path),
    import: (path: string): Promise<IPCResponse<Profile>> =>
      ipcRenderer.invoke(IPC.PROFILE_IMPORT, path),
    load: (id: string): Promise<IPCResponse<void>> =>
      ipcRenderer.invoke(IPC.PROFILE_LOAD, id)
  },

  // Browser Control
  browser: {
    navigate: (url: string, target: BrowserTarget): Promise<IPCResponse> =>
      ipcRenderer.invoke(IPC.BROWSER_NAVIGATE, url, target),
    click: (element: string, target: BrowserTarget): Promise<IPCResponse> =>
      ipcRenderer.invoke(IPC.BROWSER_CLICK, element, target),
    type: (element: string, text: string, options: { clearFirst?: boolean; pressEnter?: boolean }, target: BrowserTarget): Promise<IPCResponse> =>
      ipcRenderer.invoke(IPC.BROWSER_TYPE, element, text, options, target),
    scroll: (direction: 'up' | 'down', amount: string, target: BrowserTarget): Promise<IPCResponse> =>
      ipcRenderer.invoke(IPC.BROWSER_SCROLL, direction, amount, target),
    getState: (target: BrowserTarget): Promise<IPCResponse> =>
      ipcRenderer.invoke(IPC.BROWSER_GET_STATE, target),
    screenshot: (target: BrowserTarget): Promise<IPCResponse<string>> =>
      ipcRenderer.invoke(IPC.BROWSER_SCREENSHOT, target),
    setDriver: (browserId: number): Promise<IPCResponse<void>> =>
      ipcRenderer.invoke(IPC.BROWSER_SET_DRIVER, browserId),
    add: (): Promise<IPCResponse<{ count: number }>> =>
      ipcRenderer.invoke(IPC.BROWSER_ADD),
    remove: (): Promise<IPCResponse<{ count: number }>> =>
      ipcRenderer.invoke(IPC.BROWSER_REMOVE),
    getCount: (): Promise<IPCResponse<{ count: number }>> =>
      ipcRenderer.invoke(IPC.BROWSER_COUNT),
    // Navigation
    goBack: (browserIndex: number): void =>
      ipcRenderer.send(IPC.BROWSER_BACK, browserIndex),
    goForward: (browserIndex: number): void =>
      ipcRenderer.send(IPC.BROWSER_FORWARD, browserIndex),
    refresh: (browserIndex: number): void =>
      ipcRenderer.send(IPC.BROWSER_REFRESH, browserIndex),
    goToUrl: (browserIndex: number, url: string): Promise<IPCResponse<void>> =>
      ipcRenderer.invoke(IPC.BROWSER_GO_TO_URL, browserIndex, url),
    onUrlChanged: (callback: (data: { browserIndex: number; url: string }) => void) => {
      ipcRenderer.on(IPC.BROWSER_URL_CHANGED, (_event, data) => callback(data));
      return () => ipcRenderer.removeListener(IPC.BROWSER_URL_CHANGED, callback as (...args: unknown[]) => void);
    },
    onReady: (callback: () => void) => {
      ipcRenderer.on(IPC.BROWSER_READY, callback);
      return () => ipcRenderer.removeListener(IPC.BROWSER_READY, callback);
    },
    onStatus: (callback: (status: unknown) => void) => {
      ipcRenderer.on(IPC.BROWSER_STATUS, (_event, status) => callback(status));
      return () => ipcRenderer.removeListener(IPC.BROWSER_STATUS, callback as (...args: unknown[]) => void);
    },
    onLayout: (callback: (layout: { navBars: Array<{ x: number; y: number; width: number; browserIndex: number }> }) => void) => {
      ipcRenderer.on(IPC.BROWSER_LAYOUT, (_event, layout) => callback(layout));
      return () => ipcRenderer.removeListener(IPC.BROWSER_LAYOUT, callback as (...args: unknown[]) => void);
    },
    hide: (): void => ipcRenderer.send(IPC.BROWSER_HIDE),
    show: (): void => ipcRenderer.send(IPC.BROWSER_SHOW)
  },

  // Input Broadcasting
  input: {
    mouse: (data: MouseEventData): void =>
      ipcRenderer.send(IPC.INPUT_MOUSE, data),
    keyboard: (data: KeyboardEventData): void =>
      ipcRenderer.send(IPC.INPUT_KEYBOARD, data),
    setTarget: (target: BrowserTarget): void =>
      ipcRenderer.send(IPC.INPUT_SET_TARGET, target)
  },

  // Proxy
  proxy: {
    check: (browserId: number): Promise<IPCResponse<{ ip: string }>> =>
      ipcRenderer.invoke(IPC.PROXY_CHECK, browserId),
    onStatus: (callback: (status: { browserId: number; status: string; ip?: string }) => void) => {
      ipcRenderer.on(IPC.PROXY_STATUS, (_event, status) => callback(status));
      return () => ipcRenderer.removeListener(IPC.PROXY_STATUS, callback as (...args: unknown[]) => void);
    }
  },

  // AI Agent
  ai: {
    sendMessage: (message: string): Promise<IPCResponse<ChatMessage>> =>
      ipcRenderer.invoke(IPC.AI_SEND_MESSAGE, message),
    stop: (): void =>
      ipcRenderer.send(IPC.AI_STOP),
    onMessage: (callback: (message: ChatMessage) => void) => {
      ipcRenderer.on(IPC.AI_MESSAGE, (_event, message) => callback(message));
      return () => ipcRenderer.removeListener(IPC.AI_MESSAGE, callback as (...args: unknown[]) => void);
    },
    onThinking: (callback: (thinking: boolean) => void) => {
      ipcRenderer.on(IPC.AI_THINKING, (_event, thinking) => callback(thinking));
      return () => ipcRenderer.removeListener(IPC.AI_THINKING, callback as (...args: unknown[]) => void);
    },
    onToolCall: (callback: (toolCall: { name: string; input: unknown }) => void) => {
      ipcRenderer.on(IPC.AI_TOOL_CALL, (_event, toolCall) => callback(toolCall));
      return () => ipcRenderer.removeListener(IPC.AI_TOOL_CALL, callback as (...args: unknown[]) => void);
    },
    onTokenCount: (callback: (count: { input: number; output: number }) => void) => {
      ipcRenderer.on(IPC.AI_TOKEN_COUNT, (_event, count) => callback(count));
      return () => ipcRenderer.removeListener(IPC.AI_TOKEN_COUNT, callback as (...args: unknown[]) => void);
    }
  },

  // Settings
  settings: {
    get: (): Promise<IPCResponse<Record<string, unknown>>> =>
      ipcRenderer.invoke(IPC.SETTINGS_GET),
    set: (settings: Record<string, unknown>): Promise<IPCResponse<void>> =>
      ipcRenderer.invoke(IPC.SETTINGS_SET, settings)
  },

  // Window Controls
  window: {
    minimize: (): void => ipcRenderer.send(IPC.WINDOW_MINIMIZE),
    maximize: (): void => ipcRenderer.send(IPC.WINDOW_MAXIMIZE),
    close: (): void => ipcRenderer.send(IPC.WINDOW_CLOSE)
  },

  // Notifications
  onToast: (callback: (message: string, type: 'success' | 'error' | 'info') => void) => {
    ipcRenderer.on(IPC.TOAST, (_event, message, type) => callback(message, type));
    return () => ipcRenderer.removeListener(IPC.TOAST, callback as (...args: unknown[]) => void);
  },

  onError: (callback: (error: string) => void) => {
    ipcRenderer.on(IPC.ERROR, (_event, error) => callback(error));
    return () => ipcRenderer.removeListener(IPC.ERROR, callback as (...args: unknown[]) => void);
  }
};

contextBridge.exposeInMainWorld('hydra', api);

// Type declaration for renderer
declare global {
  interface Window {
    hydra: typeof api;
  }
}
