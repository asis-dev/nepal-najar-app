import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Project } from './project.entity';
import { User } from './user.entity';

@Entity('evidence_attachments')
export class EvidenceAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  project_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  milestone_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  task_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  update_id: string | null;

  @Column('uuid')
  uploaded_by: string;

  @Column({ type: 'varchar', length: 1000 })
  file_url: string;

  @Column({ type: 'varchar', length: 50 })
  file_type: string;

  @Column({ type: 'varchar', length: 100 })
  mime_type: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  caption: string | null;

  @Column({ type: 'varchar', length: 30 })
  source_type: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  geo_lat: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  geo_lng: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  captured_at: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'public' })
  visibility: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => Project, (p) => p.evidence, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'project_id' })
  project: Project | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'uploaded_by' })
  uploader: User;
}
