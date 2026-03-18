import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class TriggerScrapingDto {
  @ApiPropertyOptional({ description: 'Scope type for the research job (e.g. "national", "ministry", "project")' })
  @IsOptional()
  @IsString()
  scope_type?: string;

  @ApiPropertyOptional({ description: 'UUID of the scoped entity (project, government unit, etc.)' })
  @IsOptional()
  @IsUUID()
  scope_id?: string;

  @ApiPropertyOptional({ description: 'Job type (e.g. "news_scan", "budget_check", "progress_audit")' })
  @IsOptional()
  @IsString()
  job_type?: string;
}

export class ScrapingStatusDto {
  @ApiProperty()
  total_jobs: number;

  @ApiProperty()
  in_progress: number;

  @ApiProperty()
  completed: number;

  @ApiProperty()
  failed: number;

  @ApiPropertyOptional()
  last_run_at: Date | null;
}

export class FindingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  finding_type: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  body: string;

  @ApiProperty()
  confidence: number;

  @ApiPropertyOptional()
  recommended_action: string | null;

  @ApiPropertyOptional()
  project_id: string | null;

  @ApiProperty()
  created_at: Date;
}

export class PotentialProjectResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty()
  discovered_from: string;

  @ApiPropertyOptional()
  source_url: string | null;

  @ApiProperty()
  confidence: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  created_at: Date;
}
