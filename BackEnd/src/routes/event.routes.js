const express = require("express");
const Events = require("../models/event.model");
const Games = require("../models/games.model");
const { authorize } = require("../middleware/authorize");
const { validate } = require("../middleware/validate");
const { asyncHandler, HttpError } = require("../middleware/errorHandler");
const {
  createEventSchema,
  updateEventSchema,
  batchCheckSchema,
  startNotAfterExpiry,
} = require("../schemas/event.schema");

const router = express.Router();

// ---- Public reads ----
// The overlapping GET routes below (/:gameId shadows /:event_type, etc.) are a known bug,
// fixed together with the Phase 1 API changes.

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const events = await Events.findAll();
    res.status(200).json(events);
  }),
);

router.get(
  "/:gameId",
  asyncHandler(async (req, res) => {
    const gameId = req.params.gameId;
    const game = await Games.findById(gameId);
    if (!game) throw new HttpError(404, "Game not found");
    const events = await Events.findAllByGameId(gameId);
    res.status(200).json(events);
  }),
);

router.get(
  "/id/:eventId",
  asyncHandler(async (req, res) => {
    const event = await Events.findById(req.params.eventId);
    if (!event) throw new HttpError(404, "Event not found");
    res.status(200).json(event);
  }),
);

router.get(
  "/:event_type",
  asyncHandler(async (req, res) => {
    const gameType = req.params.event_type;
    const events = await Events.findAllByGameType(event_type);
    res.status(200).json(events);
  }),
);

router.get(
  "/:game_id/:event_type",
  asyncHandler(async (req, res) => {
    const game_id = req.params.game_id;
    const event_type = req.params.event_type;
    const game = await Games.findById(game_id);
    if (!game) throw new HttpError(404, "Game not found");
    const events = await Events.findAllByGameIdAndGameType(game_id, event_type);
    res.status(200).json(events);
  }),
);

router.get(
  "/:game_name/:start_date",
  asyncHandler(async (req, res) => {
    const event_name = req.params.event_name;
    const start_date = req.params.start_date;
    const event = await Events.findByNameAndStartDate(event_name, start_date);
    if (!event) throw new HttpError(404, "Event not found");
    res.status(200).json(event);
  }),
);

// ---- Writes: EventsSync (API key) and admins ----

router.post(
  "/batch-check",
  authorize("sync", "admin", { reportOnly: true }),
  validate(batchCheckSchema),
  asyncHandler(async (req, res) => {
    const events = req.body;
    const existingEvents = await Events.batchCheckEvents(events);

    const existingSet = new Set(existingEvents.map((e) => `${e.event_name}|${e.start_date}`));
    const result = { existing: [], new: [] };
    events.forEach((event) => {
      const key = `${event.event_name}|${event.start_date}`;
      (existingSet.has(key) ? result.existing : result.new).push(event);
    });

    res.status(200).json(result);
  }),
);

router.post(
  "/",
  authorize("sync", "admin", { reportOnly: true }),
  validate(createEventSchema),
  asyncHandler(async (req, res) => {
    const event = req.body;
    const game = await Games.findById(event.game_id);
    if (!game) throw new HttpError(404, "Game not found");

    const newEventId = await Events.postEvent(event);
    res.status(201).json({ message: "Event created", eventId: newEventId });
  }),
);

router.put(
  "/:eventId",
  authorize("sync", "admin", { reportOnly: true }),
  validate(updateEventSchema),
  asyncHandler(async (req, res) => {
    const eventId = req.params.eventId;
    const changes = req.body;

    const existingEvent = await Events.findById(eventId);
    if (!existingEvent) throw new HttpError(404, "Event not found");

    if (changes.game_id) {
      const game = await Games.findById(changes.game_id);
      if (!game) throw new HttpError(404, "Game not found");
    }

    // A partial update can still break the date order together with the stored dates
    if (!startNotAfterExpiry({ ...existingEvent, ...changes })) {
      throw new HttpError(400, "Invalid request", [
        { field: "expiry_date", message: "start_date must be on or before expiry_date" },
      ]);
    }

    await Events.updateEvent(eventId, changes);
    res.status(200).json({ message: "Event updated successfully" });
  }),
);

// ---- Admin only: the sync can never delete ----

router.delete(
  "/:eventId",
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const deleted = await Events.deleteEvent(req.params.eventId);
    if (!deleted) throw new HttpError(404, "Event not found");
    res.status(200).json({ message: "Event deleted successfully" });
  }),
);

module.exports = router;
