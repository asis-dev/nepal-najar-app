import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ResearchJob } from '../../entities/research-job.entity';
import { ResearchFinding } from '../../entities/research-finding.entity';
import { PotentialProject } from '../../entities/potential-project.entity';
import { TriggerScrapingDto } from './scraping.dto';

@Injectable()
export class ScrapingService {
  private readonly logger = new Logger(ScrapingService.name);
  private readonly aiServiceUrl: string;

  constructor(
    @InjectRepository(ResearchJob)
    private readonly jobRepo: Repository<ResearchJob>,
    @InjectRepository(ResearchFinding)
    private readonly findingRepo: Repository<ResearchFinding>,
    @InjectRepository(PotentialProject)
    private readonly potentialProjectRepo: Repository<PotentialProject>,
    private readonly configService: ConfigService,
  ) {
    this.aiServiceUrl =
      this.configService.get<string>('AI_SERVICE_URL') ||
      'http://localhost:8000';
  }

  async triggerScraping(dto: TriggerScrapingDto) {
    const url = `${this.aiServiceUrl}/api/v1/ai/research/start`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope_type: dto.scope_type || 'national',
          scope_id: dto.scope_id || null,
          job_type: dto.job_type || 'news_scan',
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(
          `AI service returned ${response.status}: ${errorBody}`,
        );
        throw new HttpException(
          `AI research service error: ${response.status}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      const result = await response.json();
      this.logger.log(`Scraping job triggered successfully`);
      return { triggered: true, ...result };
    } catch (error) {
      if (error instanceof HttpException) throw error;

      this.logger.error(`Failed to reach AI service at ${url}`, error);
      throw new HttpException(
        'AI research service is unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async getStatus() {
    const total_jobs = await this.jobRepo.count();

    const in_progress = await this.jobRepo.count({
      where: { status: 'running' },
    });

    const completed = await this.jobRepo.count({
      where: { status: 'completed' },
    });

    const failed = await this.jobRepo.count({
      where: { status: 'failed' },
    });

    const lastJob = await this.jobRepo.findOne({
      where: {},
      order: { finished_at: 'DESC' },
    });

    return {
      total_jobs,
      in_progress,
      completed,
      failed,
      last_run_at: lastJob?.finished_at ?? null,
    };
  }

  async getFindings(limit = 50, offset = 0) {
    const [items, total] = await this.findingRepo.findAndCount({
      order: { created_at: 'DESC' },
      take: limit,
      skip: offset,
      select: [
        'id',
        'finding_type',
        'title',
        'body',
        'confidence',
        'recommended_action',
        'project_id',
        'created_at',
      ],
    });

    return { items, total, limit, offset };
  }

  async getPotentialProjects(limit = 50, offset = 0) {
    const [items, total] = await this.potentialProjectRepo.findAndCount({
      order: { created_at: 'DESC' },
      take: limit,
      skip: offset,
      select: [
        'id',
        'title',
        'description',
        'discovered_from',
        'source_url',
        'confidence',
        'status',
        'created_at',
      ],
    });

    return { items, total, limit, offset };
  }
}
