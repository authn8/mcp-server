import { z } from "zod";
import {
  getTokenInfo,
  listAccounts,
  getOtp,
  findAccountByName,
  type TokenInfo,
  type Account,
  type OtpResponse,
} from "./client.js";

export const toolDefinitions = {
  list_accounts: {
    description:
      "Returns all 2FA accounts accessible to this token. Use this to see what accounts are available before requesting an OTP code.",
    inputSchema: z.object({}),
  },
  get_otp: {
    description:
      "Generates a TOTP code for a specific account. You can provide either the account_id (UUID) or account_name (partial match supported). If multiple accounts match the name, you'll get a list of matches to be more specific.",
    inputSchema: z.object({
      account_id: z
        .uuid()
        .optional()
        .describe("UUID of the account"),
      account_name: z
        .string()
        .optional()
        .describe("Name to search for (partial match)"),
    }),
  },
  whoami: {
    description:
      "Returns information about the current token and what it has access to, including the business name, token name, scoped groups, account count, and expiration date.",
    inputSchema: z.object({}),
  },
};

export async function handleListAccounts(): Promise<{
  content: Array<{ type: "text"; text: string }>;
}> {
  const accounts = await listAccounts();

  if (accounts.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: "No accounts are accessible with this token.",
        },
      ],
    };
  }

  const formatted = accounts.map((acc) => ({
    id: acc.id,
    name: acc.name,
    issuer: acc.issuerDomain,
  }));

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(formatted, null, 2),
      },
    ],
  };
}

export async function handleGetOtp(args: {
  account_id?: string;
  account_name?: string;
}): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const { account_id, account_name } = args;

  if (!account_id && !account_name) {
    return {
      content: [
        {
          type: "text",
          text: "Error: Either account_id or account_name must be provided.",
        },
      ],
    };
  }

  let targetAccountId: string;
  let accountName: string;

  if (account_id) {
    targetAccountId = account_id;
    // Get the account name for the response
    const accounts = await listAccounts();
    const account = accounts.find((a) => a.id === account_id);
    if (!account) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Account with ID "${account_id}" not found. Use list_accounts to see available accounts.`,
          },
        ],
      };
    }
    accountName = account.name;
  } else {
    // Search by name
    const result = await findAccountByName(account_name!);

    if ("matches" in result) {
      return {
        content: [
          {
            type: "text",
            text: `Multiple accounts match "${account_name}". Please be more specific:\n${result.matches.map((a) => `  - ${a.name} (${a.issuerDomain}) - ID: ${a.id}`).join("\n")}`,
          },
        ],
      };
    }

    targetAccountId = result.account.id;
    accountName = result.account.name;
  }

  const otp = await getOtp(targetAccountId);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            account: accountName,
            code: otp.code,
          },
          null,
          2
        ),
      },
    ],
  };
}

export async function handleWhoami(): Promise<{
  content: Array<{ type: "text"; text: string }>;
}> {
  const info = await getTokenInfo();

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            business: info.businessName,
            token_name: info.tokenName,
            scoped_groups: info.scopedGroups.map((g) => g.name),
            account_count: info.accountCount,
            expires_at: info.expiresAt,
          },
          null,
          2
        ),
      },
    ],
  };
}
