# authn8-mcp

MCP server that provides AI agents access to Authn8 2FA codes via PAT authentication.

## Prerequisites

- An [Authn8](https://authn8.com) account
- A Personal Access Token (PAT) created in the Authn8 dashboard

## Quick Start

```bash
npx authn8-mcp
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
      "args": ["-y", "authn8-mcp"],
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
      "args": ["-y", "authn8-mcp"],
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

### list_accounts

Returns all 2FA accounts accessible to this token.

**Example response:**
```json
[
  {
    "id": "924c52a6-4457-4970-a39f-4dc620217683",
    "name": "AWS Production",
    "group": "HR",
    "issuer": "Amazon"
  }
]
```

### get_otp

Generates a TOTP code for a specific account.

**Parameters:**
- `account_id` (string, optional) - UUID of the account
- `account_name` (string, optional) - Name to search for (partial match)

Provide either `account_id` or `account_name`. If multiple accounts match the name, the tool returns a list of matches.

**Example response:**
```json
{
  "account": "AWS Production",
  "otp": "483920",
  "expires_in_seconds": 18
}
```

### whoami

Returns information about the current token.

**Example response:**
```json
{
  "business": "Bytecode Solutions",
  "token_name": "MCP Server 2",
  "scoped_groups": ["HR"],
  "account_count": 1,
  "expires_at": "2025-12-25T23:59:59Z"
}
```

## Links

- [Authn8](https://authn8.com) - Create an account and manage 2FA tokens
- [GitHub Repository](https://github.com/authn8/mcp-server)
