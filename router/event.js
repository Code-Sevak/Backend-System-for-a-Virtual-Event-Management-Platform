const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { events } = require('../data/event');
const { users } = require('../data/users');
const { sendEmail } = require('../utils/mailer');
const { authenticate, requireOrganizer } = require('../middlewares/auth');

// Create event (organizer only)
router.post('/', authenticate, requireOrganizer, (req, res) => {
    const { title, description, date, time } = req.body;
    if (!title || !date || !time) return res.status(400).json({ error: 'title, date and time are required' });
    const event = { id: uuidv4(), title, description: description || '', date, time, organizerId: req.user.id, participants: [] };
    events.push(event);
    res.status(201).json({ event });
});

// List all events
router.get('/', (req, res) => {
    res.json({ events });
});

// Get event by id
router.get('/:id', (req, res) => {
    const e = events.find(ev => ev.id === req.params.id);
    if (!e) return res.status(404).json({ error: 'Event not found' });
    res.json({ event: e });
});

// Update event (organizer & owner)
router.put('/:id', authenticate, requireOrganizer, (req, res) => {
    const e = events.find(ev => ev.id === req.params.id);
    if (!e) return res.status(404).json({ error: 'Event not found' });
    if (e.organizerId !== req.user.id) return res.status(403).json({ error: 'Not the event owner' });
    const { title, description, date, time } = req.body;
    if (title) e.title = title;
    if (description) e.description = description;
    if (date) e.date = date;
    if (time) e.time = time;
    res.json({ event: e });
});

// Delete event (organizer & owner)
router.delete('/:id', authenticate, requireOrganizer, (req, res) => {
    const idx = events.findIndex(ev => ev.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Event not found' });
    const e = events[idx];
    if (e.organizerId !== req.user.id) return res.status(403).json({ error: 'Not the event owner' });
    events.splice(idx, 1);
    res.json({ message: 'Event deleted' });
});

// Register for event (authenticated users)
router.post('/:id/register', authenticate, async (req, res) => {
    const e = events.find(ev => ev.id === req.params.id);
    if (!e) return res.status(404).json({ error: 'Event not found' });
    if (e.participants.find(p => p.userId === req.user.id)) return res.status(409).json({ error: 'Already registered' });
    const user = users.find(u => u.id === req.user.id);
    const participant = { userId: user.id, name: user.name, email: user.email, registeredAt: new Date().toISOString() };
    e.participants.push(participant);

    // Send confirmation email asynchronously
    (async () => {
        try {
            const { preview } = await sendEmail({
                to: user.email,
                subject: `Registration confirmed: ${e.title}`,
                text: `You are registered for ${e.title} on ${e.date} at ${e.time}`,
                html: `<p>Hi <b>${user.name}</b>,</p><p>You are registered for <b>${e.title}</b> on ${e.date} at ${e.time}.</p>`
            }) || {};
            if (preview) console.log('Preview URL (registration):', preview);
        } catch (err) {
            console.error('Failed to send registration email', err);
        }
    })();

    res.json({ message: 'Registered', participant });
});

module.exports = router;