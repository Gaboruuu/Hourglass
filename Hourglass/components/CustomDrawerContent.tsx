import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, Button } from "react-native";
import { DrawerContentScrollView, DrawerItemList } from "@react-navigation/drawer";
import { useUser } from "@/context/UserContext";
import { useTheme } from "@/context/ThemeContext";
import SettingsScreen from "@/app/settings";

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
    color: colors.text,
  },
  profileHandle: {
    fontSize: 14,
    color: colors.text,
  },
  logoutButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#f00",
    borderRadius: 5,
    alignItems: "center",
  },
  logoutText: {
    color: "#fff",
    fontWeight: "bold",
  },
  drawerItemList: {
    backgroundColor: colors.background,
    color: colors.text,
  }
});

  return (
    <DrawerContentScrollView {...props} style={{backgroundColor: colors.background}}>
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
      <TouchableOpacity style={styles.logoutButton} onPress={ () => {
        logout();
      }}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
      )}
    </DrawerContentScrollView>
  );
}

