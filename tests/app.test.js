const request = require('supertest');
const app = require('../src/app');

// Mock external dependencies
jest.mock('../src/db', () => {
  return {
    query: jest.fn(),
    getClient: jest.fn().mockResolvedValue({
      query: jest.fn(),
      release: jest.fn()
    })
  };
});

// Since the export process runs in the background cleanly, mock it to prevent side-effects in short-lived tests
jest.mock('../src/services/exportService', () => {
  return {
    startExport: jest.fn()
  };
});

const watermarkService = require('../src/services/watermarkService');
jest.mock('../src/services/watermarkService');

describe('API Endpoints', () => {
  describe('GET /health', () => {
    it('should return 200 OK and status JSON', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('Exports', () => {
    it('should return 400 if X-Consumer-ID is missing', async () => {
      const res = await request(app).post('/exports/full');
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Missing X-Consumer-ID header');
    });

    const exportTypes = ['full', 'incremental', 'delta'];

    exportTypes.forEach((type) => {
      describe(`POST /exports/${type}`, () => {
        it(`should return 202 Accepted and job details for ${type} export`, async () => {
          const res = await request(app)
            .post(`/exports/${type}`)
            .set('X-Consumer-ID', 'test-consumer');

          expect(res.statusCode).toEqual(202);
          expect(res.body).toHaveProperty('jobId');
          expect(res.body).toHaveProperty('status', 'started');
          expect(res.body).toHaveProperty('exportType', type);
          expect(res.body).toHaveProperty('outputFilename');
        });
      });
    });
  });

  describe('GET /exports/watermark', () => {
    it('should return 404 if no watermark exists', async () => {
      watermarkService.getWatermark.mockResolvedValueOnce(null);
      
      const res = await request(app)
        .get('/exports/watermark')
        .set('X-Consumer-ID', 'new-consumer');
        
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('error');
    });

    it('should return 200 and watermark details if found', async () => {
      const mockDate = new Date();
      watermarkService.getWatermark.mockResolvedValueOnce({
        consumer_id: 'existing-consumer',
        last_exported_at: mockDate
      });

      const res = await request(app)
        .get('/exports/watermark')
        .set('X-Consumer-ID', 'existing-consumer');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('consumerId', 'existing-consumer');
      expect(res.body).toHaveProperty('lastExportedAt', mockDate.toISOString());
    });
  });
});
