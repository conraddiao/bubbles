#!/usr/bin/env node
import { chromium, firefox, webkit } from 'playwright';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod';

const server = new McpServer({
  name: 'playwright-mcp',
  version: '0.1.0'
});

let browser;
let context;
let page;
let activeBrowserOptions = { name: 'chromium', headless: true };

const browserMap = {
  chromium,
  firefox,
  webkit
};

const closeBrowser = async () => {
  if (page) {
    await page.close().catch(() => {});
    page = undefined;
  }
  if (context) {
    await context.close().catch(() => {});
    context = undefined;
  }
  if (browser) {
    await browser.close().catch(() => {});
    browser = undefined;
  }
};

const ensureBrowser = async (options = {}) => {
  const name = options.browser ?? activeBrowserOptions.name;
  const headless = options.headless ?? activeBrowserOptions.headless ?? true;
  const requested = { name, headless };
  const existingOk =
    browser &&
    browser.isConnected() &&
    activeBrowserOptions.name === requested.name &&
    activeBrowserOptions.headless === requested.headless;

  if (!existingOk) {
    await closeBrowser();
    const type = browserMap[requested.name] ?? chromium;
    browser = await type.launch({ headless: requested.headless });
    activeBrowserOptions = requested;
  }

  if (!context) {
    context = await browser.newContext();
  }

  if (!page) {
    page = await context.newPage();
  }

  return { page, options: requested };
};

const ensurePage = async (options = {}) => {
  const { page: activePage, options: usedOptions } = await ensureBrowser(options);
  return { page: activePage, options: usedOptions };
};

server.registerTool(
  'open_page',
  {
    description: 'Open a URL in Playwright and wait for the page to load.',
    inputSchema: {
      url: z.string().url(),
      browser: z.enum(['chromium', 'firefox', 'webkit']).optional(),
      headless: z.boolean().optional(),
      waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle', 'commit']).optional()
    }
  },
  async ({ url, browser, headless, waitUntil }) => {
    const { page: activePage, options: usedOptions } = await ensurePage({ browser, headless });
    await activePage.goto(url, { waitUntil: waitUntil ?? 'networkidle' });
    return {
      content: [
        {
          type: 'text',
          text: `Opened ${url} using ${usedOptions.name} (${usedOptions.headless ? 'headless' : 'headed'})`
        }
      ]
    };
  }
);

server.registerTool(
  'click',
  {
    description: 'Click a selector on the current page.',
    inputSchema: {
      selector: z.string().describe('CSS selector to click'),
      timeoutMs: z.number().int().positive().optional()
    }
  },
  async ({ selector, timeoutMs }) => {
    const { page: activePage } = await ensurePage();
    await activePage.click(selector, { timeout: timeoutMs ?? 10000 });
    return {
      content: [
        {
          type: 'text',
          text: `Clicked ${selector}`
        }
      ]
    };
  }
);

server.registerTool(
  'fill_field',
  {
    description: 'Fill text into an input located by a selector.',
    inputSchema: {
      selector: z.string().describe('CSS selector for the input/textarea'),
      value: z.string().describe('Text to enter'),
      timeoutMs: z.number().int().positive().optional()
    }
  },
  async ({ selector, value, timeoutMs }) => {
    const { page: activePage } = await ensurePage();
    await activePage.fill(selector, value, { timeout: timeoutMs ?? 10000 });
    return {
      content: [
        {
          type: 'text',
          text: `Filled ${selector} with provided text`
        }
      ]
    };
  }
);

server.registerTool(
  'screenshot',
  {
    description: 'Capture a PNG screenshot of the current page.',
    inputSchema: {
      fullPage: z.boolean().optional()
    }
  },
  async ({ fullPage }) => {
    const { page: activePage } = await ensurePage();
    const buffer = await activePage.screenshot({ fullPage: fullPage ?? true });
    return {
      content: [
        {
          type: 'image',
          data: buffer.toString('base64'),
          mimeType: 'image/png'
        }
      ]
    };
  }
);

server.registerTool(
  'evaluate',
  {
    description: 'Run JavaScript in the page context and return the result as text.',
    inputSchema: {
      expression: z.string().describe('JavaScript expression to evaluate in the page')
    }
  },
  async ({ expression }) => {
    const { page: activePage } = await ensurePage();
    const result = await activePage.evaluate(expr => {
      const value = eval(expr); // evaluated inside the browser context
      if (value === undefined) return 'undefined';
      if (typeof value === 'object') {
        try {
          return JSON.stringify(value);
        } catch {
          return String(value);
        }
      }
      return String(value);
    }, expression);
    return {
      content: [
        {
          type: 'text',
          text: result
        }
      ]
    };
  }
);

server.registerTool(
  'reset_browser',
  {
    description: 'Close the active browser and start fresh on the next request.'
  },
  async () => {
    await closeBrowser();
    return {
      content: [
        {
          type: 'text',
          text: 'Browser reset; a fresh instance will be launched on next command.'
        }
      ]
    };
  }
);

const main = async () => {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Playwright MCP server is running (stdio transport).');
};

const shutdown = async () => {
  await closeBrowser();
  await server.close().catch(() => {});
};

process.on('SIGINT', async () => {
  await shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await shutdown();
  process.exit(0);
});

main().catch(async error => {
  console.error('Playwright MCP server error:', error);
  await shutdown();
  process.exit(1);
});
