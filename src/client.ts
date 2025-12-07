const API_URL = process.env.AUTHN8_API_URL || "https://api.authn8.com";
const API_KEY = process.env.AUTHN8_API_KEY;
const USER_AGENT = "authn8-mcp/1.0.0";

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
  issuerDomain: string;
}

interface AccountsResponse {
  accounts: Account[];
}

export interface OtpResponse {
  name: string;
  code: string;
  length: number;
}

class Authn8Error extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = "Authn8Error";
  }
}

let accountsCache: { accounts: Account[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

async function apiRequest<T>(
  endpoint: string,
  method: string = "GET"
): Promise<T> {
  if (!API_KEY) {
    throw new Authn8Error(
      "AUTHN8_API_KEY environment variable is not set. Please set it to your PAT token from the Authn8 dashboard."
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
        "Token is invalid or expired. Please check your token in the Authn8 dashboard.",
        401
      );
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

export async function listAccounts(): Promise<Account[]> {
  // Check cache
  if (accountsCache && Date.now() - accountsCache.timestamp < CACHE_TTL_MS) {
    return accountsCache.accounts;
  }

  const response = await apiRequest<AccountsResponse>("/api/pat/accounts");

  // Update cache
  accountsCache = {
    accounts: response.accounts,
    timestamp: Date.now(),
  };

  return response.accounts;
}

export async function getOtp(accountId: string): Promise<OtpResponse> {
  return apiRequest<OtpResponse>(`/api/pat/otp/${accountId}`);
}

export async function findAccountByName(
  name: string
): Promise<{ account: Account } | { matches: Account[] }> {
  const accounts = await listAccounts();
  const lowerName = name.toLowerCase();

  const matches = accounts.filter(
    (acc) =>
      acc.name.toLowerCase().includes(lowerName) ||
      acc.issuerDomain.toLowerCase().includes(lowerName)
  );

  if (matches.length === 0) {
    throw new Authn8Error(
      `No account found matching "${name}". Available accounts:\n${accounts.map((a) => `  - ${a.name} (${a.issuerDomain})`).join("\n")}`
    );
  }

  if (matches.length === 1) {
    return { account: matches[0] };
  }

  return { matches };
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
