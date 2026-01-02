// Application Constants
export const APP_NAME = 'HYDRA';
export const APP_VERSION = '1.0.0';

// Window Dimensions
export const WINDOW_MIN_WIDTH = 1000;
export const WINDOW_MIN_HEIGHT = 1000;
export const WINDOW_DEFAULT_WIDTH = 1200;
export const WINDOW_DEFAULT_HEIGHT = 1000;
export const CONTROL_PANEL_WIDTH = 350;
// iPhone 12 Pro viewport dimensions
export const BROWSER_VIEWPORT_WIDTH = 390;
export const BROWSER_VIEWPORT_HEIGHT = 844;
export const DEFAULT_BROWSER_COUNT = 3;
export const MIN_BROWSER_COUNT = 1;
export const MAX_BROWSER_COUNT = 10;

// Database
export const DATABASE_NAME = 'hydra.db';

// AI Configuration
export const AI_MODEL = 'claude-sonnet-4-20250514';
export const AI_MAX_CONVERSATION_MESSAGES = 20;

export const AI_SYSTEM_PROMPT = `You are an AI browser automation assistant controlling a QA testing tool.
You have access to 4 browser sessions, each with a unique identity.
Use the provided tools to fulfill user requests.
After each action, you'll receive results. Continue until the task is complete.
Be concise in your responses. Report success/failure clearly.
When targeting browsers, default to "all" unless user specifies otherwise.`;

// Input Broadcasting
export const MOUSE_VARIANCE_PX = 5;
export const CLICK_DELAY_MIN_MS = 50;
export const CLICK_DELAY_MAX_MS = 200;
export const KEYSTROKE_VARIANCE_MS = 30;

// Proxy Health Check
export const PROXY_CHECK_URL = 'https://api.ipify.org?format=json';
export const PROXY_CHECK_TIMEOUT_MS = 10000;

// Scroll amounts in pixels
export const SCROLL_AMOUNTS = {
  small: 200,
  medium: 500,
  large: 1000,
  page: BROWSER_VIEWPORT_HEIGHT
} as const;

// WebGL Fingerprint options
export const WEBGL_VENDORS = [
  'Intel Inc.',
  'Google Inc.',
  'Apple Inc.',
  'NVIDIA Corporation',
  'AMD'
];

export const WEBGL_RENDERERS = [
  'Intel Iris OpenGL Engine',
  'ANGLE (Intel, Intel(R) UHD Graphics 630, OpenGL 4.1)',
  'ANGLE (NVIDIA, NVIDIA GeForce GTX 1080, OpenGL 4.5)',
  'Apple GPU',
  'AMD Radeon Pro 5500M OpenGL Engine'
];

// User Agents for mobile emulation
export const USER_AGENTS = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
];

// Timezones mapped to common locales
export const TIMEZONE_LOCALES: Record<string, string[]> = {
  'America/New_York': ['en-US', 'en'],
  'America/Los_Angeles': ['en-US', 'en'],
  'America/Chicago': ['en-US', 'en'],
  'Europe/London': ['en-GB', 'en'],
  'Europe/Paris': ['fr-FR', 'fr', 'en'],
  'Europe/Berlin': ['de-DE', 'de', 'en'],
  'Asia/Tokyo': ['ja-JP', 'ja', 'en'],
  'Asia/Shanghai': ['zh-CN', 'zh', 'en'],
  'Australia/Sydney': ['en-AU', 'en']
};

export const DEFAULT_TIMEZONE = 'America/New_York';
export const DEFAULT_LOCALE = 'en-US';
