import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Project } from './project.entity';
import { User } from './user.entity';

@Entity('project_updates')
export class ProjectUpdate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  project_id: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ type: 'varchar', length: 30, default: 'general' })
  update_type: string;

  @Column({ type: 'varchar', length: 20, default: 'public' })
  visibility: string;

  @Column({ type: 'boolean', default: true })
  official_source: boolean;

  @Column('uuid')
  posted_by: string;

  @Column({ type: 'timestamptz' })
  posted_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => Project, (p) => p.updates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'posted_by' })
  poster: User;
}
