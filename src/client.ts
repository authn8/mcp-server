import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const API_URL = process.env.AUTHN8_API_URL || "https://api.authn8.com";
const API_KEY = process.env.AUTHN8_API_KEY;
const USER_AGENT = `authn8-mcp/${version}`;

export const PACKAGE_VERSION = version;

export interface TokenInfo {
  businessName: string;
  tokenName: string;
  scopedGroups: Array<{ id: string; name: string }>;
  accountCount: number;
  expiresAt: string;
}

export interface Account {
  id: string;
  name: string;
  issuerDomain: string | null;
}

interface AccountsResponse {
  accounts: Account[];
}

export interface OtpResponse {
  name: string;
  code: string;
  length: number;
}

export class Authn8Error extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = "Authn8Error";
  }
}

let accountsCache: { accounts: Account[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 60 * 1000;

async function readApiError(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as {
      errors?: unknown;
      detail?: unknown;
      title?: unknown;
    };
    if (Array.isArray(body.errors)) {
      const messages = body.errors.filter(
        (error): error is string => typeof error === "string" && error.length > 0
      );
      if (messages.length > 0) {
        return messages.join(" ");
      }
    }
    if (typeof body.detail === "string" && body.detail.length > 0) {
      return body.detail;
    }
    if (typeof body.title === "string" && body.title.length > 0) {
      return body.title;
    }
    return null;
  } catch {
    return null;
  }
}

async function apiRequest<T>(
  endpoint: string,
  method: string = "GET"
): Promise<T> {
  if (!API_KEY) {
    throw new Authn8Error(
      "AUTHN8_API_KEY environment variable is not set. Set it to an MCP token from Settings > MCP Tokens in Authn8."
    );
  }

  const url = `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "User-Agent": USER_AGENT,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Authn8Error(
        "Token is invalid, expired or revoked. Check it under Settings > MCP Tokens in Authn8.",
        401
      );
    }
    if (response.status !== 429) {
      const apiMessage = await readApiError(response);
      if (apiMessage) {
        throw new Authn8Error(apiMessage, response.status);
      }
    }
    if (response.status === 403) {
      throw new Authn8Error(
        "Token does not have permission to access this resource.",
        403
      );
    }
    if (response.status === 404) {
      throw new Authn8Error("Resource not found.", 404);
    }
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      throw new Authn8Error(
        `Rate limited. ${retryAfter ? `Retry after ${retryAfter} seconds.` : "Please try again later."}`,
        429
      );
    }
    throw new Authn8Error(
      `API request failed with status ${response.status}`,
      response.status
    );
  }

  return response.json() as Promise<T>;
}

export async function getTokenInfo(): Promise<TokenInfo> {
  return apiRequest<TokenInfo>("/api/pat/me");
}

export async function listAccounts(forceRefresh = false): Promise<Account[]> {
  if (
    !forceRefresh &&
    accountsCache &&
    Date.now() - accountsCache.timestamp < CACHE_TTL_MS
  ) {
    return accountsCache.accounts;
  }

  const response = await apiRequest<AccountsResponse>("/api/pat/accounts");

  accountsCache = {
    accounts: response.accounts,
    timestamp: Date.now(),
  };

  return response.accounts;
}

function servedFromCache(): boolean {
  return (
    accountsCache !== null && Date.now() - accountsCache.timestamp < CACHE_TTL_MS
  );
}

export async function getOtp(accountId: string): Promise<OtpResponse> {
  return apiRequest<OtpResponse>(`/api/pat/otp/${accountId}`);
}

function matchAccounts(accounts: Account[], name: string): Account[] {
  const lowerName = name.toLowerCase();

  return accounts.filter(
    (acc) =>
      acc.name?.toLowerCase().includes(lowerName) ||
      acc.issuerDomain?.toLowerCase().includes(lowerName)
  );
}

export async function findAccountByName(name: string): Promise<Account[]> {
  const accounts = await listAccounts();
  const matches = matchAccounts(accounts, name);

  if (matches.length > 0 || !servedFromCache()) {
    return matches;
  }

  return matchAccounts(await listAccounts(true), name);
}

export async function validateToken(): Promise<TokenInfo> {
  try {
    return await getTokenInfo();
  } catch (error) {
    if (error instanceof Authn8Error) {
      throw error;
    }
    throw new Authn8Error(
      `Failed to connect to Authn8 API. Please check AUTHN8_API_URL (${API_URL}). Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
