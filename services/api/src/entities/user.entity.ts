import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  OneToMany, Index,
} from 'typeorm';
import { UserRole as UserRoleEntity } from './user-role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, nullable: true, unique: true })
  @Index()
  phone_number: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  @Index()
  email: string | null;

  @Column({ type: 'varchar', length: 255 })
  display_name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  profile_photo_url: string | null;

  @Column({ type: 'varchar', length: 50, default: 'unverified' })
  verification_level: string;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  language_preference: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => UserRoleEntity, (ur) => ur.user)
  user_roles: UserRoleEntity[];
}
