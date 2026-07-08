# Confluence MCP Server

A Model Context Protocol (MCP) server that provides secure access to Atlassian Confluence through its REST API.

> **Setting this up for Claude Desktop and not a developer?** No Node.js
> or build tools needed — just a downloaded binary and a config file edit:
> [Windows guide](./WINDOWS-SETUP.md) · [macOS guide](./MACOS-SETUP.md)

## Using with Claude Code

To use this MCP server with Claude Code, add it to your MCP configuration file:

### Option 1: Using claude mcp add-json (recommended)

The easiest way to add this server is using the `claude mcp add-json` command:

```bash
# First, build the server
npm run build

# Then add it using claude mcp add-json
claude mcp add-json confluence
```

When prompted, paste the following JSON configuration:

```json
{
  "command": "node",
  "args": ["/path/to/confluence_mcp/dist/index.js"],
  "env": {
    "CONFLUENCE_BASE_URL": "https://confluence.your-internal-domain.com",
    "CONFLUENCE_API_TOKEN": "your-personal-access-token",
    "ALLOWED_SPACES": "SPACE1,SPACE2,SPACE3"
  }
}
```

### Option 2: Manual configuration

Alternatively, you can manually edit your MCP configuration file (`~/.config/claude-code/mcp_servers_config.json`):

```json
{
  "mcpServers": {
    "confluence": {
      "command": "node",
      "args": ["/path/to/confluence_mcp/dist/index.js"],
      "env": {
        "CONFLUENCE_BASE_URL": "https://confluence.your-internal-domain.com",
        "CONFLUENCE_API_TOKEN": "your-personal-access-token",
        "ALLOWED_SPACES": "SPACE1,SPACE2,SPACE3"
      }
    }
  }
}
```

### Option 3: Using tsx for development

For development or if you prefer running TypeScript directly:

```json
{
  "command": "npx",
  "args": ["tsx", "/path/to/confluence_mcp/src/index.ts"],
  "env": {
    "CONFLUENCE_BASE_URL": "https://confluence.your-internal-domain.com",
    "CONFLUENCE_API_TOKEN": "your-personal-access-token",
    "ALLOWED_SPACES": "SPACE1,SPACE2,SPACE3"
  }
}
```

### Configuration Notes

- Replace the environment variables with your actual Confluence credentials
- The `ALLOWED_SPACES` should be a comma-separated list of space keys you want to allow access to
- Restart Claude Code after updating the configuration
- Make sure you have built the project first with `npm run build` if using Option 1

Once configured, you can use commands like:
- "Search for API documentation in Confluence"
- "Create a new page in the DEV space"
- "Show me all pages in the PROJ space"

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Confluence credentials
   ```

3. **Build and run:**
   ```bash
   npm run build
   npm start
   ```

   Or for development:
   ```bash
   npm run dev
   ```

## Configuration

Create a `.env` file with your Confluence credentials:

```env
CONFLUENCE_BASE_URL=https://confluence.your-internal-domain.com
CONFLUENCE_API_TOKEN=your-personal-access-token
ALLOWED_SPACES=SPACE1,SPACE2,SPACE3
DEBUG=false
```

This server targets Confluence **Server / Data Center** (the `/rest/api` v1
REST API with Bearer Personal Access Token auth), not Confluence Cloud.

- **CONFLUENCE_BASE_URL** must include any reverse-proxy context path your
  instance sits behind (e.g. `https://confluence.internal.example.com/confluence`),
  and should point at your load balancer URL if the instance is clustered.
- If your instance uses an internally-issued TLS certificate, make sure
  Node trusts that CA (e.g. via `NODE_EXTRA_CA_CERTS`), or requests will fail
  with TLS errors.

### Getting a Personal Access Token

1. In Confluence, go to your profile picture -> **Settings** -> **Personal Access Tokens**
2. Click **Create token**, give it a descriptive label, and scope it to the spaces you need
3. Copy the generated token (save it securely — treat it like any other credential,
   e.g. via an environment variable or secrets manager rather than committing it)

## Available Tools

- **search_confluence** - Search content across allowed spaces
- **get_page** - Retrieve a specific page by ID
- **create_page** - Create a new page
- **update_page** - Update an existing page
- **move_page** - Move a page to a different space or parent
- **list_spaces** - List accessible spaces
- **get_space_by_id** - Get space details by space ID
- **get_space_by_key** - Get space details by space key
- **get_space_content** - Get pages from a specific space
- **get_page_children** - Get child pages of a specific page

## Security Features

- **PAT Authentication** - Secure access using a Data Center Personal Access Token
- **Space Restrictions** - Configurable allowed spaces list
- **Permission Validation** - Respects Confluence permissions
- **Request Validation** - Input validation and sanitization

## Development

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Testing
npm test

# Build
npm run build

# Package standalone binaries that bundle the Node.js runtime, so end users
# don't need Node installed — see WINDOWS-SETUP.md / MACOS-SETUP.md
npm run package:win   # -> release/confluence-mcp-win-x64.exe
npm run package:mac   # -> release/confluence-mcp-macos-{x64,arm64}
```