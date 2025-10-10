import React, { useState, useEffect } from "react";
import { View, Text, ImageBackground, StyleSheet, useWindowDimensions } from "react-native";
import images from "../../assets/ImageManager";

const getBackgroundImage = (imageName) => {
  // Check if the image exists in the mapping, otherwise fall back to placeholder
  return images[imageName] || images["placeholder.png"];
};

const PermanentEventCard = ({ event }) => {
  const [remainingTime, setRemainingTime] = useState(calculateTimeRemaining(event.expire_date));
  const { width: screenWidth } = useWindowDimensions();
  const { height: screenHeight } = useWindowDimensions();

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingTime(calculateTimeRemaining(event.expire_date));
    }, 1000);

    return () => clearInterval(interval); // Cleanup on unmount
  }, [event.expire_date]);

  return (
    <View
      style={[
        styles.card,
        //event.importance === "main" ? styles.mainShadow : styles.subShadow,
        // Responsive sizing
        {
          // Maintain 23:9 aspect ratio, but do not exceed max width or height of 200
          width: Math.min(screenWidth * 0.9, 200 * 23 / 9),
          height: Math.min((Math.min(screenWidth * 0.9, 200 * 23 / 9)) * 9 / 23, 200),
        },
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
            <Text style={[styles.title, {fontSize: Math.min(screenWidth * 0.04 * 1.4, 30)}]}>{event.event_name || ""}</Text>
            <Text style={[styles.gameName, {fontSize: Math.min(screenWidth * 0.04, 18)}]}>{event.game_name || ""}</Text>
          </View>
          <View style={styles.timeContainer}>  
            
            <Text style={[styles.expiration, {fontSize: Math.min(screenWidth * 0.04 * 0.85, 18)}]}>{`Expires in: ${remainingTime}`}</Text>
            {event.reset_type === "complex" && (
              <Text style={[styles.status, {fontSize: Math.min(screenWidth * 0.04 * 0.85, 16)}]}>{`Status: ${event.status}`}</Text>
            )}
            {event.reset_type !== "fixed_duration" &&  event.reset_type !== "complex" && (
              <Text style={[styles.resetType, {fontSize: Math.min(screenWidth * 0.04 * 0.85, 16)}]}>{`Reset: ${event.reset_type || ""}`}</Text>
            )}
            {event.reset_type === "fixed_duration" && event.reset_type !== "complex" && (
              <Text style={[styles.resetType, {fontSize: Math.min(screenWidth * 0.04 * 0.85, 16)}]}>{`Reset every ${event.duration_days} days`}</Text>
            )}

            {event.daily_login && <Text style={[styles.login, {fontSize: Math.min(screenWidth * 0.04 * 0.85, 16)}]}>Daily login</Text>}
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

// Function to calculate remaining time for permanent events (handles full datetime)
const calculateTimeRemaining = (expireTime) => {
  if (!expireTime) return "No expiration";
  
  const now = new Date();
  const expire = new Date(expireTime); // Use the full datetime string from manager

  if (isNaN(expire.getTime())) {
    return "Invalid date";
  }
  
  const diff = expire - now;

  if (diff <= 0) return "Expired";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  //const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return `${days}d ${hours}h ${minutes}m `;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: "hidden",
    marginVertical: 10,
    width: "100%",
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
    alignItems: "flex-end",
  },
  timeContainer: {
    flexDirection: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  title: {
    //fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: 'black',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  gameName: {
    //fontSize: 14,
    color: "#fff",
    textShadowColor: 'black',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  expiration: {
    //fontSize: 14,
    color: "#ffcc00",
    textShadowColor: 'black',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  login: {
    //fontSize: 14,
    color: "#00ff00",
    textShadowColor: 'black',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  resetType: {
    //fontSize: 10,
    color: "#66ccff",
    textShadowColor: 'black',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  date: {
    //fontSize: 14,
    color: "#ff4444",
    textAlign: "right",
  },
  status: {
    //fontSize: 14,
    color: "#ff4444",
    textShadowColor: 'black',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
});

export default PermanentEventCard;
