import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EvidenceService } from './evidence.service';
import { EvidenceAttachment } from '../../entities/evidence-attachment.entity';

// ── Mock S3 ─────────────────────────────────────────────────────────────────
const mockS3Send = jest.fn().mockResolvedValue({});

jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({ send: mockS3Send })),
    PutObjectCommand: jest.fn().mockImplementation((input) => ({ ...input, _type: 'PutObject' })),
    DeleteObjectCommand: jest.fn().mockImplementation((input) => ({ ...input, _type: 'DeleteObject' })),
    GetObjectCommand: jest.fn().mockImplementation((input) => ({ ...input, _type: 'GetObject' })),
    HeadBucketCommand: jest.fn(),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/signed-url'),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────
function makeFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'photo.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024 * 100, // 100 KB
    buffer: Buffer.from('fake'),
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
    ...overrides,
  };
}

const baseDto = {
  projectId: 'project-uuid-1',
  sourceType: 'official' as const,
};

const userId = 'user-uuid-1';

// ── Tests ───────────────────────────────────────────────────────────────────
describe('EvidenceService', () => {
  let service: EvidenceService;

  const mockRepo = {
    create: jest.fn().mockImplementation((data) => ({ id: 'ev-uuid', ...data })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity, id: entity.id ?? 'ev-uuid' })),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    remove: jest.fn().mockResolvedValue(undefined),
    createQueryBuilder: jest.fn(),
  };

  const mockConfig = {
    getOrThrow: jest.fn((key: string) => {
      const map: Record<string, string> = {
        S3_BUCKET: 'test-bucket',
        S3_ENDPOINT: 'http://localhost:9000',
        S3_ACCESS_KEY: 'minioadmin',
        S3_SECRET_KEY: 'minioadmin',
      };
      return map[key];
    }),
    get: jest.fn((_key: string, fallback: string) => fallback),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvidenceService,
        { provide: getRepositoryToken(EvidenceAttachment), useValue: mockRepo },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<EvidenceService>(EvidenceService);
  });

  // ── upload() ────────────────────────────────────────────────────────────

  describe('upload()', () => {
    it('should reject files over 25 MB', async () => {
      const bigFile = makeFile({ size: 26 * 1024 * 1024 });

      await expect(service.upload(bigFile, baseDto as any, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject disallowed MIME types', async () => {
      const exeFile = makeFile({ mimetype: 'application/exe' });

      await expect(service.upload(exeFile, baseDto as any, userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should accept a valid file (image/jpeg, under 25 MB), upload to S3, and save to DB', async () => {
      const file = makeFile();

      const result = await service.upload(file, baseDto as any, userId);

      // S3 was called
      expect(mockS3Send).toHaveBeenCalledTimes(1);
      // DB record was created and saved
      expect(mockRepo.create).toHaveBeenCalledTimes(1);
      expect(mockRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toHaveProperty('id');
      expect(result.project_id).toBe('project-uuid-1');
    });

    it('should set file_type to "image" for image/* MIME types', async () => {
      const file = makeFile({ mimetype: 'image/png', originalname: 'pic.png' });

      await service.upload(file, baseDto as any, userId);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ file_type: 'image' }),
      );
    });

    it('should set file_type to "video" for video/* MIME types', async () => {
      const file = makeFile({ mimetype: 'video/mp4', originalname: 'clip.mp4' });

      await service.upload(file, baseDto as any, userId);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ file_type: 'video' }),
      );
    });

    it('should set file_type to "document" for docx MIME types', async () => {
      const file = makeFile({
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        originalname: 'report.docx',
      });

      await service.upload(file, baseDto as any, userId);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ file_type: 'document' }),
      );
    });
  });

  // ── findByProject() ────────────────────────────────────────────────────

  describe('findByProject()', () => {
    it('should return paginated results', async () => {
      const items = [{ id: 'ev-1' }, { id: 'ev-2' }];
      mockRepo.findAndCount.mockResolvedValue([items, 2]);

      const result = await service.findByProject('project-uuid-1', { page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(1);
      expect(mockRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { project_id: 'project-uuid-1' },
          skip: 0,
          take: 10,
        }),
      );
    });
  });

  // ── findOne() ──────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('should throw NotFoundException for a missing ID', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── getPresignedUrl() ──────────────────────────────────────────────────

  describe('getPresignedUrl()', () => {
    it('should return a URL string', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'ev-1', file_url: 'evidence/p1/abc.jpg' });

      const result = await service.getPresignedUrl('ev-1');

      expect(result).toHaveProperty('url');
      expect(typeof result.url).toBe('string');
      expect(result.url).toContain('https://');
      expect(result).toHaveProperty('expiresIn', 3600);
    });
  });

  // ── delete() ───────────────────────────────────────────────────────────

  describe('delete()', () => {
    const record = {
      id: 'ev-1',
      uploaded_by: 'user-uuid-1',
      file_url: 'evidence/p1/abc.jpg',
    };

    it('should throw ForbiddenException if user is not the uploader and not admin', async () => {
      mockRepo.findOne.mockResolvedValue(record);

      await expect(service.delete('ev-1', 'other-user-uuid', [])).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow deletion by the uploader', async () => {
      mockRepo.findOne.mockResolvedValue(record);

      await expect(service.delete('ev-1', 'user-uuid-1', [])).resolves.toBeUndefined();
    });

    it('should remove from S3 and DB when deleted', async () => {
      mockRepo.findOne.mockResolvedValue(record);

      await service.delete('ev-1', 'user-uuid-1', []);

      // S3 delete
      expect(mockS3Send).toHaveBeenCalledTimes(1);
      // DB remove
      expect(mockRepo.remove).toHaveBeenCalledWith(record);
    });
  });

  // ── getStats() ─────────────────────────────────────────────────────────

  describe('getStats()', () => {
    it('should return grouped counts by file type', async () => {
      const mockQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { fileType: 'image', count: 5 },
          { fileType: 'pdf', count: 3 },
          { fileType: 'video', count: 1 },
        ]),
      };
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getStats('project-uuid-1');

      expect(result).toHaveLength(3);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ fileType: 'image', count: 5 }),
          expect.objectContaining({ fileType: 'pdf', count: 3 }),
        ]),
      );
      expect(mockQb.where).toHaveBeenCalledWith('e.project_id = :projectId', {
        projectId: 'project-uuid-1',
      });
    });
  });
});
