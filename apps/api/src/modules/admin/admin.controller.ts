import {
  Controller, Get, Patch, Param, Body, UseGuards, Query, Req,
  DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  getUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(page, limit, search);
  }

  @Patch('users/:id/role')
  updateRole(
    @Param('id') id: string,
    @Body() body: { role: UserRole },
    @Req() req: Request,
  ) {
    const admin = req.user as any;
    return this.adminService.updateUserRole(id, body.role, admin?.id, admin?.name);
  }

  @Patch('users/:id/toggle-status')
  toggleStatus(@Param('id') id: string, @Req() req: Request) {
    const admin = req.user as any;
    return this.adminService.toggleUserStatus(id, admin?.id, admin?.name);
  }

  @Get('metrics')
  getMetrics() {
    return this.adminService.getMetrics();
  }

  @Get('logs')
  getLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getLogs(page, limit);
  }
}
