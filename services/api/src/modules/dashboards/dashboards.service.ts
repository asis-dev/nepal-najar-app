import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../entities/project.entity';
import { ProjectMilestone } from '../../entities/project-milestone.entity';
import { ProjectBlocker } from '../../entities/project-blocker.entity';
import { GovernmentUnit } from '../../entities/government-unit.entity';
import { Region } from '../../entities/region.entity';

@Injectable()
export class DashboardsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectMilestone)
    private readonly milestoneRepo: Repository<ProjectMilestone>,
    @InjectRepository(ProjectBlocker)
    private readonly blockerRepo: Repository<ProjectBlocker>,
    @InjectRepository(GovernmentUnit)
    private readonly govUnitRepo: Repository<GovernmentUnit>,
    @InjectRepository(Region)
    private readonly regionRepo: Repository<Region>,
  ) {}

  async getNationalDashboard() {
    const totalProjects = await this.projectRepo.count();

    const activeProjects = await this.projectRepo.count({
      where: { status: 'active' },
    });

    const completedProjects = await this.projectRepo.count({
      where: { status: 'completed' },
    });

    const avgResult = await this.projectRepo
      .createQueryBuilder('p')
      .select('AVG(p.current_progress_percent_cached)', 'avg')
      .where('p.status = :status', { status: 'active' })
      .getRawOne();
    const averageProgress = parseFloat(avgResult?.avg ?? '0');

    const totalOpenBlockers = await this.blockerRepo.count({
      where: { status: 'open' },
    });

    const criticalBlockers = await this.blockerRepo
      .createQueryBuilder('b')
      .where('b.status = :status', { status: 'open' })
      .andWhere('b.severity = :severity', { severity: 'critical' })
      .getCount();

    // Status breakdown as object for frontend pie chart
    const projectsByStatusRaw = await this.projectRepo
      .createQueryBuilder('p')
      .select('p.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('p.status')
      .getRawMany();

    const statusBreakdown: Record<string, number> = {};
    for (const row of projectsByStatusRaw) {
      statusBreakdown[row.status] = row.count;
    }

    // Ministry breakdown — group by government unit for bar chart
    const ministryBreakdownRaw = await this.projectRepo
      .createQueryBuilder('p')
      .innerJoin('p.government_unit', 'gu')
      .select('gu.name', 'name')
      .addSelect('COUNT(*)::int', 'projects')
      .addSelect('ROUND(AVG(p.current_progress_percent_cached)::numeric, 1)', 'progress')
      .groupBy('gu.name')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10)
      .getRawMany();

    const ministryBreakdown = ministryBreakdownRaw.map((m: any) => ({
      name: m.name.length > 30 ? m.name.substring(0, 27) + '...' : m.name,
      projects: m.projects,
      progress: parseFloat(m.progress) || 0,
    }));

    // Delayed projects list with details
    const delayedProjectsRaw = await this.projectRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.government_unit', 'gu')
      .where('p.status = :status', { status: 'active' })
      .andWhere('p.target_end_date < NOW()')
      .orderBy('p.target_end_date', 'ASC')
      .take(10)
      .getMany();

    const delayedProjects = delayedProjectsRaw.map((p) => {
      const now = new Date();
      const targetEnd = p.target_end_date ? new Date(p.target_end_date) : now;
      const daysDelayed = Math.max(
        0,
        Math.ceil((now.getTime() - targetEnd.getTime()) / (1000 * 60 * 60 * 24)),
      );
      return {
        id: p.id,
        title: p.title,
        government_unit: p.government_unit ? { name: p.government_unit.name } : undefined,
        progress: Number(p.current_progress_percent_cached),
        days_delayed: daysDelayed,
      };
    });

    // Region breakdown for heatmap
    const regionBreakdownRaw = await this.projectRepo
      .createQueryBuilder('p')
      .innerJoin('p.region', 'r')
      .select('r.name', 'name')
      .addSelect('COUNT(*)::int', 'total')
      .addSelect(
        `SUM(CASE WHEN p.status = 'active' AND p.target_end_date < NOW() THEN 1 ELSE 0 END)::int`,
        'delayed',
      )
      .groupBy('r.name')
      .orderBy('total', 'DESC')
      .getRawMany();

    const regionBreakdown = regionBreakdownRaw.map((r: any) => {
      const ratio = r.total > 0 ? r.delayed / r.total : 0;
      let severity = 'low';
      if (ratio > 0.5) severity = 'critical';
      else if (ratio > 0.3) severity = 'high';
      else if (ratio > 0.1) severity = 'medium';
      return { name: r.name, total: r.total, delayed: r.delayed, severity };
    });

    const recentCompletions = await this.projectRepo.find({
      where: { status: 'completed' },
      order: { updated_at: 'DESC' },
      take: 5,
      select: ['id', 'title', 'slug', 'current_progress_percent_cached', 'updated_at'],
    });

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      averageProgress: Math.round(averageProgress * 100) / 100,
      totalOpenBlockers,
      criticalBlockers,
      statusBreakdown,
      ministryBreakdown,
      delayedProjects,
      regionBreakdown,
      recentCompletions,
    };
  }

  async getMinistryDashboard(ministryUnitId: string) {
    // Find all descendant government_unit_ids (ministry -> departments -> branches, etc.)
    const descendantIds = await this.findDescendantUnitIds(ministryUnitId);
    const allUnitIds = [ministryUnitId, ...descendantIds];

    const totalProjects = await this.projectRepo
      .createQueryBuilder('p')
      .where('p.government_unit_id IN (:...ids)', { ids: allUnitIds })
      .getCount();

    const activeProjects = await this.projectRepo
      .createQueryBuilder('p')
      .where('p.government_unit_id IN (:...ids)', { ids: allUnitIds })
      .andWhere('p.status = :status', { status: 'active' })
      .getCount();

    const completedProjects = await this.projectRepo
      .createQueryBuilder('p')
      .where('p.government_unit_id IN (:...ids)', { ids: allUnitIds })
      .andWhere('p.status = :status', { status: 'completed' })
      .getCount();

    const delayedProjects = await this.projectRepo
      .createQueryBuilder('p')
      .where('p.government_unit_id IN (:...ids)', { ids: allUnitIds })
      .andWhere('p.status = :status', { status: 'active' })
      .andWhere('p.target_end_date < NOW()')
      .getCount();

    const avgResult = await this.projectRepo
      .createQueryBuilder('p')
      .select('AVG(p.current_progress_percent_cached)', 'avg')
      .where('p.government_unit_id IN (:...ids)', { ids: allUnitIds })
      .andWhere('p.status = :status', { status: 'active' })
      .getRawOne();
    const averageProgress = parseFloat(avgResult?.avg ?? '0');

    const totalOpenBlockers = await this.blockerRepo
      .createQueryBuilder('b')
      .innerJoin('b.project', 'p')
      .where('p.government_unit_id IN (:...ids)', { ids: allUnitIds })
      .andWhere('b.status = :status', { status: 'open' })
      .getCount();

    const criticalBlockers = await this.blockerRepo
      .createQueryBuilder('b')
      .innerJoin('b.project', 'p')
      .where('p.government_unit_id IN (:...ids)', { ids: allUnitIds })
      .andWhere('b.status = :status', { status: 'open' })
      .andWhere('b.severity = :severity', { severity: 'critical' })
      .getCount();

    const projectsByStatus = await this.projectRepo
      .createQueryBuilder('p')
      .select('p.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .where('p.government_unit_id IN (:...ids)', { ids: allUnitIds })
      .groupBy('p.status')
      .getRawMany();

    const recentCompletions = await this.projectRepo
      .createQueryBuilder('p')
      .where('p.government_unit_id IN (:...ids)', { ids: allUnitIds })
      .andWhere('p.status = :status', { status: 'completed' })
      .orderBy('p.updated_at', 'DESC')
      .take(5)
      .select(['p.id', 'p.title', 'p.slug', 'p.current_progress_percent_cached', 'p.updated_at'])
      .getMany();

    return {
      ministryUnitId,
      totalProjects,
      activeProjects,
      completedProjects,
      delayedProjects,
      averageProgress: Math.round(averageProgress * 100) / 100,
      totalOpenBlockers,
      criticalBlockers,
      projectsByStatus,
      recentCompletions,
    };
  }

  async getDistrictDashboard(regionId: string) {
    const region = await this.regionRepo.findOne({ where: { id: regionId } });
    if (!region) {
      throw new NotFoundException(`Region ${regionId} not found`);
    }

    const totalProjects = await this.projectRepo.count({
      where: { region_id: regionId },
    });

    const activeProjects = await this.projectRepo
      .createQueryBuilder('p')
      .where('p.region_id = :regionId', { regionId })
      .andWhere('p.status = :status', { status: 'active' })
      .getCount();

    const delayedProjects = await this.projectRepo
      .createQueryBuilder('p')
      .where('p.region_id = :regionId', { regionId })
      .andWhere('p.status = :status', { status: 'active' })
      .andWhere('p.target_end_date < NOW()')
      .getCount();

    const avgResult = await this.projectRepo
      .createQueryBuilder('p')
      .select('AVG(p.current_progress_percent_cached)', 'avg')
      .where('p.region_id = :regionId', { regionId })
      .andWhere('p.status = :status', { status: 'active' })
      .getRawOne();
    const averageProgress = parseFloat(avgResult?.avg ?? '0');

    const totalOpenBlockers = await this.blockerRepo
      .createQueryBuilder('b')
      .innerJoin('b.project', 'p')
      .where('p.region_id = :regionId', { regionId })
      .andWhere('b.status = :status', { status: 'open' })
      .getCount();

    const recentUpdates = await this.projectRepo.find({
      where: { region_id: regionId },
      order: { last_official_update_at: 'DESC' },
      take: 10,
      select: ['id', 'title', 'slug', 'status', 'current_progress_percent_cached', 'last_official_update_at'],
    });

    return {
      regionId,
      regionName: region.name,
      regionType: region.type,
      totalProjects,
      activeProjects,
      delayedProjects,
      averageProgress: Math.round(averageProgress * 100) / 100,
      totalOpenBlockers,
      recentUpdates,
    };
  }

  async getProjectSummary(projectId: string) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      select: [
        'id', 'title', 'slug', 'description', 'status', 'priority',
        'start_date', 'target_end_date', 'actual_end_date',
        'current_progress_percent_cached', 'last_official_update_at',
        'created_at', 'updated_at',
      ],
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const totalMilestones = await this.milestoneRepo.count({
      where: { project_id: projectId },
    });

    const completedMilestones = await this.milestoneRepo.count({
      where: { project_id: projectId, status: 'completed' },
    });

    const blockedMilestones = await this.milestoneRepo.count({
      where: { project_id: projectId, status: 'blocked' },
    });

    const openBlockers = await this.blockerRepo.count({
      where: { project_id: projectId, status: 'open' },
    });

    const escalatedBlockers = await this.blockerRepo.count({
      where: { project_id: projectId, status: 'escalated' },
    });

    const resolvedBlockers = await this.blockerRepo.count({
      where: { project_id: projectId, status: 'resolved' },
    });

    const now = new Date();
    const targetEnd = project.target_end_date ? new Date(project.target_end_date) : null;
    const daysUntilDeadline = targetEnd
      ? Math.ceil((targetEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const isDelayed = project.status === 'active' && targetEnd !== null && targetEnd < now;

    return {
      project,
      milestones: {
        total: totalMilestones,
        completed: completedMilestones,
        blocked: blockedMilestones,
      },
      blockers: {
        open: openBlockers,
        escalated: escalatedBlockers,
        resolved: resolvedBlockers,
      },
      progressPercent: Number(project.current_progress_percent_cached),
      daysUntilDeadline,
      isDelayed,
    };
  }

  async getOverviewStats() {
    const totalProjects = await this.projectRepo.count();

    const totalActive = await this.projectRepo.count({
      where: { status: 'active' },
    });

    const totalCompleted = await this.projectRepo.count({
      where: { status: 'completed' },
    });

    const avgResult = await this.projectRepo
      .createQueryBuilder('p')
      .select('AVG(p.current_progress_percent_cached)', 'avg')
      .where('p.status IN (:...statuses)', { statuses: ['active', 'completed'] })
      .getRawOne();
    const overallProgress = parseFloat(avgResult?.avg ?? '0');

    const totalBlockers = await this.blockerRepo.count({
      where: { status: 'open' },
    });

    return {
      totalProjects,
      totalActive,
      totalCompleted,
      overallProgress: Math.round(overallProgress * 100) / 100,
      totalBlockers,
    };
  }

  /**
   * Recursively find all descendant government_unit_ids for a given parent.
   * Uses a recursive CTE for efficiency.
   */
  private async findDescendantUnitIds(parentId: string): Promise<string[]> {
    const result = await this.govUnitRepo.query(
      `
      WITH RECURSIVE descendants AS (
        SELECT id FROM government_units WHERE parent_id = $1
        UNION ALL
        SELECT gu.id FROM government_units gu
        INNER JOIN descendants d ON gu.parent_id = d.id
      )
      SELECT id FROM descendants
      `,
      [parentId],
    );
    return result.map((row: { id: string }) => row.id);
  }
}
