import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { ProjectBlocker } from './project-blocker.entity';
import { Project } from './project.entity';
import { GovernmentUnit } from './government-unit.entity';

@Entity('escalation_records')
export class EscalationRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  blocker_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  task_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  project_id: string | null;

  @Column('uuid')
  from_unit_id: string;

  @Column('uuid')
  to_unit_id: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  resolved_at: Date | null;

  @ManyToOne(() => ProjectBlocker, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'blocker_id' })
  blocker: ProjectBlocker | null;

  @ManyToOne(() => Project, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'project_id' })
  project: Project | null;

  @ManyToOne(() => GovernmentUnit, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'from_unit_id' })
  from_unit: GovernmentUnit;

  @ManyToOne(() => GovernmentUnit, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'to_unit_id' })
  to_unit: GovernmentUnit;
}
