import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { OAuthClient } from './oauth-client.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id', nullable: true })
  userId!: string;

  @Column()
  action!: string;

  @Column({ name: 'ip_address' })
  ipAddress!: string;

  @ManyToOne(() => OAuthClient, { nullable: true })
  @JoinColumn({ name: 'client_id' })
  client!: OAuthClient;

  @Column({ name: 'client_id', nullable: true })
  clientId!: string;

  @Column({ type: 'jsonb', nullable: true })
  details!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
