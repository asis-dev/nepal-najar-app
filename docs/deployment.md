# Deployment Guide

## Environments
- **Local:** Docker Compose (Postgres, Redis, MinIO)
- **Staging:** Railway (API + DB + Redis) + Vercel (Admin Web)
- **Production:** AWS/GCP with Terraform

## Environment Variables
See `.env.example` for all required variables.

## CI/CD
GitHub Actions pipeline: lint > test > build > deploy
