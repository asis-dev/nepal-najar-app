import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GovernmentUnit } from '../../entities/government-unit.entity';
import { GovernmentUnitMember } from '../../entities/government-unit-member.entity';
import { Region } from '../../entities/region.entity';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([GovernmentUnit, GovernmentUnitMember, Region]),
  ],
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
