const express = require('express');

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Virtual Event Management API' });
});

app.use('/users', require('./router/user'));
app.use('/events', require('./router/event'));

// Start server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

module.exports = app;