import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Project } from './project.entity';
import { ProjectMilestone } from './project-milestone.entity';
import { User } from './user.entity';
import { GovernmentUnit } from './government-unit.entity';
import { ProjectBlocker } from './project-blocker.entity';

@Entity('project_tasks')
export class ProjectTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  project_id: string;

  @Column({ type: 'uuid', nullable: true })
  milestone_id: string | null;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', nullable: true })
  assigned_user_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  assigned_government_unit_id: string | null;

  @Column({ type: 'varchar', length: 20, default: 'todo' })
  @Index()
  status: string;

  @Column({ type: 'varchar', length: 20, default: 'medium' })
  priority: string;

  @Column({ type: 'date', nullable: true })
  due_date: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  started_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  blocker_id: string | null;

  @Column('uuid')
  created_by: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(() => Project, (p) => p.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => ProjectMilestone, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'milestone_id' })
  milestone: ProjectMilestone | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_user_id' })
  assigned_user: User | null;

  @ManyToOne(() => GovernmentUnit, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_government_unit_id' })
  assigned_government_unit: GovernmentUnit | null;

  @ManyToOne(() => ProjectBlocker, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'blocker_id' })
  blocker: ProjectBlocker | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator: User;
}
