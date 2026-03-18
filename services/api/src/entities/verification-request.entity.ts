import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Project } from './project.entity';
import { User } from './user.entity';
import { GovernmentUnit } from './government-unit.entity';

@Entity('verification_requests')
export class VerificationRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  project_id: string;

  @Column({ type: 'uuid', nullable: true })
  target_user_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  target_government_unit_id: string | null;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'text' })
  question_text: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  @Index()
  status: string;

  @Column({ type: 'timestamptz' })
  requested_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  due_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  responded_at: Date | null;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'target_user_id' })
  target_user: User | null;

  @ManyToOne(() => GovernmentUnit, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'target_government_unit_id' })
  target_government_unit: GovernmentUnit | null;
}
