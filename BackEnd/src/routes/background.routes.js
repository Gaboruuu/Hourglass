const express = require("express");
const Backgrounds = require("../models/background.model");
const Events = require("../models/event.model");
const router = express.Router();


router.get("/:eventId", async (req, res) => {
    const eventId = req.params.eventId;
    try {
        // Check if the event exists
        const event = await Events.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }
        const backgrounds = await Backgrounds.findAllByEventId(eventId);
        res.status(200).json(backgrounds);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
module.exports = router;
