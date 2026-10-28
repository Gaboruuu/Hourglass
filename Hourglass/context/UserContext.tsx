import React, { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  apiFetch,
  ApiError,
  AuthError,
  WAKE_UP_TIMEOUT_MS,
  clearSession,
  isExpired,
  loadSession,
  saveSession,
  setSessionEndedHandler,
} from "@/data/api";
import { logger } from "@/utils/logger";

interface User {
  id: string;
  username: string;
  /** Only ever set from the server's answer (login or /auth/me), never from storage */
  admin: boolean;
}

interface UserContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

interface LoginResponse {
  id: number;
  username: string;
  role: string;
  accessToken: string;
  expiresAt: number;
}

interface MeResponse {
  id: number;
  username: string;
  role: string;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Display info only ({ id, username }). The token is in SecureStore (see data/api.ts).
const USER_STORAGE_KEY = "@hourglass_user";

// setTimeout can't wait longer than ~24.8 days
const MAX_TIMER_MS = 2_147_483_647;

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const expiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Whether the server has answered for this session (login or /auth/me). While false,
  // admin stays hidden and the check is retried whenever the app comes back to the foreground.
  const roleVerified = useRef(false);
  const roleCheckInFlight = useRef(false);
  const userRef = useRef<User | null>(null);
  // Bumped on every login/logout, so a slow /auth/me answer can't revive a session that ended meanwhile
  const sessionGeneration = useRef(0);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const clearExpiryTimer = () => {
    if (expiryTimer.current) clearTimeout(expiryTimer.current);
    expiryTimer.current = null;
  };

  const logout = useCallback(async () => {
    clearExpiryTimer();
    sessionGeneration.current++;
    roleVerified.current = false;
    setUser(null);
    try {
      await Promise.all([clearSession(), AsyncStorage.removeItem(USER_STORAGE_KEY)]);
      logger.info("User", "Logged out");
    } catch (error) {
      logger.error("User", "Failed to clear the session", error);
    }
  }, []);

  // Log out exactly when the token expires, so admin screens don't stay open on a dead session
  const scheduleExpiry = useCallback(
    (expiresAt: number) => {
      clearExpiryTimer();
      const delay = expiresAt - Date.now();
      if (delay < MAX_TIMER_MS) {
        expiryTimer.current = setTimeout(logout, Math.max(delay, 0));
      }
    },
    [logout],
  );

  // Ask the server who we are. Offline or a timeout: stay signed in without admin, and retry
  // on the next return to the foreground (see the AppState effect below).
  const refreshRole = useCallback(async (fallback: User) => {
    if (roleCheckInFlight.current) return;
    roleCheckInFlight.current = true;
    const generation = sessionGeneration.current;
    try {
      const me = await apiFetch<MeResponse>("/auth/me", { timeoutMs: WAKE_UP_TIMEOUT_MS });
      if (generation !== sessionGeneration.current) return; // logged out/in meanwhile
      roleVerified.current = true;
      setUser({ id: String(me.id), username: me.username, admin: me.role === "admin" });
      logger.success("User", "Session verified");
    } catch (error) {
      if (error instanceof AuthError) return; // apiFetch already logged out
      if (generation !== sessionGeneration.current) return;
      // The server answered (e.g. 403 for a non-admin account): that's a final answer
      roleVerified.current = error instanceof ApiError;
      setUser({ ...fallback, admin: false });
      logger.warning(
        "User",
        roleVerified.current
          ? "Session is valid but has no admin access"
          : "Could not reach the server, admin features stay hidden until the next retry",
        error,
      );
    } finally {
      roleCheckInFlight.current = false;
    }
  }, []);

  // Retry the session check when the app returns to the foreground, until the server has answered
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      const current = userRef.current;
      if (state === "active" && current && !roleVerified.current) {
        refreshRole(current);
      }
    });
    return () => subscription.remove();
  }, [refreshRole]);

  useEffect(() => {
    setSessionEndedHandler(() => {
      logout();
    });

    const restore = async () => {
      try {
        const [session, storedUser] = await Promise.all([
          loadSession(),
          AsyncStorage.getItem(USER_STORAGE_KEY),
        ]);

        // Older app versions stored an "admin" flag without a token: those users log in again
        if (!session || !storedUser || isExpired(session)) {
          if (session || storedUser) await logout();
          return;
        }

        const { id, username } = JSON.parse(storedUser);
        const restored: User = { id: String(id), username, admin: false };
        setUser(restored);
        scheduleExpiry(session.expiresAt);
        // Not awaited: a slow (cold-starting) backend shouldn't hold up the splash screen
        refreshRole(restored);
      } catch (error) {
        logger.error("User", "Failed to restore the session", error);
      } finally {
        setIsLoading(false);
      }
    };

    restore();

    return () => {
      setSessionEndedHandler(null);
      clearExpiryTimer();
    };
  }, [logout, refreshRole, scheduleExpiry]);

  const login = useCallback(
    async (username: string, password: string) => {
      const data = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: { username, password },
        auth: false,
        timeoutMs: WAKE_UP_TIMEOUT_MS,
      });

      await saveSession({ token: data.accessToken, expiresAt: data.expiresAt });
      await AsyncStorage.setItem(
        USER_STORAGE_KEY,
        JSON.stringify({ id: String(data.id), username: data.username }),
      );

      const loggedIn: User = {
        id: String(data.id),
        username: data.username,
        admin: data.role === "admin",
      };
      sessionGeneration.current++;
      roleVerified.current = true; // the login response comes from the server
      setUser(loggedIn);
      scheduleExpiry(data.expiresAt);
      logger.success("User", "Logged in");
      return loggedIn;
    },
    [scheduleExpiry],
  );

  return (
    <UserContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
