// Combine all stealth patches into one injection script
import { getNavigatorPatch } from './navigator';
import { getVisibilityPatch } from './visibility';
import { getCanvasPatch } from './canvas';
import { getWebGLPatch } from './webgl';
import { getAudioPatch } from './audio';
import { getWebRTCPatch } from './webrtc';
import type { FingerprintConfig } from '../shared/types';

export function getStealthScript(fingerprint: FingerprintConfig): string {
  const scripts = [
    // Visibility patches first (most important for throttling)
    getVisibilityPatch(),

    // Navigator patches
    getNavigatorPatch({
      userAgent: fingerprint.userAgent,
      platform: fingerprint.platform,
      languages: fingerprint.languages
    }),

    // Canvas fingerprint
    getCanvasPatch(fingerprint.seed, fingerprint.canvas.noise),

    // WebGL fingerprint
    getWebGLPatch(fingerprint.webgl.vendor, fingerprint.webgl.renderer),

    // Audio fingerprint
    getAudioPatch(fingerprint.seed, fingerprint.audio.noise),

    // WebRTC IP leak prevention
    getWebRTCPatch(),

    // Timezone override
    getTimezonePatch(fingerprint.timezone),

    // Screen override
    getScreenPatch(fingerprint.screen.width, fingerprint.screen.height),

    // Plugin/MimeType patches
    getPluginPatch(),

    // Chrome object patch (fixes hasInconsistentChromeObject)
    getChromePatch()
  ];

  return scripts.join('\n\n');
}

function getTimezonePatch(timezone: string): string {
  return `
    (function() {
      const targetTimezone = '${timezone}';

      // Override Date.prototype.getTimezoneOffset
      const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
      Date.prototype.getTimezoneOffset = function() {
        // Calculate offset based on timezone
        const date = new Date();
        const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
        const local = new Date(date.toLocaleString('en-US', { timeZone: targetTimezone }));
        return (utc.getTime() - local.getTime()) / 60000;
      };

      // Override Intl.DateTimeFormat
      const originalDateTimeFormat = Intl.DateTimeFormat;
      Intl.DateTimeFormat = function(locales, options) {
        const opts = { ...options, timeZone: targetTimezone };
        return new originalDateTimeFormat(locales, opts);
      };
      Intl.DateTimeFormat.prototype = originalDateTimeFormat.prototype;
      Intl.DateTimeFormat.supportedLocalesOf = originalDateTimeFormat.supportedLocalesOf;

      // Override Date.prototype.toLocaleString family
      const origToLocaleString = Date.prototype.toLocaleString;
      const origToLocaleDateString = Date.prototype.toLocaleDateString;
      const origToLocaleTimeString = Date.prototype.toLocaleTimeString;

      Date.prototype.toLocaleString = function(locales, options) {
        return origToLocaleString.call(this, locales, { ...options, timeZone: targetTimezone });
      };

      Date.prototype.toLocaleDateString = function(locales, options) {
        return origToLocaleDateString.call(this, locales, { ...options, timeZone: targetTimezone });
      };

      Date.prototype.toLocaleTimeString = function(locales, options) {
        return origToLocaleTimeString.call(this, locales, { ...options, timeZone: targetTimezone });
      };
    })();
  `;
}

function getScreenPatch(width: number, height: number): string {
  return `
    (function() {
      const W = ${width};
      const H = ${height};

      // Override screen properties
      Object.defineProperty(window.screen, 'width', { get: () => W, configurable: true });
      Object.defineProperty(window.screen, 'height', { get: () => H, configurable: true });
      Object.defineProperty(window.screen, 'availWidth', { get: () => W, configurable: true });
      Object.defineProperty(window.screen, 'availHeight', { get: () => H, configurable: true });
      Object.defineProperty(window.screen, 'colorDepth', { get: () => 24, configurable: true });
      Object.defineProperty(window.screen, 'pixelDepth', { get: () => 24, configurable: true });

      // Override window dimensions
      Object.defineProperty(window, 'innerWidth', { get: () => W, configurable: true });
      Object.defineProperty(window, 'innerHeight', { get: () => H, configurable: true });
      Object.defineProperty(window, 'outerWidth', { get: () => W, configurable: true });
      Object.defineProperty(window, 'outerHeight', { get: () => H, configurable: true });

      // Override devicePixelRatio
      Object.defineProperty(window, 'devicePixelRatio', { get: () => 2, configurable: true });

      // Override document.documentElement dimensions (used by many sites)
      Object.defineProperty(document.documentElement, 'clientWidth', { get: () => W, configurable: true });
      Object.defineProperty(document.documentElement, 'clientHeight', { get: () => H, configurable: true });

      // Override visualViewport API
      if (window.visualViewport) {
        Object.defineProperty(window.visualViewport, 'width', { get: () => W, configurable: true });
        Object.defineProperty(window.visualViewport, 'height', { get: () => H, configurable: true });
      }

      // Override matchMedia for CSS media queries
      const originalMatchMedia = window.matchMedia;
      window.matchMedia = function(query) {
        // Handle width/height queries
        const widthMatch = query.match(/\\((?:max|min)-width:\\s*(\\d+)px\\)/);
        const heightMatch = query.match(/\\((?:max|min)-height:\\s*(\\d+)px\\)/);

        if (widthMatch || heightMatch) {
          const modifiedQuery = query
            .replace(/\\(width:\\s*\\d+px\\)/, '(width: ' + W + 'px)')
            .replace(/\\(height:\\s*\\d+px\\)/, '(height: ' + H + 'px)');

          // For min/max queries, we need to evaluate against our spoofed dimensions
          const result = originalMatchMedia.call(window, query);
          const spoofedResult = {
            matches: result.matches,
            media: result.media,
            onchange: result.onchange,
            addListener: result.addListener.bind(result),
            removeListener: result.removeListener.bind(result),
            addEventListener: result.addEventListener.bind(result),
            removeEventListener: result.removeEventListener.bind(result),
            dispatchEvent: result.dispatchEvent.bind(result)
          };

          // Recalculate matches based on spoofed dimensions
          if (query.includes('max-width') && widthMatch) {
            spoofedResult.matches = W <= parseInt(widthMatch[1]);
          } else if (query.includes('min-width') && widthMatch) {
            spoofedResult.matches = W >= parseInt(widthMatch[1]);
          }
          if (query.includes('max-height') && heightMatch) {
            spoofedResult.matches = spoofedResult.matches && H <= parseInt(heightMatch[1]);
          } else if (query.includes('min-height') && heightMatch) {
            spoofedResult.matches = spoofedResult.matches && H >= parseInt(heightMatch[1]);
          }

          return spoofedResult;
        }

        return originalMatchMedia.call(window, query);
      };
    })();
  `;
}

function getPluginPatch(): string {
  return `
    (function() {
      // Override navigator.plugins to return empty-ish list (mobile-like)
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          const plugins = [];
          plugins.item = (i) => plugins[i] || null;
          plugins.namedItem = (name) => null;
          plugins.refresh = () => {};
          return plugins;
        },
        configurable: true
      });

      // Override navigator.mimeTypes
      Object.defineProperty(navigator, 'mimeTypes', {
        get: () => {
          const mimeTypes = [];
          mimeTypes.item = (i) => mimeTypes[i] || null;
          mimeTypes.namedItem = (name) => null;
          return mimeTypes;
        },
        configurable: true
      });

      // Remove Battery API (can be used for fingerprinting)
      delete navigator.getBattery;

      // Override connection info
      if ('connection' in navigator) {
        Object.defineProperty(navigator, 'connection', {
          get: () => ({
            effectiveType: '4g',
            rtt: 50,
            downlink: 10,
            saveData: false
          }),
          configurable: true
        });
      }
    })();
  `;
}

function getChromePatch(): string {
  return `
    (function() {
      // Create a consistent chrome object that matches real Chrome browser
      const originalChrome = window.chrome || {};

      const mockChrome = {
        app: {
          isInstalled: false,
          InstallState: {
            DISABLED: 'disabled',
            INSTALLED: 'installed',
            NOT_INSTALLED: 'not_installed'
          },
          RunningState: {
            CANNOT_RUN: 'cannot_run',
            READY_TO_RUN: 'ready_to_run',
            RUNNING: 'running'
          },
          getDetails: function() { return null; },
          getIsInstalled: function() { return false; },
          installState: function(callback) {
            if (callback) callback('not_installed');
          },
          runningState: function() { return 'cannot_run'; }
        },
        runtime: {
          // In normal browsing (non-extension), these behave this way
          connect: function() {
            throw new Error('Could not establish connection. Receiving end does not exist.');
          },
          sendMessage: function() {
            throw new Error('Could not establish connection. Receiving end does not exist.');
          },
          id: undefined,
          OnInstalledReason: {
            CHROME_UPDATE: 'chrome_update',
            INSTALL: 'install',
            SHARED_MODULE_UPDATE: 'shared_module_update',
            UPDATE: 'update'
          },
          OnRestartRequiredReason: {
            APP_UPDATE: 'app_update',
            OS_UPDATE: 'os_update',
            PERIODIC: 'periodic'
          },
          PlatformArch: {
            ARM: 'arm',
            ARM64: 'arm64',
            MIPS: 'mips',
            MIPS64: 'mips64',
            X86_32: 'x86-32',
            X86_64: 'x86-64'
          },
          PlatformNaclArch: {
            ARM: 'arm',
            MIPS: 'mips',
            MIPS64: 'mips64',
            X86_32: 'x86-32',
            X86_64: 'x86-64'
          },
          PlatformOs: {
            ANDROID: 'android',
            CROS: 'cros',
            LINUX: 'linux',
            MAC: 'mac',
            OPENBSD: 'openbsd',
            WIN: 'win'
          },
          RequestUpdateCheckStatus: {
            NO_UPDATE: 'no_update',
            THROTTLED: 'throttled',
            UPDATE_AVAILABLE: 'update_available'
          }
        },
        csi: function() {
          return {
            startE: Date.now(),
            onloadT: Date.now(),
            pageT: Date.now() - performance.timing.navigationStart,
            tran: 15
          };
        },
        loadTimes: function() {
          const nav = performance.timing;
          return {
            commitLoadTime: nav.responseStart / 1000,
            connectionInfo: 'h2',
            finishDocumentLoadTime: nav.domContentLoadedEventEnd / 1000,
            finishLoadTime: nav.loadEventEnd / 1000,
            firstPaintAfterLoadTime: 0,
            firstPaintTime: nav.domContentLoadedEventStart / 1000,
            navigationType: 'Other',
            npnNegotiatedProtocol: 'h2',
            requestTime: nav.requestStart / 1000,
            startLoadTime: nav.navigationStart / 1000,
            wasAlternateProtocolAvailable: false,
            wasFetchedViaSpdy: true,
            wasNpnNegotiated: true
          };
        }
      };

      // Make properties non-writable and non-configurable like real chrome object
      const makeNativeFunction = (fn, name) => {
        const native = new Proxy(fn, {
          get(target, prop) {
            if (prop === 'toString') {
              return () => 'function ' + name + '() { [native code] }';
            }
            return Reflect.get(target, prop);
          }
        });
        return native;
      };

      // Wrap functions to appear native
      mockChrome.csi = makeNativeFunction(mockChrome.csi, 'csi');
      mockChrome.loadTimes = makeNativeFunction(mockChrome.loadTimes, 'loadTimes');
      mockChrome.runtime.connect = makeNativeFunction(mockChrome.runtime.connect, 'connect');
      mockChrome.runtime.sendMessage = makeNativeFunction(mockChrome.runtime.sendMessage, 'sendMessage');
      mockChrome.app.getDetails = makeNativeFunction(mockChrome.app.getDetails, 'getDetails');
      mockChrome.app.getIsInstalled = makeNativeFunction(mockChrome.app.getIsInstalled, 'getIsInstalled');
      mockChrome.app.installState = makeNativeFunction(mockChrome.app.installState, 'installState');
      mockChrome.app.runningState = makeNativeFunction(mockChrome.app.runningState, 'runningState');

      // Define chrome on window with proper descriptors
      Object.defineProperty(window, 'chrome', {
        value: mockChrome,
        writable: false,
        enumerable: true,
        configurable: false
      });
    })();
  `;
}

export { getNavigatorPatch, getVisibilityPatch, getCanvasPatch, getWebGLPatch, getAudioPatch, getWebRTCPatch };
