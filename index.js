
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static('public'));

// Homepage
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Temporary data storage
const users = [];
const exercises = [];

// 1. Create a new user
app.post('/api/users', (req, res) => {
  const username = req.body.username;

  if (typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({ error: 'Invalid username' });
  }

  const user = {
    username: username,
    _id: crypto.randomBytes(12).toString('hex')
  };

  users.push(user);
  res.json(user);
});

// 2. Get all users
app.get('/api/users', (req, res) => {
  res.json(users);
});

// 3. Add an exercise
app.post('/api/users/:_id/exercises', (req, res) => {
  const user = users.find(
    user => user._id === req.params._id
  );

  if (!user) {
    return res.status(404).json({ error: 'Unknown user' });
  }

  const { description, duration, date } = req.body;
  const durationNumber = Number(duration);

  if (
    typeof description !== 'string' ||
    !description.trim() ||
    duration === undefined ||
    duration === '' ||
    !Number.isFinite(durationNumber) ||
    durationNumber <= 0
  ) {
    return res.status(400).json({ error: 'Invalid exercise' });
  }

  const exerciseDate = date ? new Date(date) : new Date();

  if (isNaN(exerciseDate.getTime())) {
    return res.status(400).json({ error: 'Invalid date' });
  }

  const exercise = {
    userId: user._id,
    description: description,
    duration: durationNumber,
    date: exerciseDate
  };

  exercises.push(exercise);

  res.json({
    _id: user._id,
    username: user.username,
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date.toDateString()
  });
});

// 4. Get a user's exercise log
app.get('/api/users/:_id/logs', (req, res) => {
  const user = users.find(
    user => user._id === req.params._id
  );

  if (!user) {
    return res.status(404).json({ error: 'Unknown user' });
  }

  const { from, to, limit } = req.query;

  let userExercises = exercises.filter(
    exercise => exercise.userId === user._id
  );

  // Filter by starting date
  if (from) {
    const fromDate = new Date(from);

    if (isNaN(fromDate.getTime())) {
      return res.status(400).json({ error: 'Invalid from date' });
    }

    userExercises = userExercises.filter(
      exercise => exercise.date >= fromDate
    );
  }

  // Filter by ending date
  if (to) {
    const toDate = new Date(to);

    if (isNaN(toDate.getTime())) {
      return res.status(400).json({ error: 'Invalid to date' });
    }

    // Include the entire ending date
    toDate.setUTCHours(23, 59, 59, 999);

    userExercises = userExercises.filter(
      exercise => exercise.date <= toDate
    );
  }

  // Record the count before applying limit
  const count = userExercises.length;

  // Limit how many exercises are returned
  if (limit !== undefined) {
    const limitNumber = Number(limit);

    if (Number.isInteger(limitNumber) && limitNumber >= 0) {
      userExercises = userExercises.slice(0, limitNumber);
    }
  }

  // Format the exercise logs
  const log = userExercises.map(exercise => ({
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date.toDateString()
  }));

  res.json({
    _id: user._id,
    username: user.username,
    count: count,
    log: log
  });
});

// Start the server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log(
    'Your app is listening on port ' + listener.address().port
  );
});
