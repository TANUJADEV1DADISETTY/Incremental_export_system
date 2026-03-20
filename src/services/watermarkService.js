const db = require('../db');

async function getWatermark(consumerId) {
  const result = await db.query(
    'SELECT consumer_id, last_exported_at FROM watermarks WHERE consumer_id = $1',
    [consumerId]
  );
  return result.rows[0];
}

async function updateWatermark(client, consumerId, lastExportedAt) {
  // We use the provided client object which may be inside a transaction
  await client.query(
    `INSERT INTO watermarks (consumer_id, last_exported_at, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (consumer_id) 
     DO UPDATE SET last_exported_at = EXCLUDED.last_exported_at, updated_at = NOW()`,
    [consumerId, lastExportedAt]
  );
}

module.exports = {
  getWatermark,
  updateWatermark
};
