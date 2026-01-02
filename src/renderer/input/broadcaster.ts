import type { MouseEventData, KeyboardEventData, BrowserTarget } from '../../shared/types';
import { humanizeMouseEvent, humanizeKeyboardEvent, getMouseDelay, getKeystrokeDelay } from './humanizer';

export class InputBroadcaster {
  private target: BrowserTarget = 'all';
  private driverIndex: number = 0;
  private enabled: boolean = false;

  setTarget(target: BrowserTarget): void {
    this.target = target;
    window.hydra.input.setTarget(target);
  }

  setDriver(index: number): void {
    this.driverIndex = index;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  async broadcastMouse(event: MouseEventData): Promise<void> {
    if (!this.enabled) return;

    // Get target browser indices
    const indices = this.getTargetIndices();

    // Broadcast to each target with humanized variance
    for (const index of indices) {
      if (index === this.driverIndex) continue; // Skip driver browser

      const delay = getMouseDelay(index);
      setTimeout(() => {
        const humanized = humanizeMouseEvent(event, index);
        window.hydra.input.mouse(humanized);
      }, delay);
    }
  }

  async broadcastKeyboard(event: KeyboardEventData): Promise<void> {
    if (!this.enabled) return;

    const indices = this.getTargetIndices();

    for (const index of indices) {
      if (index === this.driverIndex) continue;

      const delay = getKeystrokeDelay(index);
      setTimeout(() => {
        const humanized = humanizeKeyboardEvent(event);
        window.hydra.input.keyboard(humanized);
      }, delay);
    }
  }

  private getTargetIndices(): number[] {
    if (this.target === 'all') {
      return [0, 1, 2, 3];
    }
    const index = parseInt(this.target.split('_')[1]) - 1;
    return [index];
  }
}

export const broadcaster = new InputBroadcaster();
