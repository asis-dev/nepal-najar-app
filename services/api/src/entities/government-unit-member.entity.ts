import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, Index,
} from 'typeorm';
import { GovernmentUnit } from './government-unit.entity';
import { User } from './user.entity';

@Entity('government_unit_members')
@Index(['government_unit_id', 'user_id'], { unique: true })
export class GovernmentUnitMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  government_unit_id: string;

  @Column('uuid')
  user_id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string | null;

  @Column({ type: 'boolean', default: false })
  is_primary: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => GovernmentUnit, (gu) => gu.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'government_unit_id' })
  government_unit: GovernmentUnit;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
