import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { VerificationRequest } from './verification-request.entity';
import { User } from './user.entity';

@Entity('verification_responses')
export class VerificationResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  verification_request_id: string;

  @Column('uuid')
  responded_by: string;

  @Column({ type: 'text' })
  response_text: string;

  @Column({ type: 'uuid', nullable: true })
  evidence_attachment_id: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => VerificationRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'verification_request_id' })
  verification_request: VerificationRequest;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'responded_by' })
  responder: User;
}
