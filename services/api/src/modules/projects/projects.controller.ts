import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { FilterProjectsDto } from './dto/filter-projects.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { ProjectStatus } from '../../common/constants/enums';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List projects with optional filters and pagination' })
  findAll(@Query() filters: FilterProjectsDto) {
    return this.projectsService.findAll(filters);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a project with all relations' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.projectsService.create(dto, user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a project' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.projectsService.update(id, dto, user.sub);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change project status (lifecycle transition)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: ProjectStatus,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.projectsService.updateStatus(id, status, user.sub);
  }

  @Get(':id/progress')
  @Public()
  @ApiOperation({
    summary: 'Get calculated progress breakdown for a project',
    description:
      'Returns weighted progress derived from milestones. ' +
      'Cancelled milestones are excluded; blocked milestones do not count as complete.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  getProgress(@Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.calculateProgress(id);
  }
}
