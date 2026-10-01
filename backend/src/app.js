const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const kitsRoutes = require('./routes/kits');
const practiceRoutes = require('./routes/practice');

const app = express();
app.use(express.json());

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-key-fallback',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    clientPromise: mongoose.connection.asPromise().then((c) => c.getClient()),
    collectionName: 'sessions' 
  }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 1 week
}));

app.use('/api/auth', authRoutes);
app.use('/api/kits', kitsRoutes);
app.use('/api/practice', practiceRoutes);

module.exports = app;
