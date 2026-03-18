import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn, Index,
} from 'typeorm';
import { Region } from './region.entity';
import { GovernmentUnitMember } from './government-unit-member.entity';

@Entity('government_units')
export class GovernmentUnit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  type: string; // ministry, department, branch, division, office

  @Column({ type: 'uuid', nullable: true })
  parent_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  region_id: string | null;

  @Column({ type: 'jsonb', nullable: true })
  public_contact_info: object | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @ManyToOne(() => GovernmentUnit, (gu) => gu.children, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent: GovernmentUnit | null;

  @OneToMany(() => GovernmentUnit, (gu) => gu.parent)
  children: GovernmentUnit[];

  @ManyToOne(() => Region, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'region_id' })
  region: Region | null;

  @OneToMany(() => GovernmentUnitMember, (m) => m.government_unit)
  members: GovernmentUnitMember[];
}
