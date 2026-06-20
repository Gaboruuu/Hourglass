import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface NotificationRecord {
  id: string;
  gameName: string;
  gameId: string;
  eventName: string;
  eventType: "main" | "side" | "permanent";
  notificationType: "3days" | "1day" | "2hours";
  timestamp: number; // milliseconds
  title: string;
  body: string;
  status: "triggered" | "scheduled"; // Support scheduled status
}

interface NotificationHistoryContextType {
  notifications: NotificationRecord[];
  addNotification: (notification: NotificationRecord | Omit<NotificationRecord, "id">) => void;
  removeNotification: (id: string) => void;
  clearHistory: () => void;
  clearScheduledNotifications: () => void;
  isLoading: boolean;
}

const NotificationHistoryContext = createContext<
  NotificationHistoryContextType | undefined
>(undefined);

const STORAGE_KEY = "notification_history";

export const NotificationHistoryProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load notifications from AsyncStorage on mount
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          let parsed: NotificationRecord[] = JSON.parse(stored);
          const now = Date.now();
          let changed = false;

          // Process any scheduled notifications that have passed
          parsed = parsed.map((n) => {
            if (n.status === "scheduled" && n.timestamp <= now) {
              changed = true;
              return { ...n, status: "triggered" };
            }
            return n;
          });

          setNotifications(parsed);

          if (changed) {
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsed)).catch(console.error);
          }
        }
      } catch (error) {
        console.error("Failed to load notifications from storage:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();

    // Listen for app state changes to update scheduled notifications
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        setNotifications((prev) => {
          const now = Date.now();
          let changed = false;
          const updated = prev.map((n) => {
            if (n.status === "scheduled" && n.timestamp <= now) {
              changed = true;
              return { ...n, status: "triggered" };
            }
            return n;
          });

          if (changed) {
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(console.error);
            return updated;
          }
          return prev;
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const addNotification = useCallback(
    (notification: NotificationRecord | Omit<NotificationRecord, "id">) => {
      // Ensure unique ID for history
      const baseId = "id" in notification ? notification.id : `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // We append timestamp to make it unique per occurrence, so we can keep history!
      let uniqueId = baseId;
      if (notification.status === "scheduled" && !baseId.includes(notification.timestamp.toString())) {
        uniqueId = `${baseId}-${notification.timestamp}`;
      }

      const newNotification = { ...notification, id: uniqueId } as NotificationRecord;

      setNotifications((prevNotifications) => {
        // Remove exact uniqueId matches
        const filtered = prevNotifications.filter(n => n.id !== uniqueId);
        
        // Also remove any OTHER scheduled notification with the same baseId!
        // Because if we reschedule, the old scheduled one should be replaced.
        const finalFiltered = filtered.filter(n => {
           if (n.status === "scheduled" && (n.id === baseId || n.id.startsWith(baseId + "-"))) {
             return false;
           }
           return true;
        });

        const updated = [newNotification, ...finalFiltered].slice(0, 100); // Keep last 100
        
        // Persist to AsyncStorage asynchronously
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch((error) => {
          console.error("Failed to save notifications to storage:", error);
        });

        return updated;
      });
    },
    [],
  );

  const removeNotification = useCallback((identifierToRemove: string) => {
    setNotifications((prevNotifications) => {
      // Only remove if it's SCHEDULED. We don't remove triggered ones!
      const updated = prevNotifications.filter((n) => {
        // If it's triggered, keep it (it's history now)
        if (n.status === "triggered") return true;
        
        // If it's scheduled, check if it matches the identifier
        const isMatch = n.id === identifierToRemove || n.id.startsWith(identifierToRemove + "-");
        return !isMatch; // keep if it doesn't match
      });
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(console.error);
      return updated;
    });
  }, []);

  const clearHistory = useCallback(async () => {
    setNotifications((prev) => {
      // Keep only scheduled ones when clearing history
      const scheduledOnly = prev.filter(n => n.status === "scheduled");
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(scheduledOnly)).catch(console.error);
      return scheduledOnly;
    });
  }, []);

  const clearScheduledNotifications = useCallback(async () => {
    setNotifications((prev) => {
      // Keep only triggered ones
      const triggeredOnly = prev.filter(n => n.status === "triggered");
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(triggeredOnly)).catch(console.error);
      return triggeredOnly;
    });
  }, []);

  return (
    <NotificationHistoryContext.Provider
      value={{ notifications, addNotification, removeNotification, clearHistory, clearScheduledNotifications, isLoading }}
    >
      {children}
    </NotificationHistoryContext.Provider>
  );
};

export const useNotificationHistory = () => {
  const context = useContext(NotificationHistoryContext);
  if (!context) {
    throw new Error(
      "useNotificationHistory must be used within NotificationHistoryProvider",
    );
  }
  return context;
};
