# Nepal Progress — Architecture Documentation

## Overview
Nepal Progress is a national delivery intelligence and transparency platform for Nepal.

## Quick Start
1. `cp .env.example .env`
2. `npm run docker:up`
3. `npm install`
4. `npm run db:migrate`
5. `npm run db:seed`
6. `npm run dev`

## Architecture
- **Core framing:** Execution system first, public visibility second, AI verification third, national intelligence layer on top.
- **Data separation:** Official data, observational data, and AI analytical data are never mixed.
- **CQRS pattern:** Normalized write models for mutations, denormalized read models for dashboards.

## Services
| Service | Port | Description |
|---------|------|-------------|
| API (NestJS) | 3001 | Core backend |
| Admin Web (Next.js) | 3000 | Admin dashboard |
| AI Service (FastAPI) | 8000 | Intelligence layer |
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Queues & cache |
| MinIO | 9000/9001 | Object storage |
