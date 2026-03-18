import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Project } from '../../entities/project.entity';
import { ProjectMilestone } from '../../entities/project-milestone.entity';
import { GovernmentUnit } from '../../entities/government-unit.entity';
import { PaginatedResponse } from '../../common/dto/pagination.dto';
import { DomainEvents } from '../../common/constants/events';
import {
  ProjectStatus,
  MilestoneStatus,
} from '../../common/constants/enums';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { FilterProjectsDto } from './dto/filter-projects.dto';

/** Valid lifecycle transitions for project status. */
const VALID_TRANSITIONS: Record<string, string[]> = {
  [ProjectStatus.DRAFT]: [ProjectStatus.ACTIVE, ProjectStatus.CANCELLED],
  [ProjectStatus.ACTIVE]: [
    ProjectStatus.COMPLETED,
    ProjectStatus.SUSPENDED,
    ProjectStatus.CANCELLED,
  ],
  [ProjectStatus.SUSPENDED]: [ProjectStatus.ACTIVE, ProjectStatus.CANCELLED],
  // Terminal states - no outbound transitions
  [ProjectStatus.COMPLETED]: [],
  [ProjectStatus.CANCELLED]: [],
};

export interface ProgressBreakdown {
  progress: number;
  completedWeight: number;
  totalWeight: number;
  milestoneCount: number;
}

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectMilestone)
    private readonly milestoneRepo: Repository<ProjectMilestone>,
    @InjectRepository(GovernmentUnit)
    private readonly govUnitRepo: Repository<GovernmentUnit>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ---------------------------------------------------------------------------
  // List projects with filters + pagination
  // ---------------------------------------------------------------------------
  async findAll(filters: FilterProjectsDto): Promise<PaginatedResponse<Project>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const qb = this.projectRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.government_unit', 'gu')
      .leftJoinAndSelect('p.region', 'r');

    if (filters.status) {
      qb.andWhere('p.status = :status', { status: filters.status });
    }

    if (filters.governmentUnitId) {
      qb.andWhere('p.government_unit_id = :guId', {
        guId: filters.governmentUnitId,
      });
    }

    if (filters.regionId) {
      qb.andWhere('p.region_id = :regionId', { regionId: filters.regionId });
    }

    if (filters.search) {
      qb.andWhere(
        '(p.title ILIKE :search OR p.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    qb.orderBy('p.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return new PaginatedResponse(data, total, page, limit);
  }

  // ---------------------------------------------------------------------------
  // Get single project with full relations
  // ---------------------------------------------------------------------------
  async findOne(id: string): Promise<Project> {
    const project = await this.projectRepo.findOne({
      where: { id },
      relations: [
        'milestones',
        'blockers',
        'government_unit',
        'region',
        'creator',
      ],
    });

    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    return project;
  }

  // ---------------------------------------------------------------------------
  // Create project
  // ---------------------------------------------------------------------------
  async create(dto: CreateProjectDto, userId: string): Promise<Project> {
    const slug = this.generateSlug(dto.title);

    // Check slug uniqueness
    const existing = await this.projectRepo.findOne({ where: { slug } });
    if (existing) {
      throw new ConflictException(
        `A project with a similar title already exists (slug: ${slug})`,
      );
    }

    const project = this.projectRepo.create({
      title: dto.title,
      slug,
      description: dto.description ?? null,
      government_unit_id: dto.governmentUnitId,
      region_id: dto.regionId ?? null,
      priority: dto.priority ?? 'medium',
      start_date: dto.startDate ?? null,
      target_end_date: dto.targetEndDate ?? null,
      public_visibility: dto.publicVisibility ?? 'public',
      status: ProjectStatus.DRAFT,
      current_progress_percent_cached: 0,
      created_by: userId,
    });

    const saved = await this.projectRepo.save(project);

    this.eventEmitter.emit(DomainEvents.PROJECT_CREATED, {
      projectId: saved.id,
      userId,
    });

    return saved;
  }

  // ---------------------------------------------------------------------------
  // Update project
  // ---------------------------------------------------------------------------
  async update(
    id: string,
    dto: UpdateProjectDto,
    userId: string,
  ): Promise<Project> {
    const project = await this.findOne(id);

    if (dto.title !== undefined) {
      project.title = dto.title;
      project.slug = this.generateSlug(dto.title);
      // Check slug uniqueness if title changed
      const existing = await this.projectRepo.findOne({
        where: { slug: project.slug },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `A project with a similar title already exists (slug: ${project.slug})`,
        );
      }
    }

    if (dto.description !== undefined) project.description = dto.description;
    if (dto.governmentUnitId !== undefined)
      project.government_unit_id = dto.governmentUnitId;
    if (dto.regionId !== undefined) project.region_id = dto.regionId;
    if (dto.priority !== undefined) project.priority = dto.priority;
    if (dto.startDate !== undefined) project.start_date = dto.startDate;
    if (dto.targetEndDate !== undefined)
      project.target_end_date = dto.targetEndDate;
    if (dto.publicVisibility !== undefined)
      project.public_visibility = dto.publicVisibility;

    const saved = await this.projectRepo.save(project);

    this.eventEmitter.emit(DomainEvents.PROJECT_UPDATED, {
      projectId: saved.id,
      userId,
    });

    return saved;
  }

  // ---------------------------------------------------------------------------
  // Status lifecycle transitions
  // ---------------------------------------------------------------------------
  async updateStatus(
    id: string,
    newStatus: ProjectStatus,
    userId: string,
  ): Promise<Project> {
    const project = await this.findOne(id);
    const currentStatus = project.status as ProjectStatus;

    const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from "${currentStatus}" to "${newStatus}". ` +
          `Allowed transitions: ${allowed.join(', ') || 'none (terminal state)'}`,
      );
    }

    const oldStatus = project.status;
    project.status = newStatus;

    // Set actual_end_date when completing
    if (newStatus === ProjectStatus.COMPLETED) {
      project.actual_end_date = new Date().toISOString().split('T')[0];
    }

    const saved = await this.projectRepo.save(project);

    // Recalculate progress on status change
    await this.recalculateAndSave(id);

    this.eventEmitter.emit(DomainEvents.PROJECT_STATUS_CHANGED, {
      projectId: saved.id,
      oldStatus,
      newStatus,
      userId,
    });

    return this.findOne(id);
  }

  // ---------------------------------------------------------------------------
  // CORE: Calculate progress from milestone weights
  // progress = sum(completed_milestone_weights) / sum(active_milestone_weights)
  // Cancelled milestones excluded from both. Blocked milestones don't count as complete.
  // ---------------------------------------------------------------------------
  async calculateProgress(projectId: string): Promise<ProgressBreakdown> {
    const milestones = await this.milestoneRepo.find({
      where: { project_id: projectId },
    });

    // Filter out cancelled milestones entirely
    const activeMilestones = milestones.filter(
      (m) => m.status !== MilestoneStatus.CANCELLED,
    );

    if (activeMilestones.length === 0) {
      return {
        progress: 0,
        completedWeight: 0,
        totalWeight: 0,
        milestoneCount: 0,
      };
    }

    const totalWeight = activeMilestones.reduce(
      (sum, m) => sum + Number(m.weight_percent),
      0,
    );

    // Only completed milestones contribute to progress.
    // Blocked milestones do NOT count as complete.
    const completedWeight = activeMilestones
      .filter((m) => m.status === MilestoneStatus.COMPLETED)
      .reduce((sum, m) => sum + Number(m.weight_percent), 0);

    const progress =
      totalWeight > 0
        ? Math.round((completedWeight / totalWeight) * 10000) / 100
        : 0;

    return {
      progress,
      completedWeight,
      totalWeight,
      milestoneCount: activeMilestones.length,
    };
  }

  // ---------------------------------------------------------------------------
  // Recalculate and persist cached progress
  // ---------------------------------------------------------------------------
  async recalculateAndSave(projectId: string): Promise<Project> {
    const breakdown = await this.calculateProgress(projectId);

    await this.projectRepo.update(projectId, {
      current_progress_percent_cached: breakdown.progress,
    });

    return this.findOne(projectId);
  }

  // ---------------------------------------------------------------------------
  // Find projects by government unit (optionally including descendants)
  // ---------------------------------------------------------------------------
  async findByGovernmentUnit(
    unitId: string,
    includeDescendants = false,
  ): Promise<Project[]> {
    let unitIds = [unitId];

    if (includeDescendants) {
      unitIds = await this.collectDescendantIds(unitId);
    }

    return this.projectRepo.find({
      where: { government_unit_id: In(unitIds) },
      relations: ['government_unit', 'region'],
      order: { created_at: 'DESC' },
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Generate a URL-safe slug from the project title.
   * Handles Nepali / Devanagari characters gracefully by falling back to
   * transliteration-free kebab-case of the ASCII portion, appended with a
   * short random suffix to reduce collision likelihood.
   */
  private generateSlug(title: string): string {
    const base = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // strip non-word chars (keeps alphanumeric, spaces, hyphens)
      .replace(/[\s_]+/g, '-') // spaces/underscores -> hyphens
      .replace(/-+/g, '-') // collapse consecutive hyphens
      .replace(/^-|-$/g, ''); // trim leading/trailing hyphens

    const suffix = Math.random().toString(36).substring(2, 8);
    return base ? `${base}-${suffix}` : suffix;
  }

  /**
   * Recursively collect all descendant government unit IDs using a BFS
   * (breadth-first search) approach. Includes the root unit itself.
   */
  private async collectDescendantIds(rootId: string): Promise<string[]> {
    const ids: string[] = [rootId];
    const queue: string[] = [rootId];

    while (queue.length > 0) {
      const parentId = queue.shift()!;
      const children = await this.govUnitRepo.find({
        where: { parent_id: parentId },
        select: ['id'],
      });

      for (const child of children) {
        ids.push(child.id);
        queue.push(child.id);
      }
    }

    return ids;
  }
}
