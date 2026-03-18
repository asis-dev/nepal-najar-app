import {
  Controller, Get, Post, Patch, Delete,
  Param, Query, Body, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { CreateGovernmentUnitDto } from './dto/create-government-unit.dto';
import { UpdateGovernmentUnitDto } from './dto/update-government-unit.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('organization')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('government-units')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get()
  @ApiOperation({ summary: 'List government units with optional filters' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'parentId', required: false })
  @ApiQuery({ name: 'regionId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('type') type?: string,
    @Query('parentId') parentId?: string,
    @Query('regionId') regionId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.organizationService.findAll({
      type,
      parentId,
      regionId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get full government unit hierarchy as nested tree' })
  getHierarchyTree() {
    return this.organizationService.getHierarchyTree();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a government unit by ID with relations' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationService.findOne(id);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new government unit (admin only)' })
  create(@Body() dto: CreateGovernmentUnitDto) {
    return this.organizationService.create(dto);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update a government unit (admin only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGovernmentUnitDto,
  ) {
    return this.organizationService.update(id, dto);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List members of a government unit' })
  findMembers(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationService.findMembers(id);
  }

  @Post(':id/members')
  @Roles('admin')
  @ApiOperation({ summary: 'Add a member to a government unit (admin only)' })
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.organizationService.addMember(id, dto);
  }

  @Delete(':id/members/:memberId')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member from a government unit (admin only)' })
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.organizationService.removeMember(id, memberId);
  }
}
