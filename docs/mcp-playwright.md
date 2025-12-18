## Playwright MCP server

This repo includes a simple MCP server for Playwright. It runs over stdio and exposes tools to open pages, click selectors, fill inputs, capture screenshots, evaluate code, and reset the browser.

### Install browsers (once)

```
npx playwright install chromium
```

Add `firefox`/`webkit` if you plan to use them.

### Run the server locally

```
npm run mcp:playwright
```

### Example MCP client config

Add an entry similar to the following in your MCP client config (e.g., `~/.claude/servers.json`, `~/.mcp/servers.json`, etc.). The path depends on your client; adjust accordingly.

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npm",
      "args": ["run", "mcp:playwright"],
      "workingDirectory": "/Users/conraddiao/Code/bubbles"
    }
  }
}
```

Once configured, start your MCP-capable client and select the `playwright` server.
