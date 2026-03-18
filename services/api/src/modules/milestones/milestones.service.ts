import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProjectMilestone } from '../../entities/project-milestone.entity';
import { Project } from '../../entities/project.entity';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';

@Injectable()
export class MilestonesService {
  constructor(
    @InjectRepository(ProjectMilestone)
    private readonly milestoneRepo: Repository<ProjectMilestone>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(params?: { status?: string }): Promise<ProjectMilestone[]> {
    const where: any = {};
    if (params?.status) where.status = params.status;
    return this.milestoneRepo.find({
      where,
      relations: ['project'],
      order: { due_date: 'ASC' },
      take: 200,
    });
  }

  async findByProject(projectId: string): Promise<ProjectMilestone[]> {
    return this.milestoneRepo.find({
      where: { project_id: projectId },
      order: { sequence_number: 'ASC' },
    });
  }

  async findOne(id: string): Promise<ProjectMilestone> {
    const milestone = await this.milestoneRepo.findOne({
      where: { id },
      relations: ['project'],
    });
    if (!milestone) {
      throw new NotFoundException(`Milestone ${id} not found`);
    }
    return milestone;
  }

  async create(
    projectId: string,
    dto: CreateMilestoneDto,
    userId: string,
  ): Promise<ProjectMilestone> {
    // Verify project exists
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    // Auto-assign next sequence number
    const maxResult = await this.milestoneRepo
      .createQueryBuilder('m')
      .select('COALESCE(MAX(m.sequence_number), 0)', 'max')
      .where('m.project_id = :projectId', { projectId })
      .getRawOne();

    const nextSequence = (maxResult?.max ?? 0) + 1;

    const milestone = this.milestoneRepo.create({
      project_id: projectId,
      title: dto.title,
      description: dto.description ?? null,
      weight_percent: dto.weightPercent,
      sequence_number: nextSequence,
      due_date: dto.dueDate ?? null,
      requires_evidence: dto.requiresEvidence ?? false,
      status: 'pending',
    });

    const saved = await this.milestoneRepo.save(milestone);
    await this.recalculateProjectProgress(projectId);
    return saved;
  }

  async update(id: string, dto: UpdateMilestoneDto): Promise<ProjectMilestone> {
    const milestone = await this.findOne(id);

    if (dto.title !== undefined) milestone.title = dto.title;
    if (dto.description !== undefined) milestone.description = dto.description ?? null;
    if (dto.weightPercent !== undefined) milestone.weight_percent = dto.weightPercent;
    if (dto.dueDate !== undefined) milestone.due_date = dto.dueDate ?? null;
    if (dto.requiresEvidence !== undefined) milestone.requires_evidence = dto.requiresEvidence;

    const saved = await this.milestoneRepo.save(milestone);
    await this.recalculateProjectProgress(milestone.project_id);
    return saved;
  }

  async updateStatus(id: string, status: string): Promise<ProjectMilestone> {
    const validStatuses = ['pending', 'in_progress', 'completed', 'blocked', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new NotFoundException(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    const milestone = await this.findOne(id);
    milestone.status = status;

    if (status === 'completed') {
      milestone.completion_date = new Date().toISOString().split('T')[0];
    } else {
      milestone.completion_date = null;
    }

    const saved = await this.milestoneRepo.save(milestone);
    await this.recalculateProjectProgress(milestone.project_id);

    this.eventEmitter.emit('milestone.status_changed', {
      milestoneId: id,
      projectId: milestone.project_id,
      status,
    });

    return saved;
  }

  async reorder(projectId: string, milestoneIds: string[]): Promise<ProjectMilestone[]> {
    // Verify project exists
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    // Update sequence numbers based on the provided order
    const updates = milestoneIds.map((milestoneId, index) =>
      this.milestoneRepo.update(
        { id: milestoneId, project_id: projectId },
        { sequence_number: index + 1 },
      ),
    );

    await Promise.all(updates);

    return this.findByProject(projectId);
  }

  async delete(id: string): Promise<void> {
    const milestone = await this.findOne(id);
    const projectId = milestone.project_id;

    await this.milestoneRepo.remove(milestone);
    await this.recalculateProjectProgress(projectId);
  }

  /**
   * Recalculate the cached progress percentage on the project
   * based on completed milestones weighted by weight_percent.
   */
  private async recalculateProjectProgress(projectId: string): Promise<void> {
    const milestones = await this.milestoneRepo.find({
      where: { project_id: projectId },
    });

    if (milestones.length === 0) {
      await this.projectRepo.update(projectId, {
        current_progress_percent_cached: 0,
      });
      return;
    }

    const totalWeight = milestones.reduce(
      (sum, m) => sum + Number(m.weight_percent),
      0,
    );

    if (totalWeight === 0) {
      await this.projectRepo.update(projectId, {
        current_progress_percent_cached: 0,
      });
      return;
    }

    const completedWeight = milestones
      .filter((m) => m.status === 'completed')
      .reduce((sum, m) => sum + Number(m.weight_percent), 0);

    const progress = parseFloat(
      ((completedWeight / totalWeight) * 100).toFixed(2),
    );

    await this.projectRepo.update(projectId, {
      current_progress_percent_cached: progress,
    });

    this.eventEmitter.emit('project.progress_recalculated', {
      projectId,
      progress,
    });
  }
}
