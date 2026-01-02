import { BrowserView, BrowserWindow, session } from 'electron';
import type { Profile, ProxyConfig, BrowserTarget, PageState, ActionResult, MouseEventData, KeyboardEventData } from '../shared/types';
import { getStealthScript } from '../stealth';
import { IPC } from '../shared/ipc-channels';
import {
  DEFAULT_BROWSER_COUNT,
  MAX_BROWSER_COUNT,
  PROXY_CHECK_URL,
  SCROLL_AMOUNTS,
  MOUSE_VARIANCE_PX,
  CLICK_DELAY_MIN_MS,
  CLICK_DELAY_MAX_MS,
  KEYSTROKE_VARIANCE_MS,
  BROWSER_VIEWPORT_WIDTH,
  BROWSER_VIEWPORT_HEIGHT
} from '../shared/constants';

export interface BrowserInstance {
  view: BrowserView;
  proxyConfig?: ProxyConfig;
  proxyStatus: 'connected' | 'failed' | 'none';
  proxyIp?: string;
}

export class BrowserController {
  private mainWindow: BrowserWindow | null = null;
  private instances: BrowserInstance[] = [];
  private profile: Profile | null = null;
  private driverIndex: number = 0;
  private inputTarget: BrowserTarget = 'all';
  private urlChangeCallback: ((browserIndex: number, url: string) => void) | null = null;

  async initialize(profile: Profile, browserCount: number = DEFAULT_BROWSER_COUNT, mainWindow?: BrowserWindow): Promise<void> {
    this.profile = profile;
    if (mainWindow) {
      this.mainWindow = mainWindow;
    }

    if (!this.mainWindow) {
      throw new Error('Main window not set');
    }

    // Create browser views
    const count = Math.min(Math.max(1, browserCount), MAX_BROWSER_COUNT);
    for (let i = 0; i < count; i++) {
      await this.createBrowserView(i);
    }

    // Layout the views
    this.layoutViews();

    // Listen for window resize
    this.mainWindow.on('resize', () => this.layoutViews());
  }

  private async createBrowserView(index: number): Promise<BrowserInstance> {
    if (!this.mainWindow || !this.profile) {
      throw new Error('Not initialized');
    }

    const proxyKey = `proxy_${index}`;
    const proxyConfig = (this.profile.proxy_config as unknown as Record<string, ProxyConfig>)?.[proxyKey];

    // Create a unique session for each browser view
    const ses = session.fromPartition(`persist:browser_${index}`, { cache: true });

    // Set user agent
    ses.setUserAgent(this.profile.fingerprint.userAgent);

    // Configure proxy if needed
    if (proxyConfig) {
      await ses.setProxy({
        proxyRules: `${proxyConfig.type}://${proxyConfig.host}:${proxyConfig.port}`,
        proxyBypassRules: '<local>'
      });

      // Handle proxy auth
      if (proxyConfig.username && proxyConfig.password) {
        ses.webRequest.onBeforeSendHeaders((details, callback) => {
          callback({ requestHeaders: details.requestHeaders });
        });

        // Set up auth handler for proxy
        const authHandler = (_event: Electron.Event, _webContents: Electron.WebContents, _request: Electron.AuthenticationResponseDetails, authInfo: Electron.AuthInfo, callback: (username?: string, password?: string) => void) => {
          if (authInfo.isProxy) {
            callback(proxyConfig.username, proxyConfig.password);
          }
        };
        this.mainWindow.webContents.on('login', authHandler);
      }
    }

    // Restore cookies if available
    if (this.profile.cookies && index === 0) {
      try {
        const cookies = JSON.parse(this.profile.cookies);
        for (const cookie of cookies) {
          await ses.cookies.set({
            url: `https://${cookie.domain.replace(/^\./, '')}${cookie.path}`,
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            expirationDate: cookie.expires
          }).catch(() => { /* ignore cookie errors */ });
        }
      } catch (e) {
        console.error('Failed to restore cookies:', e);
      }
    }

    const view = new BrowserView({
      webPreferences: {
        session: ses,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        webSecurity: true
      }
    });

    // Set background color
    view.setBackgroundColor('#1a1a2e');

    this.mainWindow.addBrowserView(view);

    // Inject stealth script as early as possible
    // Use did-navigate (fires before dom-ready) for earliest injection
    const injectStealth = () => {
      if (this.profile) {
        // Always use current constants for screen dimensions (overrides stored profile values)
        const fingerprint = {
          ...this.profile.fingerprint,
          screen: {
            width: BROWSER_VIEWPORT_WIDTH,
            height: BROWSER_VIEWPORT_HEIGHT
          }
        };
        view.webContents.executeJavaScript(getStealthScript(fingerprint)).catch(() => {});
      }
    };

    // Earliest possible injection: when loading starts
    view.webContents.on('did-start-loading', () => {
      // Try to inject immediately, may fail if document doesn't exist yet
      injectStealth();
    });

    // Primary injection: on navigation complete (before DOM ready)
    view.webContents.on('did-navigate', injectStealth);
    view.webContents.on('did-navigate-in-page', injectStealth);

    // Backup injection: on DOM ready (catches late-loading content)
    view.webContents.on('dom-ready', injectStealth);

    // Also inject on frame navigation for iframes
    view.webContents.on('did-frame-navigate', injectStealth);

    // Handle new windows
    view.webContents.setWindowOpenHandler(({ url }) => {
      view.webContents.loadURL(url);
      return { action: 'deny' };
    });

    const instance: BrowserInstance = {
      view,
      proxyConfig,
      proxyStatus: proxyConfig ? 'connected' : 'none'
    };

    this.instances.push(instance);

    // Load Google as a test
    await view.webContents.loadURL('https://www.google.com');

    console.log(`Created BrowserView ${index}`);

    // Check proxy status
    if (proxyConfig) {
      this.checkProxy(index).catch(() => {
        instance.proxyStatus = 'failed';
      });
    }

    return instance;
  }

  private layoutViews(): void {
    if (!this.mainWindow) return;

    const [windowWidth, windowHeight] = this.mainWindow.getSize();
    const controlPanelWidth = 350;
    const titleBarHeight = 40;
    const navBarHeight = 32;
    const borderWidth = 1;
    const browserAreaWidth = windowWidth - controlPanelWidth;
    const browserAreaHeight = windowHeight - titleBarHeight - navBarHeight;

    const count = this.instances.length;
    if (count === 0) return;

    // Calculate grid layout with borders between views
    const totalBorderWidth = borderWidth * (count + 1); // borders on all sides
    const availableWidth = browserAreaWidth - totalBorderWidth;
    const viewWidth = Math.floor(availableWidth / count);
    const viewHeight = browserAreaHeight - borderWidth; // bottom border

    // Build nav bar layout info (same dimensions as browser views)
    const navBars = this.instances.map((_, i) => ({
      x: controlPanelWidth + borderWidth + (i * (viewWidth + borderWidth)),
      y: titleBarHeight,
      width: viewWidth,
      browserIndex: i
    }));

    this.instances.forEach((instance, i) => {
      const bounds = {
        x: navBars[i].x,
        y: titleBarHeight + navBarHeight,
        width: viewWidth,
        height: viewHeight
      };
      instance.view.setBounds(bounds);
    });

    // Send layout info to renderer so nav bars stay in sync
    this.mainWindow.webContents.send(IPC.BROWSER_LAYOUT, { navBars });
  }

  // Get layout info for React nav bars
  getLayoutInfo(): { navBars: Array<{ x: number; y: number; width: number; browserIndex: number }> } {
    if (!this.mainWindow) return { navBars: [] };

    const [windowWidth] = this.mainWindow.getSize();
    const controlPanelWidth = 350;
    const titleBarHeight = 40;
    const borderWidth = 1;
    const browserAreaWidth = windowWidth - controlPanelWidth;

    const count = this.instances.length;
    if (count === 0) return { navBars: [] };

    const totalBorderWidth = borderWidth * (count + 1);
    const availableWidth = browserAreaWidth - totalBorderWidth;
    const viewWidth = Math.floor(availableWidth / count);

    const navBars = this.instances.map((_, i) => ({
      x: controlPanelWidth + borderWidth + (i * (viewWidth + borderWidth)),
      y: titleBarHeight,
      width: viewWidth,
      browserIndex: i
    }));

    return { navBars };
  }

  async checkProxy(index: number): Promise<{ ip: string } | null> {
    const instance = this.instances[index];
    if (!instance || !instance.proxyConfig) {
      return null;
    }

    try {
      const response = await instance.view.webContents.executeJavaScript(`
        fetch('${PROXY_CHECK_URL}', { mode: 'cors' })
          .then(res => res.json())
          .catch(() => null)
      `);

      if (response && response.ip) {
        instance.proxyStatus = 'connected';
        instance.proxyIp = response.ip;
        return { ip: response.ip };
      }
      throw new Error('No IP returned');
    } catch (e) {
      instance.proxyStatus = 'failed';
      throw e;
    }
  }

  getBrowserCount(): number {
    return this.instances.length;
  }

  async addBrowser(): Promise<boolean> {
    if (!this.mainWindow || !this.profile) return false;
    if (this.instances.length >= MAX_BROWSER_COUNT) return false;

    const newIndex = this.instances.length;
    const instance = await this.createBrowserView(newIndex);
    this.attachUrlListeners(instance, newIndex);
    this.layoutViews();
    return true;
  }

  async removeBrowser(): Promise<boolean> {
    if (!this.mainWindow) return false;
    if (this.instances.length <= 1) return false;

    const instance = this.instances.pop();
    if (instance) {
      this.mainWindow.removeBrowserView(instance.view);
      (instance.view.webContents as any).destroy?.();
    }

    // Adjust driver index if needed
    if (this.driverIndex >= this.instances.length) {
      this.driverIndex = this.instances.length - 1;
    }

    this.layoutViews();
    return true;
  }

  // Hide all browser views (for modals)
  hideAll(): void {
    this.instances.forEach(instance => {
      instance.view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
    });
  }

  // Show all browser views
  showAll(): void {
    this.layoutViews();
  }

  // Navigation methods for individual browsers
  goBack(browserIndex: number): void {
    const instance = this.instances[browserIndex];
    if (instance && instance.view.webContents.canGoBack()) {
      instance.view.webContents.goBack();
    }
  }

  goForward(browserIndex: number): void {
    const instance = this.instances[browserIndex];
    if (instance && instance.view.webContents.canGoForward()) {
      instance.view.webContents.goForward();
    }
  }

  refresh(browserIndex: number): void {
    const instance = this.instances[browserIndex];
    if (instance) {
      instance.view.webContents.reload();
    }
  }

  async goToUrl(browserIndex: number, url: string): Promise<void> {
    const instance = this.instances[browserIndex];
    if (instance) {
      // Add https if no protocol specified
      let fullUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        fullUrl = 'https://' + url;
      }
      await instance.view.webContents.loadURL(fullUrl);
    }
  }

  getUrl(browserIndex: number): string {
    const instance = this.instances[browserIndex];
    if (instance) {
      return instance.view.webContents.getURL();
    }
    return '';
  }

  getAllUrls(): string[] {
    return this.instances.map(inst => inst.view.webContents.getURL());
  }

  // Set up URL change listeners
  setupUrlListeners(callback: (browserIndex: number, url: string) => void): void {
    this.urlChangeCallback = callback;
    this.instances.forEach((instance, i) => {
      this.attachUrlListeners(instance, i);
    });
  }

  private attachUrlListeners(instance: BrowserInstance, index: number): void {
    if (!this.urlChangeCallback) return;
    const callback = this.urlChangeCallback;
    instance.view.webContents.on('did-navigate', () => {
      callback(index, instance.view.webContents.getURL());
    });
    instance.view.webContents.on('did-navigate-in-page', () => {
      callback(index, instance.view.webContents.getURL());
    });
  }

  async navigate(url: string, target: BrowserTarget): Promise<ActionResult> {
    const indices = this.getTargetIndices(target);
    const results = await Promise.all(
      indices.map(async (i) => {
        try {
          await this.instances[i].view.webContents.loadURL(url);
          return { success: true, url: this.instances[i].view.webContents.getURL() };
        } catch (e) {
          return { success: false, error: (e as Error).message };
        }
      })
    );
    return { success: results.every(r => r.success), results };
  }

  async click(element: string, target: BrowserTarget): Promise<ActionResult> {
    const indices = this.getTargetIndices(target);
    const results = await Promise.all(
      indices.map(async (i, idx) => {
        try {
          await this.delay(CLICK_DELAY_MIN_MS + Math.random() * (CLICK_DELAY_MAX_MS - CLICK_DELAY_MIN_MS) * idx);

          const clicked = await this.instances[i].view.webContents.executeJavaScript(`
            (function() {
              const descriptor = ${JSON.stringify(element)};

              // Try exact text
              let el = Array.from(document.querySelectorAll('button, a, [role="button"], input[type="submit"]'))
                .find(e => e.textContent?.trim() === descriptor);

              // Try partial text
              if (!el) {
                el = Array.from(document.querySelectorAll('button, a, [role="button"], input[type="submit"]'))
                  .find(e => e.textContent?.toLowerCase().includes(descriptor.toLowerCase()));
              }

              // Try aria-label
              if (!el) el = document.querySelector('[aria-label="' + descriptor + '"]');

              // Try placeholder
              if (!el) el = document.querySelector('[placeholder="' + descriptor + '"]');

              // Try as CSS selector
              if (!el) {
                try { el = document.querySelector(descriptor); } catch(e) {}
              }

              if (el) {
                el.click();
                return true;
              }
              return false;
            })()
          `);

          if (!clicked) {
            return { success: false, error: `Element not found: ${element}` };
          }
          return { success: true };
        } catch (e) {
          return { success: false, error: (e as Error).message };
        }
      })
    );
    return { success: results.every(r => r.success), results };
  }

  async type(element: string, text: string, options: { clearFirst?: boolean; pressEnter?: boolean }, target: BrowserTarget): Promise<ActionResult> {
    const indices = this.getTargetIndices(target);
    const results = await Promise.all(
      indices.map(async (i, idx) => {
        try {
          await this.delay(CLICK_DELAY_MIN_MS + Math.random() * (CLICK_DELAY_MAX_MS - CLICK_DELAY_MIN_MS) * idx);

          const typed = await this.instances[i].view.webContents.executeJavaScript(`
            (function() {
              const descriptor = ${JSON.stringify(element)};
              const text = ${JSON.stringify(text)};
              const clearFirst = ${options.clearFirst !== false};
              const pressEnter = ${options.pressEnter === true};

              // Find input
              let el = document.querySelector('[placeholder="' + descriptor + '"]');
              if (!el) el = document.querySelector('[aria-label="' + descriptor + '"]');
              if (!el) el = document.querySelector('[name="' + descriptor + '"]');
              if (!el) {
                // Try label
                const label = Array.from(document.querySelectorAll('label'))
                  .find(l => l.textContent?.toLowerCase().includes(descriptor.toLowerCase()));
                if (label && label.htmlFor) {
                  el = document.getElementById(label.htmlFor);
                }
              }
              if (!el) {
                try { el = document.querySelector(descriptor); } catch(e) {}
              }

              if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
                el.focus();
                if (clearFirst) el.value = '';
                el.value = text;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));

                if (pressEnter) {
                  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
                  el.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, bubbles: true }));
                  if (el.form) el.form.submit();
                }
                return true;
              }
              return false;
            })()
          `);

          if (!typed) {
            return { success: false, error: `Element not found: ${element}` };
          }
          return { success: true };
        } catch (e) {
          return { success: false, error: (e as Error).message };
        }
      })
    );
    return { success: results.every(r => r.success), results };
  }

  async scroll(direction: 'up' | 'down', amount: keyof typeof SCROLL_AMOUNTS, target: BrowserTarget): Promise<ActionResult> {
    const indices = this.getTargetIndices(target);
    const pixels = SCROLL_AMOUNTS[amount] * (direction === 'up' ? -1 : 1);

    const results = await Promise.all(
      indices.map(async (i, idx) => {
        try {
          await this.delay(50 * idx);
          await this.instances[i].view.webContents.executeJavaScript(
            `window.scrollBy(0, ${pixels})`
          );
          return { success: true };
        } catch (e) {
          return { success: false, error: (e as Error).message };
        }
      })
    );
    return { success: results.every(r => r.success), results };
  }

  async wait(condition: string, value: string, timeoutSeconds: number, target: BrowserTarget): Promise<ActionResult> {
    const indices = this.getTargetIndices(target);
    const timeout = timeoutSeconds * 1000;

    const results = await Promise.all(
      indices.map(async (i) => {
        try {
          const webContents = this.instances[i].view.webContents;

          switch (condition) {
            case 'element_visible':
              await this.waitFor(() =>
                webContents.executeJavaScript(`!!document.querySelector('${value}')`),
                timeout
              );
              break;
            case 'element_hidden':
              await this.waitFor(() =>
                webContents.executeJavaScript(`!document.querySelector('${value}')`),
                timeout
              );
              break;
            case 'url_contains':
              await this.waitFor(() =>
                Promise.resolve(webContents.getURL().includes(value)),
                timeout
              );
              break;
            case 'seconds':
              await this.delay(parseFloat(value) * 1000);
              break;
          }

          return { success: true };
        } catch (e) {
          return { success: false, error: `Timeout waiting for ${condition}: ${value}` };
        }
      })
    );
    return { success: results.every(r => r.success), results };
  }

  private async waitFor(check: () => Promise<boolean>, timeout: number): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await check()) return;
      await this.delay(100);
    }
    throw new Error('Timeout');
  }

  async extract(selector: string, target: BrowserTarget): Promise<ActionResult> {
    const indices = this.getTargetIndices(target);

    const results = await Promise.all(
      indices.map(async (i) => {
        try {
          const texts = await this.instances[i].view.webContents.executeJavaScript(`
            Array.from(document.querySelectorAll('${selector}'))
              .map(el => el.textContent?.trim() || '')
          `);
          return { success: true, data: texts };
        } catch (e) {
          return { success: false, error: (e as Error).message };
        }
      })
    );
    return { success: results.every(r => r.success), results };
  }

  async getPageState(target: BrowserTarget): Promise<PageState[]> {
    const indices = this.getTargetIndices(target);

    return Promise.all(
      indices.map(async (i) => {
        const webContents = this.instances[i].view.webContents;

        try {
          const data = await webContents.executeJavaScript(`
            (function() {
              function generateSelector(el) {
                if (el.id) return '#' + el.id;
                const testId = el.getAttribute('data-testid');
                if (testId) return '[data-testid="' + testId + '"]';
                const tag = el.tagName.toLowerCase();
                const classes = Array.from(el.classList).slice(0, 2).join('.');
                if (classes) return tag + '.' + classes;
                return tag;
              }

              const buttons = Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"]'))
                .slice(0, 20)
                .map(el => ({
                  text: el.textContent?.trim() || el.getAttribute('aria-label') || '',
                  selector: generateSelector(el)
                }));

              const links = Array.from(document.querySelectorAll('a[href]'))
                .slice(0, 20)
                .map(el => ({
                  text: el.textContent?.trim() || '',
                  selector: generateSelector(el),
                  href: el.getAttribute('href') || ''
                }));

              const inputs = Array.from(document.querySelectorAll('input, textarea, select'))
                .slice(0, 20)
                .map(el => ({
                  type: el.getAttribute('type') || el.tagName.toLowerCase(),
                  placeholder: el.getAttribute('placeholder') || '',
                  label: el.getAttribute('aria-label') || el.getAttribute('placeholder') || '',
                  selector: generateSelector(el)
                }));

              return { buttons, links, inputs };
            })()
          `);

          return {
            url: webContents.getURL(),
            title: webContents.getTitle(),
            ...data
          };
        } catch {
          return {
            url: webContents.getURL(),
            title: webContents.getTitle(),
            buttons: [],
            links: [],
            inputs: []
          };
        }
      })
    );
  }

  async screenshot(target: BrowserTarget): Promise<string> {
    const index = target === 'all' ? 0 : parseInt(target.split('_')[1]) - 1;
    const image = await this.instances[index].view.webContents.capturePage();
    return image.toPNG().toString('base64');
  }

  // Input broadcasting methods
  async broadcastMouse(event: MouseEventData): Promise<void> {
    const indices = this.getTargetIndices(this.inputTarget);

    await Promise.all(
      indices.map(async (i, idx) => {
        if (i === this.driverIndex && event.type !== 'scroll') return;

        const webContents = this.instances[i].view.webContents;
        const variance = {
          x: event.x + (Math.random() - 0.5) * MOUSE_VARIANCE_PX * 2,
          y: event.y + (Math.random() - 0.5) * MOUSE_VARIANCE_PX * 2
        };

        await this.delay(idx * (CLICK_DELAY_MIN_MS + Math.random() * (CLICK_DELAY_MAX_MS - CLICK_DELAY_MIN_MS)));

        switch (event.type) {
          case 'click':
            webContents.sendInputEvent({
              type: 'mouseDown',
              x: variance.x,
              y: variance.y,
              button: event.button === 2 ? 'right' : 'left',
              clickCount: 1
            });
            webContents.sendInputEvent({
              type: 'mouseUp',
              x: variance.x,
              y: variance.y,
              button: event.button === 2 ? 'right' : 'left',
              clickCount: 1
            });
            break;
          case 'move':
            webContents.sendInputEvent({
              type: 'mouseMove',
              x: variance.x,
              y: variance.y
            });
            break;
          case 'scroll':
            webContents.sendInputEvent({
              type: 'mouseWheel',
              x: variance.x,
              y: variance.y,
              deltaX: 0,
              deltaY: event.deltaY || 0
            });
            break;
        }
      })
    );
  }

  async broadcastKeyboard(event: KeyboardEventData): Promise<void> {
    const indices = this.getTargetIndices(this.inputTarget);

    await Promise.all(
      indices.map(async (i, idx) => {
        if (i === this.driverIndex) return;

        const webContents = this.instances[i].view.webContents;
        await this.delay(idx * (Math.random() * KEYSTROKE_VARIANCE_MS * 2));

        webContents.sendInputEvent({
          type: event.type === 'keydown' ? 'keyDown' : 'keyUp',
          keyCode: event.key
        });
      })
    );
  }

  setDriver(index: number): void {
    this.driverIndex = index;
  }

  setInputTarget(target: BrowserTarget): void {
    this.inputTarget = target;
  }

  getStatus(): Array<{ url: string; title: string; proxyStatus: string; proxyIp?: string }> {
    return this.instances.map(inst => ({
      url: inst.view.webContents.getURL(),
      title: inst.view.webContents.getTitle(),
      proxyStatus: inst.proxyStatus,
      proxyIp: inst.proxyIp
    }));
  }

  async saveSession(): Promise<{ cookies: string; localStorage: string }> {
    const allCookies: unknown[] = [];
    const allStorage: Record<string, Record<string, string>> = {};

    for (const inst of this.instances) {
      try {
        const cookies = await inst.view.webContents.session.cookies.get({});
        allCookies.push(...cookies);

        const url = inst.view.webContents.getURL();
        if (url && url !== 'about:blank') {
          const origin = new URL(url).origin;
          const storage = await inst.view.webContents.executeJavaScript(`
            (function() {
              const items = {};
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) items[key] = localStorage.getItem(key) || '';
              }
              return items;
            })()
          `);
          allStorage[origin] = storage;
        }
      } catch {
        // Ignore errors
      }
    }

    return {
      cookies: JSON.stringify(allCookies),
      localStorage: JSON.stringify(allStorage)
    };
  }

  async close(): Promise<void> {
    if (this.mainWindow) {
      for (const inst of this.instances) {
        try {
          this.mainWindow.removeBrowserView(inst.view);
        } catch {
          // View may already be destroyed
        }
      }
    }
    this.instances = [];
  }

  private getTargetIndices(target: BrowserTarget): number[] {
    if (target === 'all') {
      return Array.from({ length: this.instances.length }, (_, i) => i);
    }
    const index = parseInt(target.split('_')[1]) - 1;
    if (index >= 0 && index < this.instances.length) {
      return [index];
    }
    return [];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
