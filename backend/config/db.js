const neo4j = require('neo4j-driver');

let driver;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function closeDriverQuietly() {
  if (!driver) return;
  try {
    await driver.close();
  } catch (_) {
    /* ignore */
  }
  driver = undefined;
}

/**
 * Neo4j Desktop can briefly refuse Bolt right after a nodemon restart or DBMS toggle.
 * Retry a few times instead of exiting immediately.
 */
async function connectDB() {
  const encrypted = process.env.NEO4J_ENCRYPTED === 'true';
  const attempts = Math.max(1, parseInt(process.env.NEO4J_CONNECT_RETRIES || '10', 10) || 10);
  const delayMs = Math.max(200, parseInt(process.env.NEO4J_CONNECT_RETRY_MS || '1500', 10) || 1500);

  let lastError;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      await closeDriverQuietly();
      driver = neo4j.driver(
        process.env.NEO4J_URI,
        neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD),
        { encrypted }
      );
      const serverInfo = await driver.getServerInfo();
      console.log(`Neo4j Connected: ${serverInfo.address}`);
      return;
    } catch (error) {
      lastError = error;
      console.error(`Neo4j connect attempt ${i}/${attempts}: ${error.message}`);
      if (i < attempts) await sleep(delayMs);
    }
  }
  console.error(`Neo4j connection error: ${lastError.message}`);
  process.exit(1);
}

function getDriver() {
  if (!driver) {
    throw new Error('Neo4j driver not initialized. Call connectDB() first.');
  }
  return driver;
}

function getSession() {
  return getDriver().session({
    database: process.env.NEO4J_DATABASE || 'neo4j',
  });
}

module.exports = { connectDB, getDriver, getSession };
