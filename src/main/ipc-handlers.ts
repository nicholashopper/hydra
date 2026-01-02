import { ipcMain, BrowserWindow, dialog, app } from 'electron';
import { IPC } from '../shared/ipc-channels';
import { ProfileManager } from './profile-manager';
import { BrowserController } from './browser-controller';
import { AIAgent } from './ai/agent';
import type { Profile, BrowserTarget, ChatMessage } from '../shared/types';

export function setupIPCHandlers(
  mainWindow: BrowserWindow,
  profileManager: ProfileManager,
  browserController: BrowserController,
  aiAgent: AIAgent | null
): void {
  // Profile Management
  ipcMain.handle(IPC.PROFILE_LIST, async (): Promise<{ success: boolean; data?: Profile[]; error?: string }> => {
    try {
      const profiles = profileManager.list();
      return { success: true, data: profiles };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC.PROFILE_GET, async (_, id: string): Promise<{ success: boolean; data?: Profile; error?: string }> => {
    try {
      const profile = profileManager.get(id);
      if (!profile) {
        return { success: false, error: 'Profile not found' };
      }
      return { success: true, data: profile };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC.PROFILE_CREATE, async (_, name: string): Promise<{ success: boolean; data?: Profile; error?: string }> => {
    try {
      const profile = profileManager.create(name);
      return { success: true, data: profile };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC.PROFILE_UPDATE, async (_, profile: Partial<Profile> & { id: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      profileManager.update(profile);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC.PROFILE_DELETE, async (_, id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      profileManager.delete(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC.PROFILE_EXPORT, async (_, id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Export Profile',
        defaultPath: `profile-${id}.hydra`,
        filters: [{ name: 'HYDRA Profile', extensions: ['hydra'] }]
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'Export cancelled' };
      }

      profileManager.export(id, result.filePath);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC.PROFILE_IMPORT, async (): Promise<{ success: boolean; data?: Profile; error?: string }> => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Import Profile',
        filters: [{ name: 'HYDRA Profile', extensions: ['hydra'] }],
        properties: ['openFile']
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'Import cancelled' };
      }

      const profile = profileManager.import(result.filePaths[0]);
      return { success: true, data: profile };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC.PROFILE_LOAD, async (_, id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const profile = profileManager.get(id);
      if (!profile) {
        return { success: false, error: 'Profile not found' };
      }

      // Close existing browsers and reinitialize
      await browserController.close();
      await browserController.initialize(profile);

      mainWindow.webContents.send(IPC.BROWSER_READY);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Browser Control
  ipcMain.handle(IPC.BROWSER_NAVIGATE, async (_, url: string, target: BrowserTarget) => {
    try {
      const result = await browserController.navigate(url, target);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC.BROWSER_CLICK, async (_, element: string, target: BrowserTarget) => {
    try {
      const result = await browserController.click(element, target);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC.BROWSER_TYPE, async (_, element: string, text: string, options: { clearFirst?: boolean; pressEnter?: boolean }, target: BrowserTarget) => {
    try {
      const result = await browserController.type(element, text, options, target);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC.BROWSER_SCROLL, async (_, direction: 'up' | 'down', amount: string, target: BrowserTarget) => {
    try {
      const result = await browserController.scroll(direction, amount as 'small' | 'medium' | 'large' | 'page', target);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC.BROWSER_GET_STATE, async (_, target: BrowserTarget) => {
    try {
      const states = await browserController.getPageState(target);
      return { success: true, data: states };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC.BROWSER_SCREENSHOT, async (_, target: BrowserTarget) => {
    try {
      const screenshot = await browserController.screenshot(target);
      return { success: true, data: screenshot };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC.BROWSER_SET_DRIVER, async (_, browserId: number) => {
    browserController.setDriver(browserId);
    return { success: true };
  });

  ipcMain.handle(IPC.BROWSER_ADD, async () => {
    try {
      const success = await browserController.addBrowser();
      return { success, data: { count: browserController.getBrowserCount() } };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC.BROWSER_REMOVE, async () => {
    try {
      const success = await browserController.removeBrowser();
      return { success, data: { count: browserController.getBrowserCount() } };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC.BROWSER_COUNT, async () => {
    return { success: true, data: { count: browserController.getBrowserCount() } };
  });

  // Browser Navigation
  ipcMain.on(IPC.BROWSER_BACK, (_, browserIndex: number) => {
    browserController.goBack(browserIndex);
  });

  ipcMain.on(IPC.BROWSER_FORWARD, (_, browserIndex: number) => {
    browserController.goForward(browserIndex);
  });

  ipcMain.on(IPC.BROWSER_REFRESH, (_, browserIndex: number) => {
    browserController.refresh(browserIndex);
  });

  ipcMain.on(IPC.BROWSER_HIDE, () => {
    browserController.hideAll();
  });

  ipcMain.on(IPC.BROWSER_SHOW, () => {
    browserController.showAll();
  });

  ipcMain.handle(IPC.BROWSER_GO_TO_URL, async (_, browserIndex: number, url: string) => {
    try {
      await browserController.goToUrl(browserIndex, url);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Set up URL change listeners to notify renderer
  browserController.setupUrlListeners((browserIndex, url) => {
    mainWindow.webContents.send(IPC.BROWSER_URL_CHANGED, { browserIndex, url });
  });

  // Input Broadcasting
  ipcMain.on(IPC.INPUT_MOUSE, async (_, data) => {
    try {
      await browserController.broadcastMouse(data);
    } catch (error) {
      console.error('Mouse broadcast error:', error);
    }
  });

  ipcMain.on(IPC.INPUT_KEYBOARD, async (_, data) => {
    try {
      await browserController.broadcastKeyboard(data);
    } catch (error) {
      console.error('Keyboard broadcast error:', error);
    }
  });

  ipcMain.on(IPC.INPUT_SET_TARGET, (_, target: BrowserTarget) => {
    browserController.setInputTarget(target);
  });

  // Proxy
  ipcMain.handle(IPC.PROXY_CHECK, async (_, browserId: number) => {
    try {
      const result = await browserController.checkProxy(browserId);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // AI Agent
  ipcMain.handle(IPC.AI_SEND_MESSAGE, async (_, message: string): Promise<{ success: boolean; data?: ChatMessage; error?: string }> => {
    if (!aiAgent) {
      return { success: false, error: 'AI agent not initialized. Set ANTHROPIC_API_KEY environment variable.' };
    }

    try {
      const response = await aiAgent.sendMessage(message);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.on(IPC.AI_STOP, () => {
    if (aiAgent) {
      aiAgent.stop();
    }
  });

  // Settings
  ipcMain.handle(IPC.SETTINGS_GET, async () => {
    try {
      const apiKey = profileManager.getSetting('anthropic_api_key');
      return {
        success: true,
        data: {
          anthropic_api_key: apiKey ? '••••••••' : null
        }
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle(IPC.SETTINGS_SET, async (_, settings: Record<string, unknown>) => {
    try {
      if (settings.anthropic_api_key) {
        profileManager.setSetting('anthropic_api_key', settings.anthropic_api_key as string);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Window Controls
  ipcMain.on(IPC.WINDOW_MINIMIZE, () => {
    mainWindow.minimize();
  });

  ipcMain.on(IPC.WINDOW_MAXIMIZE, () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on(IPC.WINDOW_CLOSE, () => {
    mainWindow.close();
  });
}
