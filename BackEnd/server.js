const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const eventRoutes = require("./routes/events"); // Import event routes
const gamesRoutes = require("./routes/games"); // Import event routes

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "*" }));
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/events", eventRoutes);
app.use("/games", gamesRoutes);  

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT} and accessible from all network interfaces`);
});
