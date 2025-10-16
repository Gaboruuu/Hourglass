import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { useUser } from "@/context/UserContext";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

interface DrawerItemProps {
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  focused?: boolean;
}

function CustomDrawerItem({
  label,
  iconName,
  onPress,
  focused = false,
}: DrawerItemProps) {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    drawerItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginVertical: 4,
      marginHorizontal: 8,
      borderRadius: 12,
      backgroundColor: focused ? colors.primary + "15" : "transparent",
    },
    drawerItemText: {
      marginLeft: 12,
      fontSize: 16,
      fontWeight: focused ? "600" : "400",
      color: focused ? colors.primary : colors.textPrimary,
    },
  });

  return (
    <TouchableOpacity style={styles.drawerItem} onPress={onPress}>
      <Ionicons
        name={iconName}
        size={24}
        color={focused ? colors.primary : colors.textSecondary}
      />
      <Text style={styles.drawerItemText}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function CustomDrawerContent(props: any) {
  const { user, logout } = useUser();
  const { colors, isDark } = useTheme();
  const { navigation, state } = props;
  const currentRouteName = state?.routeNames[state?.index] || "Home";

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    profileContainer: {
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.separator,
      marginBottom: 10,
    },
    profileImage: {
      width: 60,
      height: 60,
      borderRadius: 30,
      marginBottom: 10,
    },
    profileName: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.textPrimary,
    },
    profileHandle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    menuSection: {
      flex: 1,
      paddingTop: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textSecondary,
      marginLeft: 24,
      marginBottom: 8,
      marginTop: 16,
    },
    footerContainer: {
      padding: 16,
    },
    logoutButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: 20,
      backgroundColor: colors.error,
      borderRadius: 12,
      marginTop: 8,
    },
    logoutText: {
      color: colors.onError,
      fontWeight: "600",
      marginLeft: 8,
      fontSize: 16,
    },
  });

  return (
    <View style={styles.container}>
      <DrawerContentScrollView {...props} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileContainer}>
          <Image
            source={{ uri: "https://i.imgur.com/Zc3ndL7.jpeg" }}
            style={styles.profileImage}
          />
          <Text style={styles.profileName}>{user?.username || "Guest"}</Text>
          <Text style={styles.profileHandle}>
            {"@" + (user?.username || "guest")}
          </Text>
        </View>

        {/* Navigation Section */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Navigation</Text>

          <CustomDrawerItem
            label="Home"
            iconName="home-outline"
            focused={currentRouteName === "Home"}
            onPress={() => navigation.navigate("Home")}
          />

          <CustomDrawerItem
            label="Events"
            iconName="time-outline"
            focused={currentRouteName === "Events"}
            onPress={() => navigation.navigate("Events")}
          />

          <CustomDrawerItem
            label="Permanent Events"
            iconName="calendar-outline"
            focused={currentRouteName === "Permanent-events"}
            onPress={() => navigation.navigate("Permanent-events")}
          />

          <CustomDrawerItem
            label="Settings"
            iconName="settings-outline"
            focused={currentRouteName === "Settings"}
            onPress={() => navigation.navigate("Settings")}
          />

          {/* Admin Section */}
          {user?.admin && (
            <>
              <Text style={styles.sectionTitle}>Administration</Text>
              <CustomDrawerItem
                label="Admin Panel"
                iconName="shield-outline"
                focused={currentRouteName === "Admin"}
                onPress={() => navigation.navigate("Admin")}
              />
            </>
          )}

          {/* Authentication Section */}
          {!user && (
            <>
              <Text style={styles.sectionTitle}>Account</Text>
              <CustomDrawerItem
                label="Login"
                iconName="log-in-outline"
                focused={currentRouteName === "Login"}
                onPress={() => navigation.navigate("Login")}
              />
            </>
          )}
        </View>
      </DrawerContentScrollView>

      {/* Footer with Logout */}
      {user && (
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => {
              logout();
            }}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.onError} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
