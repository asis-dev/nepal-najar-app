import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { HealthController } from './health.controller';
import { EvidenceModule } from '../evidence/evidence.module';

@Module({
  imports: [ConfigModule, EvidenceModule],
  controllers: [HealthController],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL');
        if (!url) return null;
        return new Redis(url);
      },
    },
  ],
})
export class HealthModule {}
