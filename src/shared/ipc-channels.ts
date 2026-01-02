// IPC Channel Names
export const IPC = {
  // Profile Management
  PROFILE_LIST: 'profile:list',
  PROFILE_GET: 'profile:get',
  PROFILE_CREATE: 'profile:create',
  PROFILE_UPDATE: 'profile:update',
  PROFILE_DELETE: 'profile:delete',
  PROFILE_EXPORT: 'profile:export',
  PROFILE_IMPORT: 'profile:import',
  PROFILE_LOAD: 'profile:load',

  // Browser Control
  BROWSER_NAVIGATE: 'browser:navigate',
  BROWSER_CLICK: 'browser:click',
  BROWSER_TYPE: 'browser:type',
  BROWSER_SCROLL: 'browser:scroll',
  BROWSER_GET_STATE: 'browser:get-state',
  BROWSER_SCREENSHOT: 'browser:screenshot',
  BROWSER_SET_DRIVER: 'browser:set-driver',
  BROWSER_STATUS: 'browser:status',
  BROWSER_READY: 'browser:ready',
  BROWSER_ADD: 'browser:add',
  BROWSER_REMOVE: 'browser:remove',
  BROWSER_COUNT: 'browser:count',
  BROWSER_BACK: 'browser:back',
  BROWSER_FORWARD: 'browser:forward',
  BROWSER_REFRESH: 'browser:refresh',
  BROWSER_GO_TO_URL: 'browser:go-to-url',
  BROWSER_URL_CHANGED: 'browser:url-changed',
  BROWSER_LAYOUT: 'browser:layout',
  BROWSER_HIDE: 'browser:hide',
  BROWSER_SHOW: 'browser:show',

  // Input Broadcasting
  INPUT_MOUSE: 'input:mouse',
  INPUT_KEYBOARD: 'input:keyboard',
  INPUT_SET_TARGET: 'input:set-target',

  // Proxy
  PROXY_CHECK: 'proxy:check',
  PROXY_STATUS: 'proxy:status',

  // AI Agent
  AI_SEND_MESSAGE: 'ai:send-message',
  AI_STOP: 'ai:stop',
  AI_MESSAGE: 'ai:message',
  AI_THINKING: 'ai:thinking',
  AI_TOOL_CALL: 'ai:tool-call',
  AI_TOKEN_COUNT: 'ai:token-count',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',

  // Window
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',

  // Notifications
  TOAST: 'toast',
  ERROR: 'error'
} as const;

export type IPCChannel = typeof IPC[keyof typeof IPC];
