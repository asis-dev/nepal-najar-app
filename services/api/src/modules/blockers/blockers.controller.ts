import {
  Controller, Get, Post, Patch,
  Param, Query, Body, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BlockersService } from './blockers.service';
import { CreateBlockerDto } from './dto/create-blocker.dto';
import { UpdateBlockerDto } from './dto/update-blocker.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('blockers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class BlockersController {
  constructor(private readonly blockersService: BlockersService) {}

  @Get('blockers')
  @ApiOperation({ summary: 'List all blockers across all projects' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'severity', required: false })
  findAll(
    @Query('status') status?: string,
    @Query('severity') severity?: string,
  ) {
    return this.blockersService.findAll({ status, severity });
  }

  @Get('projects/:projectId/blockers')
  @ApiOperation({ summary: 'List blockers for a project' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (open, mitigated, resolved, escalated)' })
  @ApiQuery({ name: 'severity', required: false, description: 'Filter by severity (critical, high, medium, low)' })
  findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('status') status?: string,
    @Query('severity') severity?: string,
  ) {
    return this.blockersService.findByProject(projectId, { status, severity });
  }

  @Post('projects/:projectId/blockers')
  @ApiOperation({ summary: 'Create a blocker for a project' })
  create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateBlockerDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.blockersService.create(projectId, dto, user.sub);
  }

  @Get('blockers/:id')
  @ApiOperation({ summary: 'Get a single blocker by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.blockersService.findOne(id);
  }

  @Patch('blockers/:id')
  @ApiOperation({ summary: 'Update a blocker' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBlockerDto,
  ) {
    return this.blockersService.update(id, dto);
  }

  @Post('blockers/:id/resolve')
  @ApiOperation({ summary: 'Resolve a blocker' })
  resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.blockersService.resolve(id, user.sub);
  }

  @Post('blockers/:id/escalate')
  @ApiOperation({ summary: 'Escalate a blocker to another government unit' })
  escalate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { toUnitId: string; reason: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.blockersService.escalate(id, body.toUnitId, body.reason, user.sub);
  }

  @Get('government-units/:unitId/blockers')
  @ApiOperation({ summary: 'List open blockers for a government unit' })
  findOpenByGovernmentUnit(
    @Param('unitId', ParseUUIDPipe) unitId: string,
  ) {
    return this.blockersService.findOpenByGovernmentUnit(unitId);
  }
}
