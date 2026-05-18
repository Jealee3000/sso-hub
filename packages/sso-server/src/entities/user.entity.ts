import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserIdentity } from './user-identity.entity';
import { RefreshToken } from './refresh-token.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true })
  email!: string;

  @Column({ nullable: true, name: 'display_name' })
  displayName!: string;

  @Column({ nullable: true, name: 'avatar_url' })
  avatarUrl!: string;

  @Column({ default: false, name: 'is_admin' })
  isAdmin!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => UserIdentity, (i) => i.user)
  identities!: UserIdentity[];

  @OneToMany(() => RefreshToken, (t) => t.user)
  refreshTokens!: RefreshToken[];
}
