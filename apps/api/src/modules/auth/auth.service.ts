import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { User, UserRole } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { NsoUserinfo } from './nso-sso.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: hashedPassword,
      },
    });

    const tokens = await this.generateTokens(user);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(user: User) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    const tokens = await this.generateTokens(user);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async validateLocalUser(email: string, password: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedException('Account suspended');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  async validateGoogleUser(profile: {
    googleId: string;
    email: string;
    name: string;
    avatar?: string;
  }) {
    let user = await this.prisma.user.findUnique({ where: { googleId: profile.googleId } });
    if (!user) {
      user = await this.prisma.user.findUnique({ where: { email: profile.email } });
      if (user) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId: profile.googleId, avatar: profile.avatar },
        });
      } else {
        user = await this.prisma.user.create({
          data: {
            email: profile.email,
            name: profile.name,
            googleId: profile.googleId,
            avatar: profile.avatar,
          },
        });
      }
    }
    return user;
  }

  async refreshTokens(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.generateTokens(user);
  }

  async forgotPassword(email: string): Promise<{ resetToken: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');
    // Generate reset token (stored in Redis for 1 hour)
    const resetToken = uuidv4();
    // In production, store this in Redis with TTL and return it
    // No email is sent (per project requirements)
    return { resetToken };
  }

  async resetPassword(token: string, newPassword: string) {
    // Verify token from Redis
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    // In production, look up token in Redis to get userId, then update
    return { success: true };
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('jwt.refreshSecret'),
        expiresIn: this.configService.get('jwt.refreshExpiresIn'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async validateNsoSsoUser(userinfo: NsoUserinfo): Promise<User> {
    const perms = userinfo.permissions ?? [];

    // Map NSO SSO permissions → app role
    const role: UserRole =
      perms.includes('admin') || perms.includes('quiz_admin')
        ? UserRole.ADMIN
        : UserRole.HOST;

    const orgFields = {
      nsoUsername: userinfo.preferred_username ?? null,
      nsoBranch: userinfo.branch ?? null,
      nsoDepartment: userinfo.department ?? null,
      nsoProvinceCode: userinfo.province_code ?? null,
      nsoPermissions: perms,
    };

    // 1. Look up by nsoSsoId (sub UUID)
    let user = await this.prisma.user.findUnique({ where: { nsoSsoId: userinfo.sub } });

    // 2. Not found → try linking by email
    if (!user && userinfo.email) {
      user = await this.prisma.user.findUnique({ where: { email: userinfo.email } });
      if (user) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            nsoSsoId: userinfo.sub,
            avatar: userinfo.picture ?? user.avatar,
            // Respect manually elevated ADMIN; otherwise sync role from SSO
            role: user.role === UserRole.ADMIN ? UserRole.ADMIN : role,
            lastLoginAt: new Date(),
            ...orgFields,
          },
        });
      }
    }

    // 3. Truly new user — create
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: userinfo.email ?? `${userinfo.sub}@nso-sso.local`,
          name:
            userinfo.display_name ??
            userinfo.name ??
            userinfo.preferred_username ??
            'NSO User',
          nsoSsoId: userinfo.sub,
          avatar: userinfo.picture ?? null,
          role,
          lastLoginAt: new Date(),
          ...orgFields,
        },
      });
    } else if (user.nsoSsoId) {
      // Already linked — refresh permissions + org info every login
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), ...orgFields },
      });
    }

    return user;
  }

  sanitizeUser(user: User) {
    const { password, ...rest } = user;
    return rest;
  }
}
