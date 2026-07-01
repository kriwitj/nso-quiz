import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, Prisma } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsers(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { nsoUsername: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true, email: true, name: true, avatar: true,
          role: true, isActive: true, createdAt: true, lastLoginAt: true,
          nsoUsername: true, nsoBranch: true, nsoDepartment: true, nsoProvince: true,
          _count: { select: { quizzes: true, sessions: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items: users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateUserRole(id: string, role: UserRole, adminId?: string, adminName?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const updated = await this.prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });
    await this.logActivity('ROLE_CHANGED', user, adminId, adminName, {
      from: user.role,
      to: role,
    });
    return updated;
  }

  async toggleUserStatus(id: string, adminId?: string, adminName?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: { id: true, email: true, name: true, isActive: true },
    });
    await this.logActivity('STATUS_TOGGLED', user, adminId, adminName, {
      isActive: updated.isActive,
    });
    return updated;
  }

  async getMetrics() {
    const [totalUsers, totalQuizzes, totalSessions, activeSessions] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.quiz.count(),
      this.prisma.gameSession.count(),
      this.prisma.gameSession.count({ where: { status: 'ACTIVE' } }),
    ]);
    const [recentUsers, recentSessions] = await Promise.all([
      this.prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, role: true, createdAt: true, avatar: true },
      }),
      this.prisma.gameSession.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, roomCode: true, status: true, createdAt: true,
          quiz: { select: { title: true } },
          host: { select: { name: true } },
          _count: { select: { playerSessions: true } },
        },
      }),
    ]);
    return { totalUsers, totalQuizzes, totalSessions, activeSessions, recentUsers, recentSessions };
  }

  async getLogs(page = 1, limit = 30) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.activityLog.count(),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  private async logActivity(
    action: string,
    target: { id: string; name: string; email: string },
    adminId?: string,
    adminName?: string,
    details?: Record<string, unknown>,
  ) {
    await this.prisma.activityLog.create({
      data: {
        action,
        targetUserId: target.id,
        targetUserName: target.name,
        targetUserEmail: target.email,
        adminId,
        adminName,
        details: details as Prisma.InputJsonValue,
      },
    });
  }
}
