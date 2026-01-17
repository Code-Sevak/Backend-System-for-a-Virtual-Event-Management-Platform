const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { users } = require('../data/users');
const { events } = require('../data/event');
const { sendEmail } = require('../utils/mailer');
const { authenticate } = require('../middlewares/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

// Register user
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password are required' });
        if (users.find(u => u.email === email)) return res.status(409).json({ error: 'Email already registered' });
        const passwordHash = await bcrypt.hash(password, 10);
        const user = { id: uuidv4(), name, email, passwordHash, role: role === 'organizer' ? 'organizer' : 'attendee' };
        users.push(user);

        // Send welcome email asynchronously
        (async () => {
            try {
                const { preview } = await sendEmail({
                    to: user.email,
                    subject: 'Welcome to Virtual Events!',
                    text: `Hi ${user.name}, welcome to Virtual Events.`,
                    html: `<p>Hi <b>${user.name}</b>,</p><p>Welcome to Virtual Events.</p>`
                }) || {};
                if (preview) console.log('Preview URL (welcome):', preview);
            } catch (err) {
                console.error('Failed to send welcome email', err);
            }
        })();

        const { passwordHash: _ph, ...safe } = user;
        res.status(201).json({ user: safe });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'email and password required' });
        const user = users.find(u => u.email === email);
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '2h' });
        res.json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});


// Get current user's profile and registrations
router.get('/me', authenticate, (req, res) => {
    const user = users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const registered = events.filter(ev => ev.participants.find(p => p.userId === user.id));
    const organized = events.filter(ev => ev.organizerId === user.id);
    const { passwordHash: _ph, ...safe } = user;
    res.json({ user: safe, registered, organized });
});

module.exports = router;