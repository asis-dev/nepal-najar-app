import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';
import { Contractor } from './contractor.entity';

@Entity('project_contractors')
export class ProjectContractor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  project_id: string;

  @Column('uuid')
  contractor_id: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  contract_value: number | null;

  @Column({ type: 'date', nullable: true })
  start_date: string | null;

  @Column({ type: 'date', nullable: true })
  end_date: string | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @ManyToOne(() => Contractor, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'contractor_id' })
  contractor: Contractor;
}
