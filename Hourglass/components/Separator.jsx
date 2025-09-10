import { View, Text } from "react-native";
import { useTheme } from "@/context/ThemeContext";

export default function SeparatorWithText({ text }) {
  const { colors } = useTheme();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 10 }}>
      {/* Left line */}
      <View style={{ flex: 1, height: 1, backgroundColor: colors.separator }} />

      {/* Text */}
      <Text style={{ marginHorizontal: 8, color: colors.separator, fontWeight: "500" }}>
        {text}
      </Text>

      {/* Right line */}
      <View style={{ flex: 1, height: 1, backgroundColor: colors.separator }} />
    </View>
  );
}
