import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { ProjectTask } from './project-task.entity';

@Entity('task_dependencies')
@Index(['task_id', 'depends_on_task_id'], { unique: true })
export class TaskDependency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  task_id: string;

  @Column('uuid')
  depends_on_task_id: string;

  @Column({ type: 'varchar', length: 30, default: 'finish_to_start' })
  dependency_type: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @ManyToOne(() => ProjectTask, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: ProjectTask;

  @ManyToOne(() => ProjectTask, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'depends_on_task_id' })
  depends_on_task: ProjectTask;
}
