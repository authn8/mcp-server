import { z } from "zod";
import {
  getTokenInfo,
  listAccounts,
  getOtp,
  findAccountByName,
} from "./client.js";

const accountShape = z.object({
  id: z.uuid(),
  name: z.string(),
  issuerDomain: z.string().nullable(),
});

const listAccountsOutput = z.object({
  error: z.string().optional(),
  accounts: z.array(accountShape).optional(),
});

const getOtpOutput = z.object({
  error: z.string().optional(),
  name: z.string().optional(),
  code: z.string().optional(),
  length: z.number().int(),
  multipleMatches: z.array(accountShape).optional(),
});

const whoamiOutput = z.object({
  error: z.string().optional(),
  tokenName: z.string().optional(),
  businessName: z.string().optional(),
  scopedGroups: z
    .array(z.object({ id: z.uuid(), name: z.string() }))
    .optional(),
  expiresAt: z.string().optional(),
  accountCount: z.number().int(),
});

export const toolDefinitions = {
  list_accounts: {
    description:
      "Returns all 2FA accounts accessible to this token. Use this to see what accounts are available before requesting an OTP code. Each account includes: id (UUID for get_otp), name, and issuerDomain. Returns an empty list if no accounts are accessible.",
    inputSchema: z.object({}),
    outputSchema: listAccountsOutput,
  },
  get_otp: {
    description:
      "Generates a TOTP code for a specific account. REQUIRED: Provide either account_id OR account_name (at least one must be specified). Errors: Returns 'No account found' if the name doesn't match any account. Returns 'Multiple accounts match' with a list of matches in the 'multipleMatches' field if the name is ambiguous - use the returned account_id to retry.",
    inputSchema: z.object({
      account_id: z
        .uuid()
        .optional()
        .describe(
          "UUID of the account. Use this for exact matching, especially after resolving ambiguous name matches."
        ),
      account_name: z
        .string()
        .optional()
        .describe(
          "Name or issuer domain to search for (case-insensitive partial match). If multiple accounts match, returns a list to choose from."
        ),
    }),
    outputSchema: getOtpOutput,
  },
  whoami: {
    description:
      "Returns information about the current token and what it has access to, including the business name, token name, scoped groups, account count, and expiration date.",
    inputSchema: z.object({}),
    outputSchema: whoamiOutput,
  },
};

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: Record<string, unknown>;
};

function result(payload: Record<string, unknown>): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}

export async function handleListAccounts(): Promise<ToolResult> {
  const accounts = await listAccounts();

  return result({
    accounts: accounts.map((acc) => ({
      id: acc.id,
      name: acc.name,
      issuerDomain: acc.issuerDomain ?? null,
    })),
  });
}

export async function handleGetOtp(args: {
  account_id?: string;
  account_name?: string;
}): Promise<ToolResult> {
  const { account_id, account_name } = args;

  if (!account_id && !account_name) {
    return result({
      error: "Either account_id or account_name must be provided",
      length: 0,
    });
  }

  let targetAccountId: string;

  if (account_id) {
    targetAccountId = account_id;
  } else {
    const matches = await findAccountByName(account_name!);

    if (matches.length === 0) {
      return result({
        error: `No account found matching '${account_name}'. Use list_accounts to see available accounts.`,
        length: 0,
      });
    }

    if (matches.length > 1) {
      return result({
        error: `Multiple accounts match '${account_name}'. Please be more specific or use account_id.`,
        length: 0,
        multipleMatches: matches.map((a) => ({
          id: a.id,
          name: a.name,
          issuerDomain: a.issuerDomain ?? null,
        })),
      });
    }

    targetAccountId = matches[0].id;
  }

  const otp = await getOtp(targetAccountId);

  return result({
    name: otp.name,
    code: otp.code,
    length: otp.length,
  });
}

export async function handleWhoami(): Promise<ToolResult> {
  const info = await getTokenInfo();

  return result({
    tokenName: info.tokenName,
    businessName: info.businessName,
    scopedGroups: (info.scopedGroups ?? []).map((g) => ({
      id: g.id,
      name: g.name,
    })),
    expiresAt: info.expiresAt,
    accountCount: info.accountCount,
  });
}
