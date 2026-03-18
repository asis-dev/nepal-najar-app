import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { ProjectMilestone } from './project-milestone.entity';
import { User } from './user.entity';

@Entity('milestone_versions')
export class MilestoneVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  milestone_id: string;

  @Column({ type: 'int' })
  version_number: number;

  @Column({ type: 'jsonb' })
  snapshot_json: object;

  @Column('uuid')
  created_by: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => ProjectMilestone, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'milestone_id' })
  milestone: ProjectMilestone;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  creator: User;
}
