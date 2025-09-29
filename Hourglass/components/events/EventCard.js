import React, { useState, useEffect, useMemo } from "react";
import { View, Text, ImageBackground, StyleSheet } from "react-native";
import images from "../../assets/ImageManager";


const EventCard = ({ event }) => {
  const expireDate = event?.expire_date;
  const startDate = event?.start_date;
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [remainingTime, setRemainingTime] = useState(deriveTimeLabel(startDate, expireDate));

  const fetchEventsBackgroundImages = async () => {
    try {
      const response = await fetch(`https://hourglass-h6zo.onrender.com/api/event-backgrounds/${event.id}`);
      const data = await response.json();
      setBackgroundImage(data);
    } catch (error) {
      console.error("Error loading images:", error);
      setBackgroundImage(null); // fallback to default images
    }
  };

  const getBackgroundImage = (imageName) => {    
  if (backgroundImage && backgroundImage.length > 0) {
    return { uri: backgroundImage[0].image_url };
  }
  return getRandomImage();
  }

  const getRandomImage = () => {
    const rndnr = Math.floor(Math.random() * 3) + 1; 
    const importance = event.importance === "main" ? "main" : "sub";
    if (event.game_title === "Genshin Impact") {
      return images[`gi_${importance}_${rndnr}.png`] ;
    }
    if (event.game_title === "Honkai Impact 3rd") {
      return images[`hi3_${importance}_${rndnr}.png`] ;
    }
    if (event.game_title === "Zenless Zone Zero") {
      return images [`zzz_${importance}_${rndnr}.png`] ;
    }
    if (event.game_title === "Wuthering Waves") {
      return images[`wuwa_${importance}_${rndnr}.png`] ;
    }
    if (event.game_title === "Honkai: Star Rail") {
      return images [`hsr_${importance}_${rndnr}.png`] ;
    }
    if (event.game_title === "Punishing: Gray Raven") {
      return images[`pgr_${importance}_${rndnr}.png`] ;
    }
    return images["placeholder.png"];
  }

  useEffect(() => {
    fetchEventsBackgroundImages();
    const interval = setInterval(() => {
      setRemainingTime(deriveTimeLabel(startDate, expireDate));
    }, 1000); // keep 1s for smooth countdown
    return () => clearInterval(interval);
  }, [startDate, expireDate]);

  // Derived memoized bits of info
  const dateRange = useMemo(() => {
    if (!startDate && !expireDate) return "";
    return `${formatDate(startDate)} → ${formatDate(expireDate)}`;
  }, [startDate, expireDate]);

  const importanceBadgeStyle = event.importance === "main" ? styles.badgeMain : styles.badgeSub;

  return (
    <View style={[styles.card, event.importance === "main" ? styles.mainShadow : styles.subShadow]}>
      <ImageBackground
        source={getBackgroundImage(event.background)}
        style={styles.background}
        imageStyle={styles.imageRadius}
        resizeMode="cover"
      >
        {/* Gradient-like overlay using layered views (no external deps) */}
        <View style={styles.gradientOverlay} />
        <View style={styles.contentWrapper}>
          {/* Header Row (badge only now) */}
          <View style={styles.headerRow}>
            <View style={{flex:1}} />
            <View style={[styles.badge, importanceBadgeStyle]}>
              <Text style={styles.badgeText}>{event.importance === "main" ? "MAIN" : "SIDE"}</Text>
            </View>
          </View>

          {/* Event Title */}
          <Text style={styles.title} numberOfLines={2}>{event.event_name || ""}</Text>

          {/* Game Title (prominent) */}
          {!!event.game_title && (
            <Text style={styles.gameTitle} numberOfLines={1}>{event.game_title}</Text>
          )}

          {/* Spacer */}
          <View style={{ flex: 1 }} />

          {/* Footer Row */}
          <View style={styles.footerRow}>
            <View style={styles.footerLeft}>
              <Text style={styles.expiration} numberOfLines={1}>{remainingTime}</Text>
              {!!dateRange && (
                <Text style={styles.date} numberOfLines={1}>{dateRange}</Text>
              )}
            </View>
            {event.daily_login == "1" && (
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



// Generic helper creating a Date object respecting date-only strings
const parseDateFlexible = (value) => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-');
    return new Date(y, m - 1, d); // beginning of the day
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

// Returns a label either "⏱ Time Until: X" if event hasn't started, or "⏳ Remaining: Y" if active
const deriveTimeLabel = (startDateStr, expireDateStr) => {
  const now = new Date();
  const start = parseDateFlexible(startDateStr);
  const expire = parseDateFlexible(expireDateStr);

  if (start && start.getTime() > now.getTime()) {
    const diff = start.getTime() - now.getTime();
    return `⏱ Time Until: ${formatDiff(diff)}`;
  }
  if (!expire) return 'No date';
  const diffRemaining = expire.getTime() - now.getTime();
  if (diffRemaining <= 0) return 'Expired';
  return `⏳ Remaining: ${formatDiff(diffRemaining)}`;
};

// Converts milliseconds diff to d h m s (always shows all units)
const formatDiff = (diff) => {
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};

// Light date formatting (YYYY-MM-DD → DD Mon | handles empty)
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    // maybe it's just YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, dd] = dateStr.split("-");
      return `${dd}/${m}`;
    }
    return dateStr;
  }
  return `${d.getDate()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
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
    width: '100%',
    height: '100%',
  },
  imageRadius: {
    borderRadius: 17,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  contentWrapper: {
    flex: 1,
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginTop: 4,
  },
  gameTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#cfe9ff',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  footerLeft: {
    flexShrink: 1,
  },
  expiration: {
    fontSize: 13,
    color: '#ffd952',
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  date: {
    fontSize: 12,
    color: '#f4f4f4',
    opacity: 0.9,
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  badgeMain: {
    backgroundColor: 'rgba(255,215,64,0.85)',
  },
  badgeSub: {
    backgroundColor: 'rgba(60,60,60,0.8)',
  },
  badgeLogin: {
    backgroundColor: 'rgba(0,170,80,0.8)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default EventCard;
