import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsBoolean,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectPriority, PublicVisibility } from '../../../common/constants/enums';

export class CreateProjectDto {
  @ApiProperty({ example: 'Melamchi Water Supply Phase II' })
  @IsString()
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'b1c2d3e4-f5a6-7890-abcd-ef1234567890' })
  @IsUUID()
  governmentUnitId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  regionId?: string;

  @ApiPropertyOptional({ enum: ProjectPriority, default: ProjectPriority.MEDIUM })
  @IsOptional()
  @IsEnum(ProjectPriority)
  priority?: ProjectPriority;

  @ApiPropertyOptional({ example: '2026-04-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2028-12-31' })
  @IsOptional()
  @IsDateString()
  targetEndDate?: string;

  @ApiPropertyOptional({ enum: PublicVisibility, default: PublicVisibility.PUBLIC })
  @IsOptional()
  @IsEnum(PublicVisibility)
  publicVisibility?: PublicVisibility;
}
