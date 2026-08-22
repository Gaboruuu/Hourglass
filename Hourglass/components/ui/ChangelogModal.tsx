import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import {
  CHANGELOG,
  ChangelogEntry,
  ChangeEntry,
  getVersionLabel,
} from "@/data/changelog";

interface ChangelogModalProps {
  visible: boolean;
  onClose: () => void;
}

const CATEGORY_CONFIG: Record<
  string,
  { icon: string; label: string; color: string }
> = {
  feature: { icon: "sparkles", label: "New", color: "#8b5cf6" },
  fix: { icon: "bug", label: "Fix", color: "#ef4444" },
  improvement: { icon: "flash", label: "Improved", color: "#3b82f6" },
  breaking: { icon: "warning", label: "Breaking", color: "#f59e0b" },
};

const TYPE_COLORS: Record<string, string> = {
  major: "#8b5cf6",
  minor: "#3b82f6",
  patch: "#22c55e",
};

export default function ChangelogModal({
  visible,
  onClose,
}: ChangelogModalProps) {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    container: {
      backgroundColor: colors.background,
      borderRadius: 16,
      padding: 20,
      width: "92%",
      maxHeight: "85%",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
    },
    title: {
      fontSize: 22,
      fontWeight: "bold",
      color: colors.textPrimary,
    },
    closeButton: {
      padding: 4,
    },
    currentVersion: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 16,
    },
    scrollContent: {
      paddingBottom: 8,
    },
    versionBlock: {
      marginBottom: 20,
    },
    versionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    versionBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      marginRight: 10,
    },
    versionBadgeText: {
      fontSize: 13,
      fontWeight: "bold",
      color: "#ffffff",
    },
    versionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary,
      flex: 1,
    },
    versionDate: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: 10,
    },
    changeItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: 6,
      paddingHorizontal: 8,
      marginBottom: 4,
      backgroundColor: colors.surface,
      borderRadius: 8,
    },
    categoryBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      marginRight: 10,
      minWidth: 80,
    },
    categoryLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: "#ffffff",
      marginLeft: 4,
    },
    changeDescription: {
      fontSize: 14,
      color: colors.textPrimary,
      flex: 1,
      lineHeight: 20,
      paddingTop: 2,
    },
    divider: {
      height: 1,
      backgroundColor: colors.separator + "30",
      marginVertical: 8,
    },
  });

  const renderChangeItem = (change: ChangeEntry, index: number) => {
    const config = CATEGORY_CONFIG[change.category] || CATEGORY_CONFIG.feature;
    return (
      <View key={index} style={styles.changeItem}>
        <View style={[styles.categoryBadge, { backgroundColor: config.color }]}>
          <Ionicons
            name={config.icon as any}
            size={12}
            color="#ffffff"
          />
          <Text style={styles.categoryLabel}>{config.label}</Text>
        </View>
        <Text style={styles.changeDescription}>{change.description}</Text>
      </View>
    );
  };

  const renderVersionBlock = (entry: ChangelogEntry, index: number) => {
    const typeColor = TYPE_COLORS[entry.type] || TYPE_COLORS.minor;
    return (
      <View key={entry.version} style={styles.versionBlock}>
        {index > 0 && <View style={styles.divider} />}
        <View style={styles.versionHeader}>
          <View style={[styles.versionBadge, { backgroundColor: typeColor }]}>
            <Text style={styles.versionBadgeText}>v{entry.version}</Text>
          </View>
          <Text style={styles.versionTitle}>{entry.title}</Text>
        </View>
        <Text style={styles.versionDate}>{entry.date}</Text>
        {entry.changes.map((change, i) => renderChangeItem(change, i))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>What's New</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons
                name="close-circle"
                size={28}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.currentVersion}>
            Current version: {getVersionLabel()}
          </Text>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {CHANGELOG.map((entry, index) =>
              renderVersionBlock(entry, index),
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
