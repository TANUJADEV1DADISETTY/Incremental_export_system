const fs = require('fs');
const path = require('path');
const { stringify } = require('csv-stringify');
const QueryStream = require('pg-query-stream');
const db = require('../db');
const watermarkService = require('./watermarkService');

const OUTPUT_DIR = path.join(__dirname, '../../output');

async function executeExport({ jobId, consumerId, exportType, outputFilename }) {
  const filePath = path.join(OUTPUT_DIR, outputFilename);
  const client = await db.getClient();

  console.log(JSON.stringify({
    event: 'Export job started',
    jobId,
    consumerId,
    exportType
  }));

  const startTime = Date.now();
  let rowsExported = 0;
  let maxUpdatedAt = null;

  try {
    await client.query('BEGIN');

    // Fetch the last watermark for incremental or delta
    let lastExportedAt = new Date(0);
    if (exportType === 'incremental' || exportType === 'delta') {
      const watermark = await watermarkService.getWatermark(consumerId);
      if (watermark) {
        lastExportedAt = watermark.last_exported_at;
      }
    }

    let queryText = '';
    let queryParams = [];

    if (exportType === 'full') {
      queryText = 'SELECT id, name, email, created_at, updated_at, is_deleted FROM users WHERE is_deleted = FALSE ORDER BY updated_at ASC';
    } else if (exportType === 'incremental') {
      queryText = 'SELECT id, name, email, created_at, updated_at, is_deleted FROM users WHERE updated_at > $1 AND is_deleted = FALSE ORDER BY updated_at ASC';
      queryParams = [lastExportedAt];
    } else if (exportType === 'delta') {
      queryText = 'SELECT id, name, email, created_at, updated_at, is_deleted FROM users WHERE updated_at > $1 ORDER BY updated_at ASC';
      queryParams = [lastExportedAt];
    }

    const query = new QueryStream(queryText, queryParams);
    const stream = client.query(query);

    const writeStream = fs.createWriteStream(filePath);
    
    // Determine CSV headers based on type
    const columns = ['id', 'name', 'email', 'created_at', 'updated_at', 'is_deleted'];
    if (exportType === 'delta') columns.unshift('operation');

    const csvStream = stringify({ header: true, columns });

    const { Transform } = require('stream');
    
    const transformStream = new Transform({
      objectMode: true,
      transform(row, encoding, callback) {
        if (!maxUpdatedAt || new Date(row.updated_at) > new Date(maxUpdatedAt)) {
          maxUpdatedAt = row.updated_at;
        }

        if (exportType === 'delta') {
          let operation = 'UPDATE';
          if (row.is_deleted) operation = 'DELETE';
          else if (new Date(row.created_at).getTime() === new Date(row.updated_at).getTime()) operation = 'INSERT';
          row.operation = operation;
        }
        
        rowsExported++;
        callback(null, row);
      }
    });

    await new Promise((resolve, reject) => {
      stream.on('error', reject);
      transformStream.on('error', reject);
      csvStream.on('error', reject);
      writeStream.on('error', reject);
      writeStream.on('finish', resolve);
      
      stream.pipe(transformStream).pipe(csvStream).pipe(writeStream);
    });

    // Update watermark transactionally if we exported any rows
    if (maxUpdatedAt) {
      await watermarkService.updateWatermark(client, consumerId, maxUpdatedAt);
    }
    
    await client.query('COMMIT');

    const duration = Date.now() - startTime;
    console.log(JSON.stringify({
      event: 'Export job completed',
      jobId,
      rowsExported,
      duration
    }));

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(JSON.stringify({
      event: 'Export job failed',
      jobId,
      error: error.message
    }));
  } finally {
    client.release();
  }
}

function startExport(params) {
  // Fire and forget
  executeExport(params).catch(err => {
    console.error(JSON.stringify({
      event: 'Export job failed',
      jobId: params.jobId,
      error: err.message
    }));
  });
}

module.exports = {
  startExport
};
