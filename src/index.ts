import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { validateToken, type TokenInfo } from "./client.js";
import {
  toolDefinitions,
  handleListAccounts,
  handleGetOtp,
  handleWhoami,
} from "./tools.js";

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function displayStartupInfo(info: TokenInfo): void {
  console.error("Authn8 MCP Server");
  console.error(`Business: ${info.businessName}`);
  console.error(`Token: ${info.tokenName}`);
  console.error(`Accounts: ${info.accountCount}`);
  console.error(`Expires: ${formatDate(info.expiresAt)}`);
  console.error("");
}

async function main(): Promise<void> {
  // Validate token on startup
  let tokenInfo: TokenInfo;
  try {
    tokenInfo = await validateToken();
  } catch (error) {
    console.error(
      "Error:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }

  displayStartupInfo(tokenInfo);

  // Create MCP server
  const server = new McpServer({
    name: "authn8-mcp",
    version: "1.0.0",
  });

  // Register tools
  server.registerTool(
    "list_accounts",
    {
      description: toolDefinitions.list_accounts.description,
      inputSchema: toolDefinitions.list_accounts.inputSchema,
    },
    async () => {
      try {
        return await handleListAccounts();
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.registerTool(
    "get_otp",
    {
      description: toolDefinitions.get_otp.description,
      inputSchema: toolDefinitions.get_otp.inputSchema,
    },
    async (args) => {
      try {
        return await handleGetOtp(args as { account_id?: string; account_name?: string });
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.registerTool(
    "whoami",
    {
      description: toolDefinitions.whoami.description,
      inputSchema: toolDefinitions.whoami.inputSchema,
    },
    async () => {
      try {
        return await handleWhoami();
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
