import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private admin: AdminService) {}

  @Post('clients')
  createClient(@Body() body: { name: string; redirectUris: string[] }) {
    return this.admin.createClient(body);
  }

  @Get('clients')
  listClients() { return this.admin.listClients(); }

  @Delete('clients/:id')
  deleteClient(@Param('id') id: string) { return this.admin.deleteClient(id); }

  @Get('users')
  listUsers() { return this.admin.listUsers(); }

  @Post('users/:id/toggle-admin')
  toggleAdmin(@Param('id') id: string) { return this.admin.toggleAdmin(id); }

  @Delete('users/:id')
  disableUser(@Param('id') id: string) { return this.admin.disableUser(id); }

  @Get('audit-logs')
  getAuditLogs(@Body() filter: any) { return this.admin.getAuditLogs(filter); }
}
