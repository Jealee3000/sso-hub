import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('oauth_clients')
export class OAuthClient {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ name: 'client_id' })
  clientId!: string;

  @Column({ name: 'client_secret' })
  clientSecret!: string;

  @Column({ type: 'jsonb', name: 'redirect_uris' })
  redirectUris!: string[];

  @Column({ type: 'jsonb', default: ['authorization_code'] })
  grants!: string[];

  @Column({ type: 'jsonb', default: ['openid', 'profile'] })
  scopes!: string[];

  @Column({ default: true, name: 'is_active' })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
