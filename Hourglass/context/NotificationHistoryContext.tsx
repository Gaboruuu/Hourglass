import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
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
  status: "scheduled" | "triggered"; // Whether it was programmed or actually sent
}

interface NotificationHistoryContextType {
  notifications: NotificationRecord[];
  addNotification: (notification: Omit<NotificationRecord, "id">) => void;
  clearHistory: () => void;
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
          const parsed = JSON.parse(stored);
          setNotifications(parsed);
        }
      } catch (error) {
        console.error("Failed to load notifications from storage:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();
  }, []);

  const addNotification = useCallback(
    async (notification: Omit<NotificationRecord, "id">) => {
      const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newNotification = { ...notification, id };

      const updated = [newNotification, ...notifications].slice(0, 100); // Keep last 100
      setNotifications(updated);

      // Persist to AsyncStorage
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Failed to save notifications to storage:", error);
      }
    },
    [notifications],
  );

  const clearHistory = useCallback(async () => {
    setNotifications([]);
    // Remove from AsyncStorage
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear notifications from storage:", error);
    }
  }, []);

  return (
    <NotificationHistoryContext.Provider
      value={{ notifications, addNotification, clearHistory, isLoading }}
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
