import Anthropic from '@anthropic-ai/sdk';

export const BROWSER_TOOLS: Anthropic.Tool[] = [
  {
    name: 'navigate',
    description: 'Navigate to a URL. Use this to go to websites.',
    input_schema: {
      type: 'object' as const,
      properties: {
        url: {
          type: 'string',
          description: 'Full URL including https://'
        },
        target: {
          type: 'string',
          description: 'Which browser(s) to navigate. Use "all" for all browsers, or "browser_N" where N is the browser number (1-10)',
          default: 'all'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'click',
    description: 'Click an element. Finds by text content, aria-label, or CSS selector.',
    input_schema: {
      type: 'object' as const,
      properties: {
        element: {
          type: 'string',
          description: 'Text content, aria-label, or CSS selector of element to click'
        },
        target: {
          type: 'string',
          description: 'Target browser(s): "all" or "browser_N" (N=1-10)',
          default: 'all'
        }
      },
      required: ['element']
    }
  },
  {
    name: 'type',
    description: 'Type text into an input field. First clicks the field, then types.',
    input_schema: {
      type: 'object' as const,
      properties: {
        element: {
          type: 'string',
          description: 'Label, placeholder, aria-label, or CSS selector of input'
        },
        text: {
          type: 'string',
          description: 'Text to type'
        },
        clear_first: {
          type: 'boolean',
          default: true,
          description: 'Clear existing text before typing'
        },
        press_enter: {
          type: 'boolean',
          default: false,
          description: 'Press Enter after typing'
        },
        target: {
          type: 'string',
          description: 'Target browser(s): "all" or "browser_N" (N=1-10)',
          default: 'all'
        }
      },
      required: ['element', 'text']
    }
  },
  {
    name: 'scroll',
    description: 'Scroll the page in a direction.',
    input_schema: {
      type: 'object' as const,
      properties: {
        direction: {
          type: 'string',
          enum: ['up', 'down'],
          description: 'Scroll direction'
        },
        amount: {
          type: 'string',
          enum: ['small', 'medium', 'large', 'page'],
          default: 'medium',
          description: 'How far to scroll. small=200px, medium=500px, large=1000px, page=viewport height'
        },
        target: {
          type: 'string',
          description: 'Target browser(s): "all" or "browser_N" (N=1-10)',
          default: 'all'
        }
      },
      required: ['direction']
    }
  },
  {
    name: 'wait',
    description: 'Wait for a condition before proceeding.',
    input_schema: {
      type: 'object' as const,
      properties: {
        condition: {
          type: 'string',
          enum: ['element_visible', 'element_hidden', 'url_contains', 'seconds'],
          description: 'What to wait for'
        },
        value: {
          type: 'string',
          description: 'Element selector (for element conditions), URL substring, or number of seconds'
        },
        timeout_seconds: {
          type: 'number',
          default: 10,
          description: 'Max time to wait'
        },
        target: {
          type: 'string',
          description: 'Target browser(s): "all" or "browser_N" (N=1-10)',
          default: 'all'
        }
      },
      required: ['condition', 'value']
    }
  },
  {
    name: 'extract',
    description: 'Extract text content from elements matching a selector.',
    input_schema: {
      type: 'object' as const,
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector of element(s) to extract text from'
        },
        target: {
          type: 'string',
          description: 'Target browser(s): "all" or "browser_N" (N=1-10)',
          default: 'all'
        }
      },
      required: ['selector']
    }
  },
  {
    name: 'get_page_info',
    description: 'Get current page URL, title, and visible interactive elements. Call this to understand page state.',
    input_schema: {
      type: 'object' as const,
      properties: {
        include_screenshot: {
          type: 'boolean',
          default: false,
          description: 'Include base64 screenshot (uses vision, costs more tokens)'
        },
        target: {
          type: 'string',
          description: 'Target browser(s): "all" or "browser_N" (N=1-10)',
          default: 'all'
        }
      }
    }
  },
  {
    name: 'screenshot',
    description: 'Take a screenshot. Returns base64 image.',
    input_schema: {
      type: 'object' as const,
      properties: {
        target: {
          type: 'string',
          description: 'Target browser: "browser_N" (N=1-10) or "all"',
          default: 'browser_1'
        }
      }
    }
  }
];
