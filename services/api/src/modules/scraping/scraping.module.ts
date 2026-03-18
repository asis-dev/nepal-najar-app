import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScrapingController } from './scraping.controller';
import { ScrapingService } from './scraping.service';
import { ResearchJob } from '../../entities/research-job.entity';
import { ResearchFinding } from '../../entities/research-finding.entity';
import { PotentialProject } from '../../entities/potential-project.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ResearchJob,
      ResearchFinding,
      PotentialProject,
    ]),
  ],
  controllers: [ScrapingController],
  providers: [ScrapingService],
  exports: [ScrapingService],
})
export class ScrapingModule {}
