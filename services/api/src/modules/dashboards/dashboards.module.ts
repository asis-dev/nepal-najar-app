import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardsController } from './dashboards.controller';
import { DashboardsService } from './dashboards.service';
import { Project } from '../../entities/project.entity';
import { ProjectMilestone } from '../../entities/project-milestone.entity';
import { ProjectBlocker } from '../../entities/project-blocker.entity';
import { GovernmentUnit } from '../../entities/government-unit.entity';
import { Region } from '../../entities/region.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectMilestone,
      ProjectBlocker,
      GovernmentUnit,
      Region,
    ]),
  ],
  controllers: [DashboardsController],
  providers: [DashboardsService],
  exports: [DashboardsService],
})
export class DashboardsModule {}
