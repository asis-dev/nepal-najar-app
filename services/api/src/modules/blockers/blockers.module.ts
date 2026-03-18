import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockersController } from './blockers.controller';
import { BlockersService } from './blockers.service';
import { ProjectBlocker } from '../../entities/project-blocker.entity';
import { EscalationRecord } from '../../entities/escalation-record.entity';
import { ProjectMilestone } from '../../entities/project-milestone.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectBlocker, EscalationRecord, ProjectMilestone])],
  controllers: [BlockersController],
  providers: [BlockersService],
  exports: [BlockersService],
})
export class BlockersModule {}
