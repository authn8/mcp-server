import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { validateToken, PACKAGE_VERSION, type TokenInfo } from "./client.js";
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
  console.error(`Authn8 MCP Server v${PACKAGE_VERSION}`);
  console.error(`Business: ${info.businessName}`);
  console.error(`Token: ${info.tokenName}`);
  console.error(`Accounts: ${info.accountCount}`);
  console.error(`Expires: ${formatDate(info.expiresAt)}`);
  console.error("");
}

function toErrorResult(error: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: `Error: ${error instanceof Error ? error.message : String(error)}`,
      },
    ],
    isError: true,
  };
}

async function main(): Promise<void> {
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

  const server = new McpServer({
    name: "authn8-mcp",
    version: PACKAGE_VERSION,
  });

  server.registerTool(
    "list_accounts",
    {
      description: toolDefinitions.list_accounts.description,
      inputSchema: toolDefinitions.list_accounts.inputSchema,
      outputSchema: toolDefinitions.list_accounts.outputSchema,
    },
    async () => {
      try {
        return await handleListAccounts();
      } catch (error) {
        return toErrorResult(error);
      }
    }
  );

  server.registerTool(
    "get_otp",
    {
      description: toolDefinitions.get_otp.description,
      inputSchema: toolDefinitions.get_otp.inputSchema,
      outputSchema: toolDefinitions.get_otp.outputSchema,
    },
    async (args) => {
      try {
        return await handleGetOtp(
          args as { account_id?: string; account_name?: string }
        );
      } catch (error) {
        return toErrorResult(error);
      }
    }
  );

  server.registerTool(
    "whoami",
    {
      description: toolDefinitions.whoami.description,
      inputSchema: toolDefinitions.whoami.inputSchema,
      outputSchema: toolDefinitions.whoami.outputSchema,
    },
    async () => {
      try {
        return await handleWhoami();
      } catch (error) {
        return toErrorResult(error);
      }
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
