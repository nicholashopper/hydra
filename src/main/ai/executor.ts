import type { Page, ElementHandle } from 'playwright';
import type { ActionResult, BrowserTarget } from '../../shared/types';
import { SCROLL_AMOUNTS } from '../../shared/constants';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
      }
    }
  }

  throw lastError;
}

export async function findElement(page: Page, descriptor: string): Promise<ElementHandle | null> {
  // Try exact text match
  let el = await page.$(`text="${descriptor}"`).catch(() => null);
  if (el) return el;

  // Try partial text match (case insensitive)
  el = await page.$(`text=${descriptor}`).catch(() => null);
  if (el) return el;

  // Try aria-label
  el = await page.$(`[aria-label="${descriptor}"]`).catch(() => null);
  if (el) return el;

  // Try aria-label partial match
  el = await page.$(`[aria-label*="${descriptor}" i]`).catch(() => null);
  if (el) return el;

  // Try placeholder
  el = await page.$(`[placeholder="${descriptor}"]`).catch(() => null);
  if (el) return el;

  // Try placeholder partial match
  el = await page.$(`[placeholder*="${descriptor}" i]`).catch(() => null);
  if (el) return el;

  // Try name attribute
  el = await page.$(`[name="${descriptor}"]`).catch(() => null);
  if (el) return el;

  // Try title attribute
  el = await page.$(`[title="${descriptor}"]`).catch(() => null);
  if (el) return el;

  // Try data-testid
  el = await page.$(`[data-testid="${descriptor}"]`).catch(() => null);
  if (el) return el;

  // Try as CSS selector directly
  try {
    el = await page.$(descriptor);
    if (el) return el;
  } catch {
    // Not a valid selector, continue
  }

  // Try XPath for text
  try {
    el = await page.$(`xpath=//*[contains(text(), "${descriptor}")]`);
    if (el) return el;
  } catch {
    // XPath failed
  }

  return null;
}

export function getTargetIndices(target: BrowserTarget): number[] {
  if (target === 'all') {
    return [0, 1, 2, 3];
  }
  const index = parseInt(target.split('_')[1]) - 1;
  return [index];
}

export function getScrollPixels(amount: keyof typeof SCROLL_AMOUNTS): number {
  return SCROLL_AMOUNTS[amount];
}

export function combineResults(results: ActionResult[]): ActionResult {
  const success = results.every(r => r.success);
  const errors = results.filter(r => !r.success).map(r => r.error);

  return {
    success,
    results,
    error: errors.length > 0 ? errors.join('; ') : undefined
  };
}
