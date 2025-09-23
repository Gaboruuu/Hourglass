import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Button,
} from "react-native";
import {
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import { useUser } from "@/context/UserContext";
import { useTheme } from "@/context/ThemeContext";

export default function CustomDrawerContent(props: any) {
  const { user, logout } = useUser();
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    profileContainer: {
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.separator,
      marginBottom: 10,
      //backgroundColor: colors.background,
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
    logoutButton: {
      marginTop: 20,
      padding: 10,
      backgroundColor: colors.secondary,
      borderRadius: 5,
      alignItems: "center",
    },
    logoutText: {
      color: colors.onSecondary,
      fontWeight: "bold",
    },
    drawerItemList: {
      backgroundColor: colors.background,
      color: colors.textPrimary,
    },
  });

  return (
    <DrawerContentScrollView
      {...props}
      style={{ backgroundColor: colors.background }}
    >
      <View style={styles.profileContainer}>
        <Image
          source={{ uri: "https://i.imgur.com/Zc3ndL7.jpeg" }} // Replace with your image URL
          style={styles.profileImage}
        />
        <Text style={styles.profileName}>{user?.username}</Text>
        <Text style={styles.profileHandle}>{"@" + user?.username}</Text>
      </View>
      <DrawerItemList {...props} style={styles.drawerItemList} />
      {user && (
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            logout();
          }}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      )}
    </DrawerContentScrollView>
  );
}
