import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  ImageSourcePropType,
} from "react-native";
import images from "../../assets/ImageManager";
import { AnyEvent } from "../../data/EventInteface";

interface ApiEventCardProps {
  event: AnyEvent & {
    reset_date?: string;
    reset_start_date?: string;
  };
}

interface BackgroundImageResponse {
  image_url: string;
}

const ApiEventCard: React.FC<ApiEventCardProps> = ({ event }) => {
  // Use reset_date if provided, otherwise fall back to expiry_date
  const expireDate = event?.reset_date || event?.expiry_date;
  // Use reset_start_date if provided, otherwise fall back to start_date
  const startDate = event?.reset_start_date || event?.start_date;
  const [backgroundImage, setBackgroundImage] = useState<
    BackgroundImageResponse[] | null
  >(null);
  const [remainingTime, setRemainingTime] = useState<string>(
    deriveTimeLabel(startDate, expireDate)
  );

  const fetchEventsBackgroundImages = async (
    eventId: string
  ): Promise<void> => {
    try {
      const response = await fetch(
        `https://hourglass-h6zo.onrender.com/api/event-backgrounds/${eventId}`
      );
      const data: BackgroundImageResponse[] = await response.json();
      setBackgroundImage(data);
    } catch (error) {
      console.error("Error loading images:", error);
      setBackgroundImage(null);
    }
  };

  const getBackgroundImage = (): ImageSourcePropType => {
    // Fetch background images if we have an event_id
    if (event.event_id && !backgroundImage) {
      fetchEventsBackgroundImages(event.event_id);
    }

    // Use fetched background image if available
    if (backgroundImage && backgroundImage.length > 0) {
      return { uri: backgroundImage[0].image_url };
    }

    return getRandomImage();
  };

  const getRandomImage = (): ImageSourcePropType => {
    // const rndnr = Math.floor(Math.random() * 3) + 1;
    const rndnr = 1; // Temporarily fix to 1 until we have more images
    const importance = event.event_type === "main" ? "main" : "side";
    const gameTitle = event.game_name;

    const imageMap: Record<string, string> = {
      "Genshin Impact": `gi_${importance}_${rndnr}.png`,
      "Honkai Impact 3rd": `hi3_${importance}_${rndnr}.png`,
      "Zenless Zone Zero": `zzz_${importance}_${rndnr}.png`,
      "Wuthering Waves": `wuwa_${importance}_${rndnr}.png`,
      "Honkai: Star Rail": `hsr_${importance}_${rndnr}.png`,
      "Punishing: Gray Raven": `pgr_${importance}_${rndnr}.png`,
    };

    const imageKey = gameTitle ? imageMap[gameTitle] : undefined;

    return (
      (imageKey && images[imageKey as keyof typeof images]) ||
      images["placeholder.png"]
    );
  };

  // Update remaining time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingTime(deriveTimeLabel(startDate, expireDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [startDate, expireDate]);

  // Format date range display
  const dateRange = useMemo(() => {
    if (!startDate && !expireDate) return null;
    const formattedStart = formatDate(startDate);
    const formattedExpire = formatDate(expireDate);
    // Only return if at least one date is valid
    if (!formattedStart && !formattedExpire) return null;
    return `${formattedStart || "?"} → ${formattedExpire || "?"}`;
  }, [startDate, expireDate]);

  const importanceBadgeStyle =
    event.event_type === "main" ? styles.badgeMain : styles.badgeSub;

  return (
    <View
      style={[
        styles.card,
        event.event_type === "main" ? styles.mainShadow : styles.subShadow,
      ]}
    >
      <ImageBackground
        source={getBackgroundImage()}
        style={styles.background}
        imageStyle={styles.imageRadius}
        resizeMode="cover"
      >
        <View style={styles.gradientOverlay} />
        <View style={styles.contentWrapper}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }} />
            <View style={[styles.badge, importanceBadgeStyle]}>
              <Text style={styles.badgeText}>
                {event.event_type === "main" ? "MAIN" : "SIDE"}
              </Text>
            </View>
          </View>

          {/* Event Title */}
          <Text style={styles.title} numberOfLines={2}>
            {String(event.event_name || "")}
          </Text>

          {/* Game Title */}
          {event.game_name && String(event.game_name).trim() !== "" && (
            <Text style={styles.gameTitle} numberOfLines={1}>
              {String(event.game_name)}
            </Text>
          )}

          {/* Spacer */}
          <View style={{ flex: 1 }} />

          {/* Footer Row */}
          <View style={styles.footerRow}>
            <View style={styles.footerLeft}>
              <Text style={styles.expiration} numberOfLines={1}>
                {String(remainingTime)}
              </Text>
              {dateRange && String(dateRange).trim() !== "" && (
                <Text style={styles.date} numberOfLines={1}>
                  {String(dateRange)}
                </Text>
              )}
            </View>
            {Boolean(event.daily_login) && (
              <View style={[styles.badge, styles.badgeLogin]}>
                <Text style={styles.badgeText}>Daily</Text>
              </View>
            )}
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

// Helper function to parse dates flexibly
const parseDateFlexible = (value?: string): Date | null => {
  if (!value) return null;

  // If it's already an ISO string (from reset_date/reset_start_date), parse directly
  if (value.includes("T") || value.includes("Z")) {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  // Handle date-only strings (YYYY-MM-DD) - these are raw dates that need 4 AM server time
  // Note: This should ideally be handled by the parent component using region context
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  }

  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
};

// Determine time label based on start and expire dates
const deriveTimeLabel = (
  startDateStr?: string,
  expireDateStr?: string
): string => {
  const now = new Date();
  const start = parseDateFlexible(startDateStr);
  const expire = parseDateFlexible(expireDateStr);

  // Event hasn't started yet
  if (start && start.getTime() > now.getTime()) {
    const diff = start.getTime() - now.getTime();
    return `⏱ Time Until: ${formatDiff(diff)}`;
  }

  // No expiry date available
  if (!expire) return "No date";

  // Check remaining time
  const diffRemaining = expire.getTime() - now.getTime();
  if (diffRemaining <= 0) return "Expired";

  return `⏳ Remaining: ${formatDiff(diffRemaining)}`;
};

// Format time difference as days, hours, minutes, seconds
const formatDiff = (diff: number): string => {
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};

// Format date string for display
const formatDate = (dateStr?: string): string => {
  if (!dateStr) return "";

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    // Handle YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [, m, dd] = dateStr.split("-");
      if (m && dd) {
        return `${dd}/${m}`;
      }
    }
    return "";
  }

  const day = date.getDate();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: "hidden",
    marginVertical: 10,
    width: "100%",
    height: 155,
    elevation: 0,
  },
  mainShadow: {
    borderColor: "#f7d641",
    borderWidth: 1,
  },
  subShadow: {
    borderColor: "#222",
    borderWidth: 1,
  },
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  imageRadius: {
    borderRadius: 17,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  contentWrapper: {
    flex: 1,
    padding: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginTop: 4,
  },
  gameTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#cfe9ff",
    marginTop: 2,
    textShadowColor: "rgba(0,0,0,0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  footerLeft: {
    flexShrink: 1,
  },
  expiration: {
    fontSize: 13,
    color: "#ffd952",
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  date: {
    fontSize: 12,
    color: "#f4f4f4",
    opacity: 0.9,
    marginTop: 2,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  badgeMain: {
    backgroundColor: "rgba(255,215,64,0.85)",
  },
  badgeSub: {
    backgroundColor: "rgba(60,60,60,0.8)",
  },
  badgeLogin: {
    backgroundColor: "rgba(0,170,80,0.8)",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default ApiEventCard;
