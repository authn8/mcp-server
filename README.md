# @authn8/mcp-server

MCP server for [Authn8](https://authn8.com), shared 2FA for teams. It lets AI agents
fetch TOTP codes for the 2FA accounts your team shares in Authn8, so an agent can
finish a sign-in without anyone reading a code out of a phone. Every code it fetches
is recorded in Authn8's access log with the name of the token that asked for it.

Listed in the [MCP Registry](https://registry.modelcontextprotocol.io) as
`io.github.authn8/mcp-server`.

## Requirements

- An Authn8 business on a paid plan. MCP tokens are not available on the Free plan,
  and a business's tokens stop working if its subscription ends.
- An MCP token. Create one in Authn8 under **Settings → MCP Tokens**
  ([how to create an MCP token](https://authn8.com/knowledge-base/how-to-create-an-mcp-token)).
  Tokens start with `pat_`. A token only reaches the 2FA accounts its creator can
  already access, and you can narrow it further to chosen groups and give it an
  expiry date.
- Node.js 18 or later, if you run the npm package. The hosted endpoint needs nothing
  installed.

## Two ways to connect

| | Hosted endpoint | npm package |
|---|---|---|
| Install | None | `npx` runs it locally |
| Transport | Streamable HTTP | stdio |
| Address | `https://api.authn8.com/mcp` | `npx -y @authn8/mcp-server` |
| Token | `Authorization: Bearer pat_...` header | `AUTHN8_API_KEY` environment variable |

Both offer the same three tools: `list_accounts`, `get_otp` and `whoami`.

## Hosted endpoint

Point any MCP client that supports streamable HTTP at `https://api.authn8.com/mcp`
and send your token in the `Authorization` header as `Bearer pat_your_token_here`.

### Claude Code

```bash
claude mcp add --transport http --scope user authn8 https://api.authn8.com/mcp \
  --header "Authorization: Bearer pat_your_token_here"
```

## npm package

### Claude Code

```bash
claude mcp add --env AUTHN8_API_KEY=pat_your_token_here --transport stdio --scope user authn8 \
  -- npx -y @authn8/mcp-server
```

`--scope user` makes the server available in all your projects. Leave it out to add
it to the current project only.

### Claude Desktop

Open **Settings → Developer → Edit Config**, or edit the file directly:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

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

Quit and restart Claude Desktop after saving.

### Cursor

Add this to `~/.cursor/mcp.json` for all projects, or to `.cursor/mcp.json` in a
project:

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

### Other clients

Run `npx -y @authn8/mcp-server` as a stdio server with `AUTHN8_API_KEY` set.

### Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AUTHN8_API_KEY` | Yes | - | Your MCP token (`pat_...`) |
| `AUTHN8_API_URL` | No | `https://api.authn8.com` | API base URL |

On startup the server checks the token and prints the business name, token name,
account count and expiry date to stderr. It exits if the token is missing or rejected.

## Tools

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
- `account_id` (string, optional): UUID of the account
- `account_name` (string, optional): name or issuer domain to search for
  (case-insensitive partial match)

Provide either `account_id` or `account_name`. If more than one account matches
the name, the tool returns them in `multipleMatches` so you can retry with an
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
  "tokenName": "Claude Code",
  "businessName": "Acme Ltd",
  "scopedGroups": [
    { "id": "cfeba14a-e990-49e8-b6e5-61d63f7d68c8", "name": "Engineering" }
  ],
  "expiresAt": "2027-06-30T23:59:59Z",
  "accountCount": 12
}
```

## Links

- [Authn8](https://authn8.com): shared 2FA for teams
- [How to create an MCP token](https://authn8.com/knowledge-base/how-to-create-an-mcp-token)
- [GitHub repository](https://github.com/authn8/mcp-server)
- [MCP Registry entry](https://registry.modelcontextprotocol.io/v0/servers?search=io.github.authn8/mcp-server)
