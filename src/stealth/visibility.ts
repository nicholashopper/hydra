// Visibility API patches - make all browsers appear active
export function getVisibilityPatch(): string {
  return `
    // Override document.hidden
    Object.defineProperty(document, 'hidden', {
      get: () => false,
      configurable: true
    });

    // Override document.visibilityState
    Object.defineProperty(document, 'visibilityState', {
      get: () => 'visible',
      configurable: true
    });

    // Override hasFocus
    Document.prototype.hasFocus = function() {
      return true;
    };

    // Block visibilitychange events
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      if (type === 'visibilitychange' || type === 'blur' || type === 'focusout') {
        // Don't add these listeners
        return;
      }
      return originalAddEventListener.call(this, type, listener, options);
    };

    // Also block on document
    const originalDocAddEventListener = document.addEventListener;
    document.addEventListener = function(type, listener, options) {
      if (type === 'visibilitychange' || type === 'blur' || type === 'focusout') {
        return;
      }
      return originalDocAddEventListener.call(this, type, listener, options);
    };

    // Override focus/blur on window
    const originalWindowAddEventListener = window.addEventListener;
    window.addEventListener = function(type, listener, options) {
      if (type === 'blur' || type === 'focusout' || type === 'pagehide') {
        return;
      }
      return originalWindowAddEventListener.call(this, type, listener, options);
    };

    // Maintain consistent requestAnimationFrame timing
    let lastTime = 0;
    const originalRAF = window.requestAnimationFrame;
    window.requestAnimationFrame = function(callback) {
      const currentTime = Date.now();
      const timeToCall = Math.max(0, 16 - (currentTime - lastTime));
      lastTime = currentTime + timeToCall;
      return originalRAF.call(window, function(timestamp) {
        callback(timestamp);
      });
    };

    // Ensure timers are not throttled
    const originalSetInterval = window.setInterval;
    window.setInterval = function(callback, delay, ...args) {
      // Minimum 4ms to avoid detection but no throttling
      const safeDelay = Math.max(4, delay);
      return originalSetInterval.call(window, callback, safeDelay, ...args);
    };

    const originalSetTimeout = window.setTimeout;
    window.setTimeout = function(callback, delay, ...args) {
      const safeDelay = Math.max(0, delay);
      return originalSetTimeout.call(window, callback, safeDelay, ...args);
    };
  `;
}
