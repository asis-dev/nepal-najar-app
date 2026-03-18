import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ScrapingService } from './scraping.service';
import { TriggerScrapingDto } from './scraping.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('scraping')
@Controller('scraping')
export class ScrapingController {
  constructor(private readonly scrapingService: ScrapingService) {}

  @Public()
  @Post('trigger')
  @ApiOperation({ summary: 'Manually trigger a scraping/research job via the AI service' })
  trigger(@Body() dto: TriggerScrapingDto) {
    return this.scrapingService.triggerScraping(dto);
  }

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Get current scraping status (jobs in progress, last run)' })
  getStatus() {
    return this.scrapingService.getStatus();
  }

  @Public()
  @Get('findings')
  @ApiOperation({ summary: 'Get list of research findings from the database' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  getFindings(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.scrapingService.getFindings(limit, offset);
  }

  @Public()
  @Get('potential')
  @ApiOperation({ summary: 'Get list of potential (discovered) projects' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  getPotentialProjects(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.scrapingService.getPotentialProjects(limit, offset);
  }
}
