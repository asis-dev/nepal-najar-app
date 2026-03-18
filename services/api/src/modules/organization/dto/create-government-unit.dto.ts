import { IsString, IsOptional, IsEnum, IsObject, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GovernmentUnitType } from '../../../common/constants/enums';

export class CreateGovernmentUnitDto {
  @ApiProperty({ example: 'Ministry of Infrastructure' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ enum: GovernmentUnitType, example: GovernmentUnitType.MINISTRY })
  @IsEnum(GovernmentUnitType)
  type: GovernmentUnitType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parent_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  region_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  public_contact_info?: object;
}
