import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';

@Entity('external_findings')
export class ExternalFinding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  project_id: string | null;

  @Column({ type: 'varchar', length: 255 })
  source_name: string;

  @Column({ type: 'varchar', length: 1000 })
  source_url: string;

  @Column({ type: 'varchar', length: 50 })
  source_type: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  headline: string | null;

  @Column({ type: 'text' })
  content_excerpt: string;

  @Column({ type: 'timestamptz', nullable: true })
  published_at: Date | null;

  @Column({ type: 'timestamptz' })
  found_at: Date;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  language: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.5 })
  confidence: number;

  @Column({ type: 'varchar', length: 20, default: 'neutral' })
  classification: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => Project, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'project_id' })
  project: Project | null;
}
