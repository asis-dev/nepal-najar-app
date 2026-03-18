import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn, Index,
} from 'typeorm';
import { GovernmentUnit } from './government-unit.entity';
import { Region } from './region.entity';
import { User } from './user.entity';
import { ProjectVersion } from './project-version.entity';
import { ProjectMilestone } from './project-milestone.entity';
import { ProjectTask } from './project-task.entity';
import { ProjectBlocker } from './project-blocker.entity';
import { ProjectBudgetRecord } from './project-budget-record.entity';
import { EvidenceAttachment } from './evidence-attachment.entity';
import { ProjectUpdate } from './project-update.entity';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'varchar', length: 500, unique: true })
  @Index()
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column('uuid')
  @Index()
  government_unit_id: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  region_id: string | null;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  @Index()
  status: string;

  @Column({ type: 'varchar', length: 20, default: 'medium' })
  priority: string;

  @Column({ type: 'date', nullable: true })
  start_date: string | null;

  @Column({ type: 'date', nullable: true })
  target_end_date: string | null;

  @Column({ type: 'date', nullable: true })
  actual_end_date: string | null;

  @Column({ type: 'varchar', length: 20, default: 'public' })
  public_visibility: string;

  @Column({ type: 'varchar', length: 30, default: 'unverified' })
  validation_state: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  current_progress_percent_cached: number;

  @Column({ type: 'timestamptz', nullable: true })
  last_official_update_at: Date | null;

  @Column('uuid')
  created_by: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  // Relations
  @ManyToOne(() => GovernmentUnit, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'government_unit_id' })
  government_unit: GovernmentUnit;

  @ManyToOne(() => Region, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'region_id' })
  region: Region | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => ProjectVersion, (v) => v.project)
  versions: ProjectVersion[];

  @OneToMany(() => ProjectMilestone, (m) => m.project)
  milestones: ProjectMilestone[];

  @OneToMany(() => ProjectTask, (t) => t.project)
  tasks: ProjectTask[];

  @OneToMany(() => ProjectBlocker, (b) => b.project)
  blockers: ProjectBlocker[];

  @OneToMany(() => ProjectBudgetRecord, (br) => br.project)
  budget_records: ProjectBudgetRecord[];

  @OneToMany(() => EvidenceAttachment, (e) => e.project)
  evidence: EvidenceAttachment[];

  @OneToMany(() => ProjectUpdate, (u) => u.project)
  updates: ProjectUpdate[];
}
