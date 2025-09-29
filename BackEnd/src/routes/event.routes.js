const express = require('express');
const Events = require('../models/event.model');
const Games = require('../models/games.model');
const router = express.Router();

router.get('/', async (req, res) => {
    try {
      const events = await Events.findAll();
      res.status(200).json(events);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
});

router.get('/:gameId', async (req, res) => {
    const gameId = req.params.gameId;
    try {
        // Check if the game exists
        const game = await Games.find
        ById(gameId);

        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        }
        const events = await Events.findAllByGameId(gameId);
        res.status(200).json(events);
    } catch (error) { 
        res.status(500).json({ message: error.message });
    }
});

router.get('/id/:eventId', async (req, res) => {
    const eventId = req.params.eventId;
    try {
        const event = await Events.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        res.status(200).json(event);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/:importance', async (req, res) => {
    const importance = req.params.importance;
    try {
        const events = await Events.findAllByImportance(importance);
        res.status(200).json(events);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/:gameId/:importance', async (req, res) => {
    const gameId = req.params.gameId;
    const importance = req.params.importance;
    try {
        // Check if the game exists
        const game = await Games.findById(gameId);
        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        } 
        const events = await Events.findAllByGameIdAndImportance(gameId, importance);
        res.status(200).json(events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/', async (req, res) => {
    const event = req.body;
    try {
        // Validate required fields
        if (!event.game_id || !event.event_name || !event.start_date || !event.expire_date || !event.importance) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        // Check if the game exists
        const game = await Games.findById(event.game_id);
        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        }
        const newEventId = await Events.postEvent(event);
        res.status(201).json({ message: 'Event created', eventId: newEventId });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;

