import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { DashboardsService } from './dashboards.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('dashboards')
@Controller('dashboards')
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  @Public()
  @Get('national')
  @ApiOperation({ summary: 'Get national dashboard with aggregated project metrics' })
  getNationalDashboard() {
    return this.dashboardsService.getNationalDashboard();
  }

  @Public()
  @Get('ministry/:unitId')
  @ApiOperation({ summary: 'Get dashboard scoped to a ministry and its descendant units' })
  @ApiParam({ name: 'unitId', description: 'Government unit UUID of the ministry' })
  getMinistryDashboard(@Param('unitId', ParseUUIDPipe) unitId: string) {
    return this.dashboardsService.getMinistryDashboard(unitId);
  }

  @Public()
  @Get('district/:regionId')
  @ApiOperation({ summary: 'Get dashboard scoped to a district/region' })
  @ApiParam({ name: 'regionId', description: 'Region UUID' })
  getDistrictDashboard(@Param('regionId', ParseUUIDPipe) regionId: string) {
    return this.dashboardsService.getDistrictDashboard(regionId);
  }

  @Public()
  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get detailed summary for a single project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  getProjectSummary(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.dashboardsService.getProjectSummary(projectId);
  }

  @Public()
  @Get('overview')
  @ApiOperation({ summary: 'Get quick global stats for homepage' })
  getOverviewStats() {
    return this.dashboardsService.getOverviewStats();
  }
}
