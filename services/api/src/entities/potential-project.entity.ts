import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Region } from './region.entity';
import { GovernmentUnit } from './government-unit.entity';
import { User } from './user.entity';

@Entity('potential_projects')
export class PotentialProject {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 255 })
  discovered_from: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  source_url: string | null;

  @Column({ type: 'uuid', nullable: true })
  region_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  government_unit_id: string | null;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.5 })
  confidence: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  reviewed_by: string | null;

  @ManyToOne(() => Region, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'region_id' })
  region: Region | null;

  @ManyToOne(() => GovernmentUnit, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'government_unit_id' })
  government_unit: GovernmentUnit | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: User | null;
}
