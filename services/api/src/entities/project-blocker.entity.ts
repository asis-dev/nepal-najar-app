import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Project } from './project.entity';
import { ProjectMilestone } from './project-milestone.entity';
import { GovernmentUnit } from './government-unit.entity';
import { User } from './user.entity';

@Entity('project_blockers')
export class ProjectBlocker {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  project_id: string;

  @Column({ type: 'uuid', nullable: true })
  milestone_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  task_id: string | null;

  @Column({ type: 'varchar', length: 50 })
  type: string;

  @Column({ type: 'varchar', length: 20 })
  severity: string;

  @Column({ type: 'varchar', length: 20, default: 'open' })
  @Index()
  status: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column('uuid')
  owner_government_unit_id: string;

  @Column({ type: 'timestamptz' })
  opened_at: Date;

  @Column({ type: 'date', nullable: true })
  expected_resolution_date: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  resolved_at: Date | null;

  @Column({ type: 'int', default: 0 })
  escalation_level: number;

  @Column('uuid')
  created_by: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(() => Project, (p) => p.blockers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => ProjectMilestone, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'milestone_id' })
  milestone: ProjectMilestone | null;

  @ManyToOne(() => GovernmentUnit, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'owner_government_unit_id' })
  owner_government_unit: GovernmentUnit;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator: User;
}
