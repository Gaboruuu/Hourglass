import React from "react";
import { AppState } from "react-native";
import TestRenderer, { act } from "react-test-renderer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch, ApiError, loadSession } from "@/data/api";
import { UserProvider, useUser } from "./UserContext";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("@/data/api", () => {
  class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  class AuthError extends Error {}
  return {
    ApiError,
    AuthError,
    WAKE_UP_TIMEOUT_MS: 60000,
    apiFetch: jest.fn(),
    loadSession: jest.fn(),
    saveSession: jest.fn(),
    clearSession: jest.fn(),
    isExpired: (session: { expiresAt: number }) => Date.now() >= session.expiresAt,
    setSessionEndedHandler: jest.fn(),
  };
});

const mockedFetch = apiFetch as jest.Mock;
const mockedLoadSession = loadSession as jest.Mock;

let ctx: ReturnType<typeof useUser>;
function Probe() {
  ctx = useUser();
  return null;
}

const renderers: TestRenderer.ReactTestRenderer[] = [];

let appStateListener: ((state: string) => void) | undefined;
const flush = () => act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
});

async function renderWithStoredSession() {
  mockedLoadSession.mockResolvedValue({ token: "t", expiresAt: Date.now() + 3600_000 });
  await AsyncStorage.setItem("@hourglass_user", JSON.stringify({ id: "1", username: "gabitest" }));
  await act(async () => {
    renderers.push(TestRenderer.create(
      <UserProvider>
        <Probe />
      </UserProvider>,
    ));
  });
  await flush();
}

const meCalls = () => mockedFetch.mock.calls.filter(([path]) => path === "/auth/me");

afterEach(() => {
  // Unmounting clears the provider's session-expiry timer, so Jest can exit
  act(() => renderers.splice(0).forEach((r) => r.unmount()));
});

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  appStateListener = undefined;
  jest.spyOn(AppState, "addEventListener").mockImplementation((_event, listener: any) => {
    appStateListener = listener;
    return { remove: jest.fn() } as any;
  });
});

test("a timed-out session check keeps admin hidden, then retries when the app comes back", async () => {
  mockedFetch.mockRejectedValueOnce(new Error("The server took too long to respond"));
  await renderWithStoredSession();

  expect(ctx.user).toEqual({ id: "1", username: "gabitest", admin: false });
  expect(meCalls()[0][1]).toEqual({ timeoutMs: 60000 });

  mockedFetch.mockResolvedValueOnce({ id: 1, username: "gabitest", role: "admin" });
  await act(async () => appStateListener?.("active"));
  await flush();

  expect(meCalls()).toHaveLength(2);
  expect(ctx.user?.admin).toBe(true);
});

test("a server answer (403, not an admin) is final: no more retries", async () => {
  mockedFetch.mockRejectedValueOnce(new ApiError(403, "Forbidden"));
  await renderWithStoredSession();

  expect(ctx.user?.admin).toBe(false);
  await act(async () => appStateListener?.("active"));
  await flush();
  expect(meCalls()).toHaveLength(1);
});

test("a verified session doesn't call /auth/me again on every foreground", async () => {
  mockedFetch.mockResolvedValueOnce({ id: 1, username: "gabitest", role: "admin" });
  await renderWithStoredSession();

  await act(async () => appStateListener?.("active"));
  await flush();
  expect(meCalls()).toHaveLength(1);
  expect(ctx.user?.admin).toBe(true);
});

test("login uses the long timeout and counts as verified", async () => {
  mockedLoadSession.mockResolvedValue(null);
  await act(async () => {
    renderers.push(TestRenderer.create(
      <UserProvider>
        <Probe />
      </UserProvider>,
    ));
  });
  expect(ctx.user).toBeNull();

  mockedFetch.mockResolvedValueOnce({
    id: 1, username: "gabitest", role: "admin", accessToken: "t", expiresAt: Date.now() + 3600_000,
  });
  await act(async () => {
    await ctx.login("gabitest", "secret-password");
  });

  expect(mockedFetch).toHaveBeenCalledWith("/auth/login", expect.objectContaining({ auth: false, timeoutMs: 60000 }));
  expect(ctx.user?.admin).toBe(true);
  await act(async () => appStateListener?.("active"));
  await flush();
  expect(meCalls()).toHaveLength(0);
});

test("logging out while the check is still running doesn't bring the session back", async () => {
  let answer: (value: unknown) => void = () => {};
  mockedFetch.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)));
  await renderWithStoredSession();

  await act(async () => {
    await ctx.logout();
  });
  await act(async () => answer({ id: 1, username: "gabitest", role: "admin" }));
  await flush();

  expect(ctx.user).toBeNull();
});
