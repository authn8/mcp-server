# @authn8/mcp-server

MCP server that provides AI agents access to Authn8 2FA codes via PAT authentication.

## Prerequisites

- An [Authn8](https://authn8.com) account
- A Personal Access Token (PAT) created in the Authn8 dashboard

## Quick Start

```bash
npx @authn8/mcp-server
```

Set the `AUTHN8_API_KEY` environment variable to your PAT token.

## Docker

```bash
docker run -e AUTHN8_API_KEY=pat_xxx ghcr.io/authn8/mcp-server
```

## Configuration

### Claude Desktop

Add to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "authn8": {
      "command": "npx",
      "args": ["-y", "@authn8/mcp-server"],
      "env": {
        "AUTHN8_API_KEY": "pat_your_token_here"
      }
    }
  }
}
```

### Claude Code (CLI)

Add to your Claude Code configuration file:

**macOS:** `~/.claude.json`
**Windows:** `%USERPROFILE%\.claude.json`

```json
{
  "mcpServers": {
    "authn8": {
      "command": "npx",
      "args": ["-y", "@authn8/mcp-server"],
      "env": {
        "AUTHN8_API_KEY": "pat_your_token_here"
      }
    }
  }
}
```

### Cursor

Add to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "authn8": {
      "command": "npx",
      "args": ["-y", "@authn8/mcp-server"],
      "env": {
        "AUTHN8_API_KEY": "pat_your_token_here"
      }
    }
  }
}
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AUTHN8_API_KEY` | Yes | - | Your PAT token from Authn8 |
| `AUTHN8_API_URL` | No | `https://api.authn8.com` | API endpoint URL |

## Available Tools

All tools declare an output schema and return `structuredContent` alongside the
text block, so clients get typed results without re-parsing JSON out of text.

### list_accounts

Returns all 2FA accounts accessible to this token.

**Example response:**
```json
{
  "accounts": [
    {
      "id": "924c52a6-4457-4970-a39f-4dc620217683",
      "name": "AWS Production",
      "issuerDomain": "amazon.com"
    }
  ]
}
```

### get_otp

Generates a TOTP code for a specific account.

**Parameters:**
- `account_id` (string, optional) - UUID of the account
- `account_name` (string, optional) - Name or issuer domain to search for (case-insensitive partial match)

Provide either `account_id` or `account_name`. If multiple accounts match the
name, the tool returns them in `multipleMatches` so you can retry with an
`account_id`.

**Example response:**
```json
{
  "name": "AWS Production",
  "code": "483920",
  "length": 6
}
```

**Ambiguous match:**
```json
{
  "error": "Multiple accounts match 'aws'. Please be more specific or use account_id.",
  "length": 0,
  "multipleMatches": [
    {
      "id": "924c52a6-4457-4970-a39f-4dc620217683",
      "name": "AWS Production",
      "issuerDomain": "amazon.com"
    }
  ]
}
```

### whoami

Returns information about the current token.

**Example response:**
```json
{
  "tokenName": "MCP Server 2",
  "businessName": "Bytecode Solutions",
  "scopedGroups": [
    { "id": "cfeba14a-e990-49e8-b6e5-61d63f7d68c8", "name": "HR" }
  ],
  "expiresAt": "2025-12-25T23:59:59Z",
  "accountCount": 1
}
```

## Links

- [Authn8](https://authn8.com) - Create an account and manage 2FA tokens
- [GitHub Repository](https://github.com/authn8/mcp-server)
