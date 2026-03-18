import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

import { EvidenceAttachment } from '../../entities/evidence-attachment.entity';
import { CreateEvidenceDto } from './dto/create-evidence.dto';
import { PaginationDto, PaginatedResponse } from '../../common/dto/pagination.dto';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

/** Maps MIME type to a human-readable file_type category */
function deriveFileType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'application/pdf') return 'pdf';
  return 'document';
}

@Injectable()
export class EvidenceService {
  private readonly logger = new Logger(EvidenceService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    @InjectRepository(EvidenceAttachment)
    private readonly repo: Repository<EvidenceAttachment>,
    private readonly config: ConfigService,
  ) {
    this.bucket = this.config.getOrThrow<string>('S3_BUCKET');
    this.s3 = new S3Client({
      endpoint: this.config.getOrThrow<string>('S3_ENDPOINT'),
      region: this.config.get<string>('S3_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('S3_ACCESS_KEY'),
        secretAccessKey: this.config.getOrThrow<string>('S3_SECRET_KEY'),
      },
      forcePathStyle: true, // required for MinIO
    });
  }

  // ───── Upload ─────────────────────────────────────────────────────────────

  async upload(
    file: Express.Multer.File,
    dto: CreateEvidenceDto,
    userId: string,
  ): Promise<EvidenceAttachment> {
    // Validate file
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds maximum of 25MB`,
      );
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type "${file.mimetype}" is not allowed. Accepted types: JPEG, PNG, WebP, MP4, PDF, DOC, DOCX`,
      );
    }

    // Build S3 key: evidence/<projectId>/<uuid><ext>
    const ext = extname(file.originalname) || '';
    const key = `evidence/${dto.projectId}/${randomUUID()}${ext}`;

    // Upload to S3 / MinIO
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ContentLength: file.size,
      }),
    );

    this.logger.log(`Uploaded ${key} (${file.size} bytes)`);

    // Persist record
    const record = this.repo.create({
      project_id: dto.projectId,
      milestone_id: dto.milestoneId ?? null,
      task_id: dto.taskId ?? null,
      uploaded_by: userId,
      file_url: key,
      file_type: deriveFileType(file.mimetype),
      mime_type: file.mimetype,
      caption: dto.caption ?? null,
      source_type: dto.sourceType,
      geo_lat: dto.geoLat ?? null,
      geo_lng: dto.geoLng ?? null,
      captured_at: dto.capturedAt ? new Date(dto.capturedAt) : null,
      visibility: dto.visibility ?? 'public',
    });

    return this.repo.save(record);
  }

  // ───── Queries ────────────────────────────────────────────────────────────

  async findByProject(
    projectId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<EvidenceAttachment>> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;

    const [data, total] = await this.repo.findAndCount({
      where: { project_id: projectId },
      relations: ['uploader'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return new PaginatedResponse(data, total, page, limit);
  }

  async findByMilestone(milestoneId: string): Promise<EvidenceAttachment[]> {
    return this.repo.find({
      where: { milestone_id: milestoneId },
      relations: ['uploader'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<EvidenceAttachment> {
    const record = await this.repo.findOne({
      where: { id },
      relations: ['uploader', 'project'],
    });
    if (!record) {
      throw new NotFoundException(`Evidence attachment ${id} not found`);
    }
    return record;
  }

  // ───── Presigned URL ──────────────────────────────────────────────────────

  async getPresignedUrl(id: string): Promise<{ url: string; expiresIn: number }> {
    const record = await this.findOne(id);
    const expiresIn = 3600; // 1 hour

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: record.file_url,
    });
    const url = await getSignedUrl(this.s3, command, { expiresIn });

    return { url, expiresIn };
  }

  // ───── Delete ─────────────────────────────────────────────────────────────

  async delete(id: string, userId: string, roles: string[] = []): Promise<void> {
    const record = await this.findOne(id);

    const isOwner = record.uploaded_by === userId;
    const isAdmin = roles.some((r) =>
      ['super_admin', 'ministry_admin', 'admin'].includes(r),
    );

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'Only the uploader or an admin can delete evidence',
      );
    }

    // Remove from S3
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: record.file_url,
      }),
    );

    await this.repo.remove(record);
    this.logger.log(`Deleted evidence ${id} (key: ${record.file_url})`);
  }

  // ───── Stats ──────────────────────────────────────────────────────────────

  async getStats(
    projectId: string,
  ): Promise<{ fileType: string; count: number }[]> {
    const rows = await this.repo
      .createQueryBuilder('e')
      .select('e.file_type', 'fileType')
      .addSelect('COUNT(*)::int', 'count')
      .where('e.project_id = :projectId', { projectId })
      .groupBy('e.file_type')
      .getRawMany<{ fileType: string; count: number }>();

    return rows;
  }

  // ───── Health probe (used by HealthController) ────────────────────────────

  async checkS3(): Promise<boolean> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return true;
    } catch {
      return false;
    }
  }
}
