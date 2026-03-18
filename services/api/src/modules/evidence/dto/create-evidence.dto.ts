import {
  IsUUID,
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EvidenceSourceType {
  OFFICIAL = 'official',
  CITIZEN = 'citizen',
  NGO = 'ngo',
  MEDIA = 'media',
  SATELLITE = 'satellite',
}

export enum EvidenceVisibility {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  RESTRICTED = 'restricted',
}

export class CreateEvidenceDto {
  @ApiProperty({ example: 'b1c2d3e4-f5a6-7890-abcd-ef1234567890' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  milestoneId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;

  @ApiProperty({ enum: EvidenceSourceType })
  @IsEnum(EvidenceSourceType)
  sourceType: EvidenceSourceType;

  @ApiPropertyOptional({ example: 27.7172 })
  @IsOptional()
  @IsNumber()
  geoLat?: number;

  @ApiPropertyOptional({ example: 85.324 })
  @IsOptional()
  @IsNumber()
  geoLng?: number;

  @ApiPropertyOptional({ example: '2026-03-15T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  capturedAt?: string;

  @ApiPropertyOptional({ enum: EvidenceVisibility, default: EvidenceVisibility.PUBLIC })
  @IsOptional()
  @IsEnum(EvidenceVisibility)
  visibility?: EvidenceVisibility;
}
