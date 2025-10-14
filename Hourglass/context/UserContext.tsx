import React, { createContext, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface User {
  id: string;
  username: string;
  admin: boolean;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_STORAGE_KEY = "@hourglass_user";

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Load user from AsyncStorage on app start
  useEffect(() => {
    loadUserFromStorage();
  }, []);

  const loadUserFromStorage = async () => {
    try {
      const storedUser = await AsyncStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        console.log("User loaded from storage:", userData.username);
      }
    } catch (error) {
      console.error("Error loading user from storage:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUserToStorage = async (userData: User) => {
    try {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      console.log("User saved to storage:", userData.username);
    } catch (error) {
      console.error("Error saving user to storage:", error);
    }
  };

  const clearUserFromStorage = async () => {
    try {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      console.log("User removed from storage");
    } catch (error) {
      console.error("Error removing user from storage:", error);
    }
  };

  const setUserWithPersistence = (userData: User | null) => {
    setUser(userData);
    if (userData) {
      saveUserToStorage(userData);
    } else {
      clearUserFromStorage();
    }
  };

  const logout = async () => {
    setUser(null);
    await clearUserFromStorage();
  };

  return (
    <UserContext.Provider
      value={{ user, setUser: setUserWithPersistence, logout, isLoading }}
    >
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
