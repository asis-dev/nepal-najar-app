import {
  IsString, IsOptional, IsNumber, IsBoolean, IsDateString,
  MaxLength, Min, Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMilestoneDto {
  @ApiProperty({ example: 'Complete foundation work' })
  @IsString()
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional({ example: 'All foundation structures must pass inspection' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 25.0, description: 'Weight percentage (0-100)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  weightPercent: number;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresEvidence?: boolean;
}
