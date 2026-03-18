import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

import { EvidenceService } from './evidence.service';
import { CreateEvidenceDto } from './dto/create-evidence.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('evidence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  // ── Upload ──────────────────────────────────────────────────────────────

  @Post('evidence/upload')
  @ApiOperation({ summary: 'Upload evidence attachment (multipart form)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        projectId: { type: 'string', format: 'uuid' },
        milestoneId: { type: 'string', format: 'uuid' },
        taskId: { type: 'string', format: 'uuid' },
        caption: { type: 'string' },
        sourceType: { type: 'string', enum: ['official', 'citizen', 'ngo', 'media', 'satellite'] },
        geoLat: { type: 'number' },
        geoLng: { type: 'number' },
        capturedAt: { type: 'string', format: 'date-time' },
        visibility: { type: 'string', enum: ['public', 'internal', 'restricted'] },
      },
      required: ['file', 'projectId', 'sourceType'],
    },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateEvidenceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.evidenceService.upload(file, dto, user.sub);
  }

  // ── List by project (paginated) ────────────────────────────────────────

  @Get('projects/:projectId/evidence')
  @ApiOperation({ summary: 'List evidence for a project' })
  findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.evidenceService.findByProject(projectId, pagination);
  }

  // ── List by milestone ──────────────────────────────────────────────────

  @Get('milestones/:milestoneId/evidence')
  @ApiOperation({ summary: 'List evidence for a milestone' })
  findByMilestone(
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
  ) {
    return this.evidenceService.findByMilestone(milestoneId);
  }

  // ── Single evidence ────────────────────────────────────────────────────

  @Get('evidence/:id')
  @ApiOperation({ summary: 'Get a single evidence attachment' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.evidenceService.findOne(id);
  }

  // ── Presigned download URL ─────────────────────────────────────────────

  @Get('evidence/:id/download')
  @ApiOperation({ summary: 'Get a time-limited presigned download URL' })
  getPresignedUrl(@Param('id', ParseUUIDPipe) id: string) {
    return this.evidenceService.getPresignedUrl(id);
  }

  // ── Delete ─────────────────────────────────────────────────────────────

  @Delete('evidence/:id')
  @ApiOperation({ summary: 'Delete an evidence attachment (uploader or admin only)' })
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.evidenceService.delete(id, user.sub, user.roles);
  }

  // ── Stats ──────────────────────────────────────────────────────────────

  @Get('projects/:projectId/evidence/stats')
  @ApiOperation({ summary: 'Get evidence statistics by file type for a project' })
  getStats(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.evidenceService.getStats(projectId);
  }
}
