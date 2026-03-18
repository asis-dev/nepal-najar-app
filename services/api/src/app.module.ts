import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { MilestonesModule } from './modules/milestones/milestones.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { BlockersModule } from './modules/blockers/blockers.module';
import { EscalationsModule } from './modules/escalations/escalations.module';
import { BudgetModule } from './modules/budget/budget.module';
import { EvidenceModule } from './modules/evidence/evidence.module';
import { UpdatesModule } from './modules/updates/updates.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { VerificationModule } from './modules/verification/verification.module';
import { DashboardsModule } from './modules/dashboards/dashboards.module';
import { EventsModule } from './modules/events/events.module';
import { HealthModule } from './modules/health/health.module';
import { ChatModule } from './modules/chat/chat.module';
import { ScrapingModule } from './modules/scraping/scraping.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        entities: [__dirname + '/entities/*.entity{.ts,.js}'],
        synchronize: config.get('NODE_ENV') === 'development',
        logging: config.get('NODE_ENV') === 'development' ? ['error', 'warn'] : false,
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: config.get('REDIS_URL'),
      }),
    }),
    // Core modules
    HealthModule,
    AuthModule,
    UsersModule,
    OrganizationModule,
    // Delivery modules
    ProjectsModule,
    MilestonesModule,
    TasksModule,
    BlockersModule,
    EscalationsModule,
    // Finance & evidence
    BudgetModule,
    EvidenceModule,
    UpdatesModule,
    // Validation & intelligence
    VerificationModule,
    // Transparency
    DashboardsModule,
    NotificationsModule,
    // System
    AuditModule,
    EventsModule,
    // AI proxy
    ChatModule,
    // Research & scraping
    ScrapingModule,
  ],
})
export class AppModule {}
