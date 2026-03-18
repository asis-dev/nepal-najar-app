import {
  IsString, IsOptional, IsUUID, IsDateString, IsIn, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const BLOCKER_TYPES = [
  'funding', 'regulatory', 'technical', 'political',
  'resource', 'weather', 'coordination',
] as const;

const SEVERITY_LEVELS = ['critical', 'high', 'medium', 'low'] as const;

export class CreateBlockerDto {
  @ApiProperty({ example: 'Land acquisition dispute in Ward 5' })
  @IsString()
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional({ example: 'Landowners are contesting the survey results' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: BLOCKER_TYPES, example: 'regulatory' })
  @IsString()
  @IsIn(BLOCKER_TYPES)
  type: string;

  @ApiProperty({ enum: SEVERITY_LEVELS, example: 'high' })
  @IsString()
  @IsIn(SEVERITY_LEVELS)
  severity: string;

  @ApiPropertyOptional({ description: 'UUID of the blocked milestone' })
  @IsOptional()
  @IsUUID()
  milestoneId?: string;

  @ApiProperty({ description: 'UUID of the responsible government unit' })
  @IsUUID()
  ownerGovernmentUnitId: string;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsDateString()
  expectedResolutionDate?: string;
}
