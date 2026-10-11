require('dotenv').config();

const app = require('./app');
const store = require('./db/store');

async function start() {
  await store.init();

  const PORT = Number(process.env.PORT) || 3000;
  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\nPort ${PORT} is already in use (EADDRINUSE).`);
      console.error('Options:');
      console.error(`  • Stop whatever is using it (e.g. another node, Docker: docker compose down)`);
      console.error(`  • Or use another port: PORT=3001 node src/index.js\n`);
    } else {
      console.error(err);
    }
    process.exit(1);
  });
}

start();
