import React, { useState, useEffect } from "react";
import { View, Text, ImageBackground, StyleSheet } from "react-native";

const images = {
  "zenless_bg.jpg": require("../assets/zzz1.png"),
  "placeholder.png": require("../assets/placeholder.png"),
};

const getBackgroundImage = (imageName) => {
  // Check if the image exists in the mapping, otherwise fall back to placeholder
  return images[imageName] || images["placeholder.png"];
};

const EventCard = ({ event }) => {
  const [remainingTime, setRemainingTime] = useState(timeRemaining(event.expire_date));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingTime(timeRemaining(event.expire_date));
    }, 1000);

    return () => clearInterval(interval); // Cleanup on unmount
  }, [event.expire_date]);

  return (
    <View
      style={[
        styles.card,
        event.importance === "main" ? styles.mainShadow : styles.subShadow,
      ]}
    >
      <ImageBackground 
        source={getBackgroundImage(event.background)}
        style={styles.background}
        imageStyle={{ borderRadius: 17, resizeMode: 'cover' }}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <View style={styles.textContainer}>
            {renderOutlinedText(event.event_name || "", styles.title)}
            {renderOutlinedText(event.game_name || "", styles.gameName)}
            {renderOutlinedText(`Expires in: ${remainingTime}`, styles.expiration)}
            {event.daily_login && renderOutlinedText("Daily login", styles.login)}
            {renderOutlinedText(`${event.start_date || ""} - ${event.expire_date || ""}`, styles.date)}
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};



// Function to calculate remaining time
const timeRemaining = (expireTime) => {
  const now = new Date();
  const [year, month, day] = expireTime.split("-");
  const expire = new Date(year, month - 1, day);

  if (isNaN(expire.getTime())) {
    return "Invalid date";
  }
  const diff = expire - now;

  if (diff <= 0) return "Expired";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};

// Function to render text with an outline effect
const renderOutlinedText = (text, textStyle) => {
  if (!text) return null; 
 return (
 <View style={styles.outlineContainer}>
    <Text style={[textStyle, styles.outline, { left: -1, top: -1 }]}>{text}</Text>
    <Text style={[textStyle, styles.outline, { left: 1, top: -1 }]}>{text}</Text>
    <Text style={[textStyle, styles.outline, { left: -1, top: 1 }]}>{text}</Text>
    <Text style={[textStyle, styles.outline, { left: 1, top: 1 }]}>{text}</Text>
    <Text style={[textStyle, styles.outline, { left: 0, top: -2 }]}>{text}</Text>
    <Text style={[textStyle, styles.outline, { left: 0, top: 2 }]}>{text}</Text>
    <Text style={[textStyle, styles.outline, { left: -2, top: 0 }]}>{text}</Text>
    <Text style={[textStyle, styles.outline, { left: 2, top: 0 }]}>{text}</Text>
    <Text style={textStyle}>{text}</Text>
  </View>
 );
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
    borderColor: "yellow",
    borderWidth: 1,
  },
  subShadow: {
    borderColor: "black",
    borderWidth: 1,
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: "center",
  },
  overlay: {
    padding: 10,
    borderRadius: 10,
    height: "100%",
    justifyContent: "space-between",
  },
  textContainer: {
    alignItems: "center",
  },
  outlineContainer: {
    position: "relative",
    alignItems: "center",
  },
  outline: {
    position: "absolute",
    color: "black",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  gameName: {
    fontSize: 16,
    color: "#fff",
  },
  expiration: {
    fontSize: 14,
    color: "#ffcc00",
  },
  login: {
    fontSize: 14,
    color: "#00ff00",
  },
  date: {
    fontSize: 14,
    color: "#ff4444",
    textAlign: "right",
  },
});

export default EventCard;
