import { Controller, Get, Inject, Optional } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';

import { EvidenceService } from '../evidence/evidence.service';

interface ServiceStatus {
  status: 'up' | 'down';
  latencyMs?: number;
  error?: string;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    @Optional() @Inject('REDIS_CLIENT') private readonly redis?: Redis,
    @Optional() private readonly evidenceService?: EvidenceService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  check() {
    return {
      status: 'ok',
      service: 'nepal-progress-api',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check including DB, Redis, and S3' })
  async detailed() {
    const [db, redis, s3] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkS3(),
    ]);

    const allUp = db.status === 'up' && redis.status === 'up' && s3.status === 'up';

    return {
      status: allUp ? 'healthy' : 'degraded',
      service: 'nepal-progress-api',
      timestamp: new Date().toISOString(),
      checks: { database: db, redis, s3 },
    };
  }

  private async checkDatabase(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'up', latencyMs: Date.now() - start };
    } catch (err: any) {
      return { status: 'down', latencyMs: Date.now() - start, error: err.message };
    }
  }

  private async checkRedis(): Promise<ServiceStatus> {
    if (!this.redis) {
      return { status: 'down', error: 'Redis client not injected' };
    }
    const start = Date.now();
    try {
      const pong = await this.redis.ping();
      return {
        status: pong === 'PONG' ? 'up' : 'down',
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      return { status: 'down', latencyMs: Date.now() - start, error: err.message };
    }
  }

  private async checkS3(): Promise<ServiceStatus> {
    if (!this.evidenceService) {
      return { status: 'down', error: 'EvidenceService not available' };
    }
    const start = Date.now();
    try {
      const ok = await this.evidenceService.checkS3();
      return {
        status: ok ? 'up' : 'down',
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      return { status: 'down', latencyMs: Date.now() - start, error: err.message };
    }
  }
}
