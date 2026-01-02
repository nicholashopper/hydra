import type { Page } from 'playwright';
import type { PageState, ElementInfo, InputInfo } from '../../shared/types';

export async function extractPageState(page: Page): Promise<PageState> {
  const [url, title, buttons, links, inputs] = await Promise.all([
    page.url(),
    page.title(),
    extractButtons(page),
    extractLinks(page),
    extractInputs(page)
  ]);

  return { url, title, buttons, links, inputs };
}

async function extractButtons(page: Page): Promise<ElementInfo[]> {
  try {
    return await page.$$eval(
      'button, [role="button"], input[type="submit"], input[type="button"], a.btn, a.button',
      (elements) => {
        return elements.slice(0, 20).map((el) => {
          const text = el.textContent?.trim() ||
            el.getAttribute('aria-label') ||
            el.getAttribute('value') ||
            el.getAttribute('title') ||
            '';

          return {
            text: text.substring(0, 100),
            selector: generateSelector(el)
          };
        }).filter(item => item.text.length > 0);
      }
    );
  } catch {
    return [];
  }
}

async function extractLinks(page: Page): Promise<ElementInfo[]> {
  try {
    return await page.$$eval(
      'a[href]:not([href^="#"]):not([href^="javascript"])',
      (elements) => {
        return elements.slice(0, 20).map((el) => {
          const text = el.textContent?.trim() ||
            el.getAttribute('aria-label') ||
            el.getAttribute('title') ||
            '';

          return {
            text: text.substring(0, 100),
            selector: generateSelector(el),
            href: el.getAttribute('href') || ''
          };
        }).filter(item => item.text.length > 0);
      }
    );
  } catch {
    return [];
  }
}

async function extractInputs(page: Page): Promise<InputInfo[]> {
  try {
    return await page.$$eval(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select',
      (elements) => {
        return elements.slice(0, 20).map((el) => {
          const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

          // Try to find associated label
          let label = '';
          const id = input.id;
          if (id) {
            const labelEl = document.querySelector(`label[for="${id}"]`);
            if (labelEl) label = labelEl.textContent?.trim() || '';
          }

          // Check parent label
          if (!label) {
            const parentLabel = input.closest('label');
            if (parentLabel) label = parentLabel.textContent?.trim() || '';
          }

          // Check aria-label
          if (!label) label = input.getAttribute('aria-label') || '';

          // Check placeholder
          if (!label && 'placeholder' in input) {
            label = (input as HTMLInputElement).placeholder || '';
          }

          return {
            type: input.type || input.tagName.toLowerCase(),
            placeholder: 'placeholder' in input ? (input as HTMLInputElement).placeholder : undefined,
            label: label.substring(0, 100),
            selector: generateSelector(el)
          };
        });
      }
    );
  } catch {
    return [];
  }
}

// This function is injected into the page context
function generateSelector(element: Element): string {
  if (element.id) return `#${element.id}`;

  const testId = element.getAttribute('data-testid');
  if (testId) return `[data-testid="${testId}"]`;

  const name = element.getAttribute('name');
  if (name) return `[name="${name}"]`;

  const tag = element.tagName.toLowerCase();
  const classes = Array.from(element.classList).slice(0, 2);
  if (classes.length > 0) return `${tag}.${classes.join('.')}`;

  const text = element.textContent?.trim().slice(0, 30);
  if (text) return `${tag}:has-text("${text.replace(/"/g, '\\"')}")`;

  return tag;
}
