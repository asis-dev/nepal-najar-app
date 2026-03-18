import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';

@Entity('regions')
export class Region {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  type: string; // country, province, district, municipality, ward

  @Column({ type: 'uuid', nullable: true })
  parent_id: string | null;

  @Column({ type: 'jsonb', nullable: true })
  geojson: object | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => Region, (r) => r.children, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent: Region | null;

  @OneToMany(() => Region, (r) => r.parent)
  children: Region[];
}
