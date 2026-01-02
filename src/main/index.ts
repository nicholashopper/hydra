import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env files - try multiple locations for dev and production
const envPaths = [
  path.join(process.cwd(), '.env'),
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '..', '..', '.env'),
  path.join(__dirname, '..', '..', '..', '.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    const result = config({ path: envPath });
    if (!result.error) break;
  }
}

import { app, BrowserWindow, shell } from 'electron';
import { ProfileManager } from './profile-manager';
import { BrowserController } from './browser-controller';
import { AIAgent } from './ai/agent';
import { setupIPCHandlers } from './ipc-handlers';
import { WINDOW_MIN_WIDTH, WINDOW_MIN_HEIGHT, WINDOW_DEFAULT_WIDTH, WINDOW_DEFAULT_HEIGHT } from '../shared/constants';
import { IPC } from '../shared/ipc-channels';

let mainWindow: BrowserWindow | null = null;
let profileManager: ProfileManager | null = null;
let browserController: BrowserController | null = null;
let aiAgent: AIAgent | null = null;

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: WINDOW_DEFAULT_WIDTH,
    height: WINDOW_DEFAULT_HEIGHT,
    minWidth: WINDOW_MIN_WIDTH,
    minHeight: WINDOW_MIN_HEIGHT,
    frame: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 15, y: 15 },
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Initialize managers
  profileManager = new ProfileManager();
  browserController = new BrowserController();

  // Try to initialize AI agent
  try {
    aiAgent = new AIAgent(browserController, mainWindow);
  } catch (error) {
    console.warn('AI agent not initialized:', (error as Error).message);
    aiAgent = null;
  }

  // Setup IPC handlers
  setupIPCHandlers(mainWindow, profileManager, browserController, aiAgent);

  // Load renderer
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Open DevTools in development - detached so it doesn't affect layout
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Auto-load first profile or create default
  mainWindow.webContents.once('did-finish-load', async () => {
    try {
      const profiles = profileManager!.list();
      let profile;

      if (profiles.length === 0) {
        profile = profileManager!.create('Default Profile');
      } else {
        profile = profiles[0];
      }

      await browserController!.initialize(profile, 3, mainWindow!);
      mainWindow!.webContents.send(IPC.BROWSER_READY);
    } catch (error) {
      console.error('Failed to initialize browsers:', error);
      mainWindow!.webContents.send(IPC.ERROR, (error as Error).message);
    }
  });

  // Save session on close
  mainWindow.on('close', async () => {
    if (browserController && browserController.getBrowserCount() > 0) {
      try {
        const sessionData = await browserController.saveSession();
        const profiles = profileManager!.list();
        if (profiles.length > 0) {
          profileManager!.update({
            id: profiles[0].id,
            cookies: sessionData.cookies,
            local_storage: sessionData.localStorage
          });
        }
      } catch (error) {
        // Browser may already be closed, ignore
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Quit when all windows are closed
app.on('window-all-closed', async () => {
  if (browserController) {
    await browserController.close();
  }
  if (profileManager) {
    profileManager.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  if (mainWindow) {
    mainWindow.webContents.send(IPC.ERROR, error.message);
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  if (mainWindow) {
    mainWindow.webContents.send(IPC.ERROR, String(reason));
  }
});
