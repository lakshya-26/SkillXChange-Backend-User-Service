require('dotenv').config({ path: '.env' });

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const routes = require('./routes');
const { commonErrorHandler } = require('./utilites/errorHandler');
const { ping } = require('./utilites/redis');
const prisma = require('./utilites/prisma');
const app = express();

app.use(bodyParser.json({ limit: '10mb' }));
app.use(
  bodyParser.urlencoded({
    limit: '10mb',
    extended: true,
    parameterLimit: 50000,
  })
);

// Enable cors support to accept cross origin requests
app.use(cors());

// Enable helmet js middlewares to configure secure headers
app.use(helmet());

// Enable gzip compression module for REST API
app.use(compression());

// Disble x-powered-by header to hide server side technology
app.disable('x-powered-by');

app.use('/health', async (_req, res) => {
  try {
    const [results] = await prisma.$queryRaw`SELECT NOW() as current_time`;
    const currentTime = results.current_time;

    const redisPing = await ping();

    return res.send({
      message: 'Application running successfully!',
      uptime: process.uptime(),
      database: currentTime,
      redis: redisPing,
    });
  } catch (error) {
    console.error(`Error in health check API :: ${error}`);
    return commonErrorHandler(_req, res, error.message, 400);
  }
});

// REST API entry point
routes.registerRoutes(app);

// 404 Error Handling
app.use((req, res) => {
  const message = 'Invalid endpoint';
  commonErrorHandler(req, res, message, 404);
});

module.exports = app;
