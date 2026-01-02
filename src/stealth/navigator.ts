// Navigator stealth patches
export function getNavigatorPatch(fingerprint: {
  userAgent: string;
  platform: string;
  languages: string[];
}): string {
  return `
    // Remove webdriver property
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
      configurable: true
    });

    // Override userAgent
    Object.defineProperty(navigator, 'userAgent', {
      get: () => '${fingerprint.userAgent}',
      configurable: true
    });

    // Override platform
    Object.defineProperty(navigator, 'platform', {
      get: () => '${fingerprint.platform}',
      configurable: true
    });

    // Override languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ${JSON.stringify(fingerprint.languages)},
      configurable: true
    });

    Object.defineProperty(navigator, 'language', {
      get: () => '${fingerprint.languages[0]}',
      configurable: true
    });

    // Remove automation indicators
    delete navigator.__proto__.webdriver;

    // Chrome runtime spoofing (for sites checking for Chrome)
    if (!window.chrome) {
      window.chrome = {
        runtime: {
          connect: () => {},
          sendMessage: () => {}
        },
        loadTimes: () => ({})
      };
    }

    // Override hardwareConcurrency
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => 8,
      configurable: true
    });

    // Override deviceMemory
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => 8,
      configurable: true
    });

    // Override maxTouchPoints
    Object.defineProperty(navigator, 'maxTouchPoints', {
      get: () => 5,
      configurable: true
    });

    // Override vendor
    Object.defineProperty(navigator, 'vendor', {
      get: () => 'Apple Computer, Inc.',
      configurable: true
    });

    // Permissions API spoofing
    const originalQuery = window.Permissions?.prototype?.query;
    if (originalQuery) {
      window.Permissions.prototype.query = function(parameters) {
        if (parameters.name === 'notifications') {
          return Promise.resolve({ state: Notification.permission, onchange: null });
        }
        return originalQuery.call(this, parameters);
      };
    }
  `;
}
