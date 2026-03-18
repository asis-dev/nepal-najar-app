import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { ResearchJob } from './research-job.entity';
import { Project } from './project.entity';

@Entity('research_findings')
export class ResearchFinding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  research_job_id: string;

  @Column({ type: 'uuid', nullable: true })
  project_id: string | null;

  @Column({ type: 'varchar', length: 50 })
  finding_type: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'decimal', precision: 3, scale: 2 })
  confidence: number;

  @Column({ type: 'text', nullable: true })
  recommended_action: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => ResearchJob, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'research_job_id' })
  research_job: ResearchJob;

  @ManyToOne(() => Project, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'project_id' })
  project: Project | null;
}
