import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException } from '@nestjs/common';
import { MilestonesService } from './milestones.service';
import { ProjectMilestone } from '../../entities/project-milestone.entity';
import { Project } from '../../entities/project.entity';

describe('MilestonesService', () => {
  let service: MilestonesService;
  let milestoneRepo: Record<string, jest.Mock>;
  let projectRepo: Record<string, jest.Mock>;
  let eventEmitter: Record<string, jest.Mock>;

  beforeEach(async () => {
    milestoneRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 'new-milestone-id', ...entity })),
      update: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
    };

    projectRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilestonesService,
        { provide: getRepositoryToken(ProjectMilestone), useValue: milestoneRepo },
        { provide: getRepositoryToken(Project), useValue: projectRepo },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<MilestonesService>(MilestonesService);
  });

  describe('create', () => {
    it('should auto-assign next sequence number', async () => {
      const projectId = 'project-1';
      const dto = { title: 'New Milestone', weightPercent: 25 };

      projectRepo.findOne.mockResolvedValue({ id: projectId });

      // Mock the query builder chain for max sequence_number
      const qbMock = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ max: 3 }),
      };
      milestoneRepo.createQueryBuilder.mockReturnValue(qbMock);

      // After create, recalculateProjectProgress calls find + projectRepo.update
      milestoneRepo.find.mockResolvedValue([]);

      await service.create(projectId, dto as any, 'user-1');

      // The created milestone should have sequence_number = 4 (max 3 + 1)
      expect(milestoneRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ sequence_number: 4 }),
      );
    });

    it('should assign sequence_number 1 when no milestones exist', async () => {
      const projectId = 'project-1';
      const dto = { title: 'First Milestone', weightPercent: 100 };

      projectRepo.findOne.mockResolvedValue({ id: projectId });

      const qbMock = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ max: 0 }),
      };
      milestoneRepo.createQueryBuilder.mockReturnValue(qbMock);

      milestoneRepo.find.mockResolvedValue([]);

      await service.create(projectId, dto as any, 'user-1');

      expect(milestoneRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ sequence_number: 1 }),
      );
    });

    it('should throw NotFoundException if project does not exist', async () => {
      projectRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create('non-existent', { title: 'X', weightPercent: 10 } as any, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    const baseMilestone = {
      id: 'ms-1',
      project_id: 'project-1',
      title: 'Milestone 1',
      status: 'pending',
      completion_date: null,
      weight_percent: 50,
      project: { id: 'project-1' },
    };

    beforeEach(() => {
      // recalculateProjectProgress internals
      milestoneRepo.find.mockResolvedValue([]);
    });

    it('should set completion_date when completing a milestone', async () => {
      milestoneRepo.findOne.mockResolvedValue({ ...baseMilestone });

      const result = await service.updateStatus('ms-1', 'completed');

      // The save call should include a completion_date
      const savedEntity = milestoneRepo.save.mock.calls[0][0];
      expect(savedEntity.status).toBe('completed');
      expect(savedEntity.completion_date).toBeDefined();
      expect(savedEntity.completion_date).not.toBeNull();
      // Should be a date string in YYYY-MM-DD format
      expect(savedEntity.completion_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should clear completion_date when changing back from completed', async () => {
      milestoneRepo.findOne.mockResolvedValue({
        ...baseMilestone,
        status: 'completed',
        completion_date: '2026-01-15',
      });

      await service.updateStatus('ms-1', 'in_progress');

      const savedEntity = milestoneRepo.save.mock.calls[0][0];
      expect(savedEntity.status).toBe('in_progress');
      expect(savedEntity.completion_date).toBeNull();
    });

    it('should reject invalid status values', async () => {
      // The service throws NotFoundException for invalid statuses (per source code)
      await expect(
        service.updateStatus('ms-1', 'invalid_status'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should trigger progress recalculation after status change', async () => {
      milestoneRepo.findOne.mockResolvedValue({ ...baseMilestone });

      await service.updateStatus('ms-1', 'completed');

      // recalculateProjectProgress calls milestoneRepo.find and projectRepo.update
      expect(milestoneRepo.find).toHaveBeenCalledWith({
        where: { project_id: baseMilestone.project_id },
      });
      expect(projectRepo.update).toHaveBeenCalled();
    });

    it('should emit milestone.status_changed event', async () => {
      milestoneRepo.findOne.mockResolvedValue({ ...baseMilestone });

      await service.updateStatus('ms-1', 'in_progress');

      expect(eventEmitter.emit).toHaveBeenCalledWith('milestone.status_changed', {
        milestoneId: 'ms-1',
        projectId: baseMilestone.project_id,
        status: 'in_progress',
      });
    });

    it('should accept all valid status values', async () => {
      const validStatuses = ['pending', 'in_progress', 'completed', 'blocked', 'cancelled'];

      for (const status of validStatuses) {
        jest.clearAllMocks();
        milestoneRepo.findOne.mockResolvedValue({ ...baseMilestone });
        milestoneRepo.find.mockResolvedValue([]);

        await expect(
          service.updateStatus('ms-1', status),
        ).resolves.toBeDefined();
      }
    });
  });
});
