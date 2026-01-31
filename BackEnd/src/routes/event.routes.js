const express = require("express");
const Events = require("../models/event.model");
const Games = require("../models/games.model");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const events = await Events.findAll();
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:gameId", async (req, res) => {
  const gameId = req.params.gameId;
  try {
    // Check if the game exists
    const game = await Games.findById(gameId);

    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }
    const events = await Events.findAllByGameId(gameId);
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/id/:eventId", async (req, res) => {
  const eventId = req.params.eventId;
  try {
    const event = await Events.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.status(200).json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:event_type", async (req, res) => {
  const gameType = req.params.event_type;
  try {
    const events = await Events.findAllByGameType(event_type);
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:game_id/:event_type", async (req, res) => {
  const game_id = req.params.game_id;
  const event_type = req.params.event_type;
  try {
    // Check if the game exists
    const game = await Games.findById(game_id);
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }
    const events = await Events.findAllByGameIdAndGameType(game_id, event_type);
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:game_name/:start_date", async (req, res) => {
  const event_name = req.params.event_name;
  const start_date = req.params.start_date;
  try {
    const event = await Events.findByNameAndStartDate(event_name, start_date);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.status(200).json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/exists", async (req, res) => {
  const { title, start_date } = req.body;
  try {
    if (!title || !start_date) {
      return res.status(400).json({ message: "Missing title or start_date" });
    }
    const event = await Events.findByNameAndStartDate(title, start_date);
    res.status(200).json({ exists: !!event });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/batch-check", async (req, res) => {
  const events = req.body;
  try {
    if (!Array.isArray(events)) {
      return res.status(400).json({ message: "Expected an array of events" });
    }

    // Check which events exist
    const existingEvents = await Events.batchCheckEvents(events);
    
    // Create a set of existing event keys for quick lookup
    const existingSet = new Set(
      existingEvents.map(e => `${e.event_name}|${e.start_date}`)
    );

    // Separate into existing and new events
    const result = {
      existing: [],
      new: []
    };

    events.forEach(event => {
      const key = `${event.event_name}|${event.start_date}`;
      if (existingSet.has(key)) {
        result.existing.push(event);
      } else {
        result.new.push(event);
      }
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", async (req, res) => {
  const event = req.body;
  try {
    // Validate required fields
    if (
      !event.game_id ||
      !event.event_name ||
      !event.start_date ||
      !event.expiry_date ||
      !event.event_type
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    // Check if the game exists
    const game = await Games.findById(event.game_id);
    if (!game) {
      return res.status(404).json({ message: "Game not found" });
    }
    const newEventId = await Events.postEvent(event);
    res.status(201).json({ message: "Event created", eventId: newEventId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/:eventId", async (req, res) => {
  const eventId = req.params.eventId;
  const event = req.body;
  try {
    // Check if the event exists
    const existingEvent = await Events.findById(eventId);
    if (!existingEvent) {
      return res.status(404).json({ message: "Event not found" });
    }

    // If game_id is being updated, check if it exists
    if (event.game_id) {
      const game = await Games.findById(event.game_id);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
    }

    const updated = await Events.updateEvent(eventId, event);
    if (updated) {
      res.status(200).json({ message: "Event updated successfully" });
    } else {
      res.status(400).json({ message: "Failed to update event" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/:eventId", async (req, res) => {
  const eventId = req.params.eventId;
  try {
    const deleted = await Events.deleteEvent(eventId);
    if (deleted) {
      res.status(200).json({ message: "Event deleted successfully" });
    } else {
      res.status(404).json({ message: "Event not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
