import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';

@Entity('confidence_assessments')
export class ConfidenceAssessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  project_id: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  overall_score: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  official_signal_score: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  evidence_score: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  external_signal_score: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  citizen_signal_score: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  anomaly_penalty_score: number;

  @Column({ type: 'varchar', length: 30 })
  rating: string;

  @Column({ type: 'timestamptz' })
  computed_at: Date;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;
}
