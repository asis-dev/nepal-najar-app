import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, Index,
} from 'typeorm';
import { User } from './user.entity';
import { Role } from './role.entity';
import { GovernmentUnit } from './government-unit.entity';

@Entity('user_roles')
@Index(['user_id', 'role_id', 'government_unit_id'], { unique: true })
export class UserRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @Column('uuid')
  role_id: string;

  @Column({ type: 'uuid', nullable: true })
  government_unit_id: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  assigned_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expires_at: Date | null;

  @ManyToOne(() => User, (u) => u.user_roles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Role, (r) => r.user_roles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @ManyToOne(() => GovernmentUnit, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'government_unit_id' })
  government_unit: GovernmentUnit | null;
}
