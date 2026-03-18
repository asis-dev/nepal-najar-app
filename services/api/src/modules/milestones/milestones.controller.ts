import {
  Controller, Get, Post, Patch, Put, Delete, Query,
  Param, Body, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MilestonesService } from './milestones.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('milestones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Get('milestones')
  @Public()
  @ApiOperation({ summary: 'List all milestones across all projects' })
  findAll(@Query('status') status?: string) {
    return this.milestonesService.findAll({ status });
  }

  @Get('projects/:projectId/milestones')
  @ApiOperation({ summary: 'List milestones for a project' })
  findByProject(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.milestonesService.findByProject(projectId);
  }

  @Post('projects/:projectId/milestones')
  @ApiOperation({ summary: 'Create a milestone for a project' })
  create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateMilestoneDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.milestonesService.create(projectId, dto, user.sub);
  }

  @Put('projects/:projectId/milestones/reorder')
  @ApiOperation({ summary: 'Reorder milestones for a project' })
  reorder(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() body: { milestoneIds: string[] },
  ) {
    return this.milestonesService.reorder(projectId, body.milestoneIds);
  }

  @Get('milestones/:id')
  @ApiOperation({ summary: 'Get a single milestone by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.milestonesService.findOne(id);
  }

  @Patch('milestones/:id')
  @ApiOperation({ summary: 'Update a milestone' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.milestonesService.update(id, dto);
  }

  @Patch('milestones/:id/status')
  @ApiOperation({ summary: 'Change milestone status' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: string },
  ) {
    return this.milestonesService.updateStatus(id, body.status);
  }

  @Delete('milestones/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a milestone' })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.milestonesService.delete(id);
  }
}
