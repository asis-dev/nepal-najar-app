import { PartialType } from '@nestjs/swagger';
import { CreateGovernmentUnitDto } from './create-government-unit.dto';
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateGovernmentUnitDto extends PartialType(CreateGovernmentUnitDto) {
  @ApiPropertyOptional({ example: 'active' })
  @IsOptional()
  @IsString()
  status?: string;
}
