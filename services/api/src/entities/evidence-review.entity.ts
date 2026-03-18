import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { EvidenceAttachment } from './evidence-attachment.entity';
import { User } from './user.entity';

@Entity('evidence_reviews')
export class EvidenceReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  evidence_attachment_id: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  review_status: string;

  @Column({ type: 'text', nullable: true })
  review_notes: string | null;

  @Column({ type: 'uuid', nullable: true })
  reviewed_by: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at: Date | null;

  @ManyToOne(() => EvidenceAttachment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evidence_attachment_id' })
  evidence_attachment: EvidenceAttachment;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: User | null;
}
