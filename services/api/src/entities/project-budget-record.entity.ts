import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { FundingSource } from './funding-source.entity';
import { User } from './user.entity';

@Entity('project_budget_records')
export class ProjectBudgetRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  project_id: string;

  @Column({ type: 'varchar', length: 20 })
  record_type: string; // allocation, release, expenditure, adjustment

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'NPR' })
  currency: string;

  @Column({ type: 'uuid', nullable: true })
  funding_source_id: string | null;

  @Column({ type: 'date' })
  record_date: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column('uuid')
  created_by: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => Project, (p) => p.budget_records, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => FundingSource, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'funding_source_id' })
  funding_source: FundingSource | null;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator: User;
}
