import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { OAuthClient } from '../entities/oauth-client.entity';
import { User } from '../entities/user.entity';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(OAuthClient) private clientRepo: Repository<OAuthClient>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
  ) {}

  async createClient(dto: { name: string; redirectUris: string[] }) {
    const clientId = uuid();
    const secret = uuid();
    const secretHash = await bcrypt.hash(secret, 10);
    const client = await this.clientRepo.save(this.clientRepo.create({
      name: dto.name, clientId, clientSecret: secretHash, redirectUris: dto.redirectUris,
    }));
    return { id: client.id, name: client.name, clientId, clientSecret: secret };
  }

  async listClients() {
    return this.clientRepo.find({ select: ['id', 'name', 'clientId', 'isActive', 'createdAt'] });
  }

  async deleteClient(id: string) {
    await this.clientRepo.update(id, { isActive: false });
  }

  async resetSecret(id: string) {
    const client = await this.clientRepo.findOne({ where: { id } });
    if (!client) throw new NotFoundException('应用不存在');

    const newSecret = uuid();
    client.clientSecret = await bcrypt.hash(newSecret, 10);
    await this.clientRepo.save(client);

    return { id: client.id, name: client.name, clientId: client.clientId, clientSecret: newSecret };
  }

  async listUsers() {
    const users = await this.userRepo.find({ relations: ['identities'] });
    return users.map(u => {
      const firstId = u.identities?.[0];
      return {
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        isAdmin: u.isAdmin,
        createdAt: u.createdAt,
        provider: firstId?.provider || null,
        providerUserId: firstId?.providerUserId || null,
      };
    });
  }

  async toggleAdmin(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    user.isAdmin = !user.isAdmin;
    return this.userRepo.save(user);
  }

  async disableUser(userId: string) {
    await this.userRepo.delete(userId);
  }

  async getAuditLogs(filter: { userId?: string; action?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, filter.page || 1);
    const pageSize = Math.min(100, filter.pageSize || 20);

    const [items, total] = await this.auditRepo.findAndCount({
      where: {
        ...(filter.userId && { userId: filter.userId }),
        ...(filter.action && { action: filter.action }),
      },
      order: { createdAt: 'DESC' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    });

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
