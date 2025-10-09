const app = require('./app');
const redis = require('./utilites/redis');
const prisma = require('./utilites/prisma');

const startServer = async function () {
  try {
    console.log('... Auth MicroService ✔');

    await redis.connect();
    console.log('... Redis db ✔');

    await prisma.$connect();
    console.log('... Config ✔');

    app.listen(process.env.SERVER_PORT);
    console.log(`--- Server started on ${process.env.SERVER_PORT} ---\n\n`);
  } catch (err) {
    console.log('server setup failed', err);
    console.log('Error: ', err.message);
  }
};

startServer();
