// Profile & Session Types
export interface Profile {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
  cookies?: string; // JSON, encrypted
  local_storage?: string; // JSON, encrypted
  fingerprint: FingerprintConfig;
  proxy_config?: ProxyConfig;
  notes?: string;
}

export interface ProxyConfig {
  type: 'http' | 'https' | 'socks5';
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export interface FingerprintConfig {
  seed: string;
  userAgent: string;
  platform: string;
  languages: string[];
  timezone: string;
  screen: { width: number; height: number };
  webgl: { vendor: string; renderer: string };
  canvas: { noise: number };
  audio: { noise: number };
}

// Browser Types
export interface BrowserInfo {
  id: number;
  url: string;
  title: string;
  isDriver: boolean;
  proxyStatus: 'connected' | 'failed' | 'none';
  proxyIp?: string;
}

export type DriverMode = 'human' | 'ai';
export type BrowserTarget = 'all' | `browser_${number}`;

// AI Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  tokenCount?: number;
}

export interface PageState {
  url: string;
  title: string;
  buttons: ElementInfo[];
  links: ElementInfo[];
  inputs: InputInfo[];
}

export interface ElementInfo {
  text: string;
  selector: string;
  href?: string;
}

export interface InputInfo {
  type: string;
  placeholder?: string;
  label?: string;
  selector: string;
}

export interface ActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  results?: ActionResult[];
}

// Input Event Types
export interface MouseEventData {
  type: 'click' | 'move' | 'scroll';
  x: number;
  y: number;
  button?: number;
  deltaY?: number;
}

export interface KeyboardEventData {
  type: 'keydown' | 'keyup' | 'keypress';
  key: string;
  code: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

// IPC Types
export interface IPCResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
