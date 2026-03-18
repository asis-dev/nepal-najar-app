import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProjectsService, ProgressBreakdown } from './projects.service';
import { Project } from '../../entities/project.entity';
import { ProjectMilestone } from '../../entities/project-milestone.entity';
import { GovernmentUnit } from '../../entities/government-unit.entity';
import { MilestoneStatus } from '../../common/constants/enums';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let milestoneRepo: Record<string, jest.Mock>;

  const mockProjectRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockMilestoneRepo = {
    find: jest.fn(),
  };

  const mockGovUnitRepo = {
    find: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: getRepositoryToken(Project), useValue: mockProjectRepo },
        { provide: getRepositoryToken(ProjectMilestone), useValue: mockMilestoneRepo },
        { provide: getRepositoryToken(GovernmentUnit), useValue: mockGovUnitRepo },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    milestoneRepo = mockMilestoneRepo;
  });

  describe('calculateProgress', () => {
    const projectId = 'project-uuid-1';

    it('should return 0% when no milestones exist', async () => {
      milestoneRepo.find.mockResolvedValue([]);

      const result: ProgressBreakdown = await service.calculateProgress(projectId);

      expect(result.progress).toBe(0);
      expect(result.completedWeight).toBe(0);
      expect(result.totalWeight).toBe(0);
      expect(result.milestoneCount).toBe(0);
    });

    it('should return 0% when all milestones are pending', async () => {
      milestoneRepo.find.mockResolvedValue([
        { id: 'm1', status: MilestoneStatus.PENDING, weight_percent: 30 },
        { id: 'm2', status: MilestoneStatus.PENDING, weight_percent: 70 },
      ]);

      const result = await service.calculateProgress(projectId);

      expect(result.progress).toBe(0);
      expect(result.completedWeight).toBe(0);
      expect(result.totalWeight).toBe(100);
      expect(result.milestoneCount).toBe(2);
    });

    it('should return 100% when all milestones are completed', async () => {
      milestoneRepo.find.mockResolvedValue([
        { id: 'm1', status: MilestoneStatus.COMPLETED, weight_percent: 40 },
        { id: 'm2', status: MilestoneStatus.COMPLETED, weight_percent: 60 },
      ]);

      const result = await service.calculateProgress(projectId);

      expect(result.progress).toBe(100);
      expect(result.completedWeight).toBe(100);
      expect(result.totalWeight).toBe(100);
      expect(result.milestoneCount).toBe(2);
    });

    it('should correctly calculate weighted progress with mixed statuses', async () => {
      // 3 milestones: weights 20, 30, 50. First two completed = 50/100 = 50%
      milestoneRepo.find.mockResolvedValue([
        { id: 'm1', status: MilestoneStatus.COMPLETED, weight_percent: 20 },
        { id: 'm2', status: MilestoneStatus.COMPLETED, weight_percent: 30 },
        { id: 'm3', status: MilestoneStatus.PENDING, weight_percent: 50 },
      ]);

      const result = await service.calculateProgress(projectId);

      expect(result.progress).toBe(50);
      expect(result.completedWeight).toBe(50);
      expect(result.totalWeight).toBe(100);
      expect(result.milestoneCount).toBe(3);
    });

    it('should exclude cancelled milestones from both numerator and denominator', async () => {
      // Weights: 20 (completed), 30 (cancelled), 50 (pending)
      // Active total = 20 + 50 = 70, completed = 20
      // Progress = 20/70 * 100 = 28.57%
      milestoneRepo.find.mockResolvedValue([
        { id: 'm1', status: MilestoneStatus.COMPLETED, weight_percent: 20 },
        { id: 'm2', status: MilestoneStatus.CANCELLED, weight_percent: 30 },
        { id: 'm3', status: MilestoneStatus.PENDING, weight_percent: 50 },
      ]);

      const result = await service.calculateProgress(projectId);

      expect(result.progress).toBe(28.57);
      expect(result.completedWeight).toBe(20);
      expect(result.totalWeight).toBe(70);
      expect(result.milestoneCount).toBe(2);
    });

    it('should NOT count blocked milestones as completed', async () => {
      // Blocked milestone is in denominator but not in numerator
      milestoneRepo.find.mockResolvedValue([
        { id: 'm1', status: MilestoneStatus.COMPLETED, weight_percent: 25 },
        { id: 'm2', status: MilestoneStatus.BLOCKED, weight_percent: 25 },
        { id: 'm3', status: MilestoneStatus.PENDING, weight_percent: 50 },
      ]);

      const result = await service.calculateProgress(projectId);

      // Total weight = 100, completed = 25, progress = 25%
      expect(result.progress).toBe(25);
      expect(result.completedWeight).toBe(25);
      expect(result.totalWeight).toBe(100);
      expect(result.milestoneCount).toBe(3);
    });

    it('should handle milestones with different weights correctly', async () => {
      milestoneRepo.find.mockResolvedValue([
        { id: 'm1', status: MilestoneStatus.COMPLETED, weight_percent: 10 },
        { id: 'm2', status: MilestoneStatus.COMPLETED, weight_percent: 5 },
        { id: 'm3', status: MilestoneStatus.IN_PROGRESS, weight_percent: 35 },
        { id: 'm4', status: MilestoneStatus.PENDING, weight_percent: 50 },
      ]);

      const result = await service.calculateProgress(projectId);

      // completed = 15, total = 100, progress = 15%
      expect(result.progress).toBe(15);
      expect(result.completedWeight).toBe(15);
      expect(result.totalWeight).toBe(100);
      expect(result.milestoneCount).toBe(4);
    });

    it('should return 0% when all milestones are cancelled', async () => {
      milestoneRepo.find.mockResolvedValue([
        { id: 'm1', status: MilestoneStatus.CANCELLED, weight_percent: 50 },
        { id: 'm2', status: MilestoneStatus.CANCELLED, weight_percent: 50 },
      ]);

      const result = await service.calculateProgress(projectId);

      expect(result.progress).toBe(0);
      expect(result.completedWeight).toBe(0);
      expect(result.totalWeight).toBe(0);
      expect(result.milestoneCount).toBe(0);
    });

    it('should handle decimal weight_percent values', async () => {
      milestoneRepo.find.mockResolvedValue([
        { id: 'm1', status: MilestoneStatus.COMPLETED, weight_percent: '33.33' },
        { id: 'm2', status: MilestoneStatus.PENDING, weight_percent: '33.33' },
        { id: 'm3', status: MilestoneStatus.PENDING, weight_percent: '33.34' },
      ]);

      const result = await service.calculateProgress(projectId);

      // completed = 33.33, total = 100, progress = 33.33%
      expect(result.progress).toBe(33.33);
      expect(result.completedWeight).toBeCloseTo(33.33, 2);
      expect(result.totalWeight).toBe(100);
    });

    it('should query milestones with the correct project_id', async () => {
      milestoneRepo.find.mockResolvedValue([]);

      await service.calculateProgress(projectId);

      expect(milestoneRepo.find).toHaveBeenCalledWith({
        where: { project_id: projectId },
      });
    });
  });
});
