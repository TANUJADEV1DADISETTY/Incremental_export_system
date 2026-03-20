const express = require('express');
const { v4: uuidv4 } = require('uuid');
const exportService = require('./services/exportService');
const watermarkService = require('./services/watermarkService');

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

const validateConsumer = (req, res, next) => {
  const consumerId = req.headers['x-consumer-id'];
  if (!consumerId) {
    return res.status(400).json({ error: 'Missing X-Consumer-ID header' });
  }
  req.consumerId = consumerId;
  next();
};

router.post('/exports/:type(full|incremental|delta)', validateConsumer, (req, res) => {
  const exportType = req.params.type;
  const consumerId = req.consumerId;
  const jobId = uuidv4();
  const timestamp = Date.now();
  const outputFilename = `${exportType}_${consumerId}_${timestamp}.csv`;

  // Start the export asynchronously
  exportService.startExport({ jobId, consumerId, exportType, outputFilename });

  res.status(202).json({
    jobId,
    status: 'started',
    exportType,
    outputFilename
  });
});

router.get('/exports/watermark', validateConsumer, async (req, res) => {
  try {
    const watermark = await watermarkService.getWatermark(req.consumerId);
    if (!watermark) {
      return res.status(404).json({ error: 'Watermark not found for consumer' });
    }
    res.status(200).json({
      consumerId: watermark.consumer_id,
      lastExportedAt: new Date(watermark.last_exported_at).toISOString()
    });
  } catch (error) {
    console.error('Error fetching watermark:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
