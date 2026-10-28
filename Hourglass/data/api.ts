import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { logger } from "@/utils/logger";

/** The single place for the backend URL used by login and the admin screens */
export const API_URL = "https://hourglass-h6zo.onrender.com/api";

const SESSION_KEY = "hourglass_token";
const DEFAULT_TIMEOUT_MS = 15000;
/**
 * For login and the startup session check: they're often the first request after the backend
 * has been idle, and a sleeping Render service can take 30-60s to wake up.
 */
export const WAKE_UP_TIMEOUT_MS = 60000;

export interface Session {
  token: string;
  /** Epoch milliseconds when the token stops working */
  expiresAt: number;
}

/** The session ended (expired or rejected by the server): the user has to log in again */
export class AuthError extends Error {
  constructor(message = "Your session has expired. Please log in again.") {
    super(message);
    this.name = "AuthError";
  }
}

/** The server answered with an error. `message` is safe to show to the user. */
export class ApiError extends Error {
  status: number;
  errors?: { field: string; message: string }[];

  constructor(status: number, message: string, errors?: { field: string; message: string }[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

// ---- Session storage ----
// The token lives in the OS keychain/keystore. SecureStore doesn't exist on web, so there it's
// kept in memory only (never in localStorage) and the session ends when the page reloads.

let webSession: Session | null = null;

export async function loadSession(): Promise<Session | null> {
  try {
    const raw = Platform.OS === "web" ? null : await SecureStore.getItemAsync(SESSION_KEY);
    const session: Session | null = Platform.OS === "web" ? webSession : raw ? JSON.parse(raw) : null;
    if (!session || typeof session.token !== "string" || typeof session.expiresAt !== "number") {
      return null;
    }
    return session;
  } catch (error) {
    logger.error("Api", "Failed to read the stored session", error);
    return null;
  }
}

export async function saveSession(session: Session): Promise<void> {
  if (Platform.OS === "web") {
    webSession = session;
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  webSession = null;
  if (Platform.OS !== "web") {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }
}

export const isExpired = (session: Session) => Date.now() >= session.expiresAt;

// UserContext registers its logout here, so any request that finds the session dead logs the user out
let onSessionEnded: (() => void) | null = null;
export function setSessionEndedHandler(handler: (() => void) | null) {
  onSessionEnded = handler;
}

async function endSession() {
  await clearSession();
  onSessionEnded?.();
}

// ---- Requests ----

interface ApiFetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  /** Send the stored token (default true). Login sets this to false. */
  auth?: boolean;
  timeoutMs?: number;
}

/**
 * Calls the backend: adds the Bearer token, a timeout and JSON handling.
 * Throws AuthError when the session is missing/expired/rejected (and logs out),
 * ApiError for other error responses, and a plain Error for network problems.
 */
export async function apiFetch<T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let sentToken = false;
  if (auth) {
    const session = await loadSession();
    if (session && isExpired(session)) {
      await endSession();
      throw new AuthError();
    }
    if (session) {
      headers.Authorization = `Bearer ${session.token}`;
      sentToken = true;
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error: any) {
    throw new Error(
      error?.name === "AbortError"
        ? "The server took too long to respond. It may be waking up, try again in a minute."
        : "Network error. Check your connection and try again.",
    );
  } finally {
    clearTimeout(timeout);
  }

  const data = await response.json().catch(() => null);

  if (response.status === 401 && sentToken) {
    await endSession();
    throw new AuthError();
  }
  if (!response.ok) {
    const message = typeof data?.message === "string" ? data.message : `Request failed (${response.status})`;
    throw new ApiError(response.status, message, Array.isArray(data?.errors) ? data.errors : undefined);
  }
  return data as T;
}

/** A user-facing message for any error thrown by apiFetch */
export function describeApiError(error: unknown): string {
  if (error instanceof ApiError && error.errors?.length) {
    return error.errors.map((e) => `${e.field}: ${e.message}`).join("\n");
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}
