import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProjectBlocker } from '../../entities/project-blocker.entity';
import { EscalationRecord } from '../../entities/escalation-record.entity';
import { ProjectMilestone } from '../../entities/project-milestone.entity';
import { CreateBlockerDto } from './dto/create-blocker.dto';
import { UpdateBlockerDto } from './dto/update-blocker.dto';

export interface BlockerFilters {
  status?: string;
  severity?: string;
}

@Injectable()
export class BlockersService {
  constructor(
    @InjectRepository(ProjectBlocker)
    private readonly blockerRepo: Repository<ProjectBlocker>,
    @InjectRepository(EscalationRecord)
    private readonly escalationRepo: Repository<EscalationRecord>,
    @InjectRepository(ProjectMilestone)
    private readonly milestoneRepo: Repository<ProjectMilestone>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(filters?: BlockerFilters): Promise<ProjectBlocker[]> {
    const qb = this.blockerRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.project', 'project')
      .leftJoinAndSelect('b.owner_government_unit', 'unit')
      .orderBy('b.opened_at', 'DESC');

    if (filters?.status) {
      qb.andWhere('b.status = :status', { status: filters.status });
    }
    if (filters?.severity) {
      qb.andWhere('b.severity = :severity', { severity: filters.severity });
    }

    return qb.getMany();
  }

  async findByProject(
    projectId: string,
    filters?: BlockerFilters,
  ): Promise<ProjectBlocker[]> {
    const qb = this.blockerRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.milestone', 'milestone')
      .leftJoinAndSelect('b.owner_government_unit', 'unit')
      .where('b.project_id = :projectId', { projectId })
      .orderBy('b.opened_at', 'DESC');

    if (filters?.status) {
      qb.andWhere('b.status = :status', { status: filters.status });
    }
    if (filters?.severity) {
      qb.andWhere('b.severity = :severity', { severity: filters.severity });
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<ProjectBlocker> {
    const blocker = await this.blockerRepo.findOne({
      where: { id },
      relations: ['project', 'milestone', 'owner_government_unit', 'creator'],
    });
    if (!blocker) {
      throw new NotFoundException(`Blocker ${id} not found`);
    }
    return blocker;
  }

  async create(
    projectId: string,
    dto: CreateBlockerDto,
    userId: string,
  ): Promise<ProjectBlocker> {
    const blocker = this.blockerRepo.create({
      project_id: projectId,
      title: dto.title,
      description: dto.description ?? null,
      type: dto.type,
      severity: dto.severity,
      milestone_id: dto.milestoneId ?? null,
      owner_government_unit_id: dto.ownerGovernmentUnitId,
      expected_resolution_date: dto.expectedResolutionDate ?? null,
      status: 'open',
      opened_at: new Date(),
      escalation_level: 0,
      created_by: userId,
    });

    const saved = await this.blockerRepo.save(blocker);

    // If linked to a milestone, mark the milestone as blocked
    if (dto.milestoneId) {
      await this.milestoneRepo.update(dto.milestoneId, { status: 'blocked' });
      this.eventEmitter.emit('milestone.status_changed', {
        milestoneId: dto.milestoneId,
        projectId,
        status: 'blocked',
      });
    }

    this.eventEmitter.emit('blocker.created', {
      blockerId: saved.id,
      projectId,
      severity: dto.severity,
    });

    return saved;
  }

  async update(id: string, dto: UpdateBlockerDto): Promise<ProjectBlocker> {
    const blocker = await this.findOne(id);

    if (dto.title !== undefined) blocker.title = dto.title;
    if (dto.description !== undefined) blocker.description = dto.description ?? null;
    if (dto.type !== undefined) blocker.type = dto.type;
    if (dto.severity !== undefined) blocker.severity = dto.severity;
    if (dto.milestoneId !== undefined) blocker.milestone_id = dto.milestoneId ?? null;
    if (dto.ownerGovernmentUnitId !== undefined)
      blocker.owner_government_unit_id = dto.ownerGovernmentUnitId;
    if (dto.expectedResolutionDate !== undefined)
      blocker.expected_resolution_date = dto.expectedResolutionDate ?? null;

    return this.blockerRepo.save(blocker);
  }

  async resolve(id: string, userId: string): Promise<ProjectBlocker> {
    const blocker = await this.findOne(id);
    blocker.status = 'resolved';
    blocker.resolved_at = new Date();

    const saved = await this.blockerRepo.save(blocker);

    // If linked to a milestone that is blocked, check if other open blockers exist
    if (blocker.milestone_id) {
      const remainingBlockers = await this.blockerRepo.count({
        where: {
          milestone_id: blocker.milestone_id,
          status: 'open',
        },
      });

      // Also count escalated blockers as still active
      const escalatedBlockers = await this.blockerRepo.count({
        where: {
          milestone_id: blocker.milestone_id,
          status: 'escalated',
        },
      });

      if (remainingBlockers === 0 && escalatedBlockers === 0) {
        // No more active blockers, move milestone back to in_progress
        await this.milestoneRepo.update(blocker.milestone_id, {
          status: 'in_progress',
        });
        this.eventEmitter.emit('milestone.status_changed', {
          milestoneId: blocker.milestone_id,
          projectId: blocker.project_id,
          status: 'in_progress',
        });
      }
    }

    this.eventEmitter.emit('blocker.resolved', {
      blockerId: id,
      projectId: blocker.project_id,
    });

    return saved;
  }

  async escalate(
    id: string,
    toUnitId: string,
    reason: string,
    userId: string,
  ): Promise<ProjectBlocker> {
    const blocker = await this.findOne(id);

    blocker.escalation_level += 1;
    blocker.status = 'escalated';

    const saved = await this.blockerRepo.save(blocker);

    // Create escalation record
    const escalation = this.escalationRepo.create({
      blocker_id: blocker.id,
      project_id: blocker.project_id,
      from_unit_id: blocker.owner_government_unit_id,
      to_unit_id: toUnitId,
      reason,
      status: 'pending',
    });

    await this.escalationRepo.save(escalation);

    this.eventEmitter.emit('blocker.escalated', {
      blockerId: id,
      projectId: blocker.project_id,
      escalationLevel: blocker.escalation_level,
      toUnitId,
    });

    return saved;
  }

  async findOpenByGovernmentUnit(unitId: string): Promise<ProjectBlocker[]> {
    return this.blockerRepo.find({
      where: {
        owner_government_unit_id: unitId,
        status: 'open',
      },
      relations: ['project', 'milestone'],
      order: { opened_at: 'DESC' },
    });
  }
}
