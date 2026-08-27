const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const projectsRouter = require('./routes/projects');
const tasksRouter = require('./routes/tasks');

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  // Health check — used by cloud platform readiness/liveness probes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/projects', projectsRouter);
  app.use('/api/tasks', tasksRouter);

  // 404 handler
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Central error handler
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  });

  return app;
}

module.exports = createApp;
