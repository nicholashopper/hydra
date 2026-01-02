import type { MouseEventData, KeyboardEventData } from '../../shared/types';
import {
  MOUSE_VARIANCE_PX,
  CLICK_DELAY_MIN_MS,
  CLICK_DELAY_MAX_MS,
  KEYSTROKE_VARIANCE_MS
} from '../../shared/constants';

export function humanizeMouseEvent(event: MouseEventData, browserIndex: number): MouseEventData {
  // Add random variance to position
  const varianceX = (Math.random() - 0.5) * MOUSE_VARIANCE_PX * 2;
  const varianceY = (Math.random() - 0.5) * MOUSE_VARIANCE_PX * 2;

  return {
    ...event,
    x: event.x + varianceX,
    y: event.y + varianceY
  };
}

export function getMouseDelay(browserIndex: number): number {
  // Stagger clicks across browsers
  const baseDelay = browserIndex * (CLICK_DELAY_MIN_MS + Math.random() * (CLICK_DELAY_MAX_MS - CLICK_DELAY_MIN_MS));
  return baseDelay;
}

export function getKeystrokeDelay(browserIndex: number): number {
  return browserIndex * (Math.random() * KEYSTROKE_VARIANCE_MS * 2);
}

export function humanizeKeyboardEvent(event: KeyboardEventData): KeyboardEventData {
  // Keyboard events don't need modification, but we keep this for consistency
  return { ...event };
}
