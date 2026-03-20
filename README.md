# 🚀 Incremental Export System with Change Data Capture (CDC)

## 📌 Overview

This project implements a **production-ready, containerized backend system** that supports efficient data synchronization using **Change Data Capture (CDC)** principles.

Instead of exporting entire datasets repeatedly, this system:

- Tracks changes using timestamps (`updated_at`)
- Uses **watermarking** to export only new/updated data
- Supports **full**, **incremental**, and **delta exports**
- Handles **asynchronous export jobs**
- Writes output to **CSV files**

---

## 🧱 Tech Stack

- **Backend:** Node.js (Express)
- **Database:** PostgreSQL
- **Containerization:** Docker & Docker Compose
- **Testing:** Jest + Supertest

---

## ⚙️ Features

- ✅ Full Data Export
- ✅ Incremental Export (CDC using timestamps)
- ✅ Delta Export (INSERT / UPDATE / DELETE tracking)
- ✅ Watermark tracking per consumer
- ✅ Asynchronous job processing
- ✅ CSV file generation
- ✅ Dockerized setup
- ✅ Structured logging
- ✅ Test coverage (≥70%)

---

## 🗄️ Database Schema

### users table

- id (SERIAL PRIMARY KEY)
- name (VARCHAR NOT NULL)
- email (VARCHAR UNIQUE NOT NULL)
- created_at (TIMESTAMP NOT NULL)
- updated_at (TIMESTAMP NOT NULL)
- is_deleted (BOOLEAN DEFAULT FALSE)

Index:
CREATE INDEX idx_users_updated_at ON users(updated_at);

---

### watermarks table

- id (SERIAL PRIMARY KEY)
- consumer_id (VARCHAR UNIQUE NOT NULL)
- last_exported_at (TIMESTAMP)
- updated_at (TIMESTAMP DEFAULT NOW())

---

## 🌱 Data Seeding

- Automatically runs on container startup
- Generates **100,000+ users**
- Data spread across last 7+ days
- At least 1% records soft deleted
- Uses faker library
- Idempotent using ON CONFLICT

---

## 🔌 API Endpoints

### 1. Health Check

GET /health

Response:
{
"status": "ok",
"timestamp": "ISO_TIMESTAMP"
}

---

### 2. Full Export

POST /exports/full  
Header: X-Consumer-ID

Response:
{
"jobId": "uuid",
"status": "started",
"exportType": "full",
"outputFilename": "full_consumer_timestamp.csv"
}

Behavior:

- Exports all non-deleted users
- Writes CSV to /output
- Updates watermark

---

### 3. Incremental Export

POST /exports/incremental  
Header: X-Consumer-ID

Behavior:

- Fetch records where updated_at > last_exported_at
- Exclude deleted records
- Writes CSV

---

### 4. Delta Export

POST /exports/delta  
Header: X-Consumer-ID

Adds column:
operation:

- INSERT → created_at == updated_at
- UPDATE → updated records
- DELETE → is_deleted = true

---

### 5. Get Watermark

GET /exports/watermark  
Header: X-Consumer-ID

Response:
{
"consumerId": "consumer-1",
"lastExportedAt": "timestamp"
}

404 if not exists

---

## ⚡ Async Job Processing

- Uses background jobs (setTimeout / worker pattern)
- API returns immediately with jobId
- Job runs independently

---

## 🔄 Watermark Logic

1. Fetch last_exported_at for consumer
2. Query records using:
   updated_at > last_exported_at
3. Export data
4. Get max(updated_at)
5. Update watermark ONLY after success

---

## 🛡️ Error Handling

- If export fails → watermark NOT updated
- Logs errors
- Prevents duplicate exports

---

## 📄 CSV Output

- Files stored in:
  ./output/

- Naming:
  full*<consumer>*<timestamp>.csv
  incremental*<consumer>*<timestamp>.csv
  delta*<consumer>*<timestamp>.csv

---

## 🐳 Docker Setup

### Run Project

docker-compose up --build

---

### Services

- app → Node.js backend
- db → PostgreSQL

---

## 🔧 Environment Variables

Create `.env`:

DATABASE_URL=postgresql://user:password@db:5432/mydatabase
PORT=8080
OUTPUT_DIR=/app/output

---

## 📘 .env.example

DATABASE_URL=postgresql://user:password@db:5432/mydatabase
PORT=8080
OUTPUT_DIR=/app/output

---

## 🧪 Testing

Run tests:

npm test

Coverage:

npm run coverage

- Includes:
  - Unit tests
  - Integration tests

---

## 📊 Logs

Example logs:

Job started:
{
"jobId": "...",
"consumerId": "...",
"type": "full"
}

Job completed:
{
"jobId": "...",
"rowsExported": 100000,
"duration": "2s"
}

Job failed:
{
"jobId": "...",
"error": "message"
}

---

## 🎥 Demo Steps

1. Run:
   docker-compose up --build

2. Health Check:
   GET http://localhost:8080/health

3. Full Export:
   POST /exports/full
   Header: X-Consumer-ID: consumer-1

4. Check output folder → CSV generated

5. Update some DB records manually

6. Incremental Export:
   POST /exports/incremental

7. Verify only updated rows exported

8. Delta Export:
   POST /exports/delta

9. Check operation column (INSERT/UPDATE/DELETE)

10. Get Watermark:
    GET /exports/watermark

---

## 🚀 Future Improvements

- Add message queue (RabbitMQ / Kafka)
- Add retry mechanism
- Add UI dashboard
- Store exports in S3

---

## ✅ Conclusion

This project demonstrates:

- Real-world CDC implementation
- Efficient data synchronization
- Scalable backend architecture
- Production-ready Docker setup

---
