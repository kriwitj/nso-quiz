import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  Res,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { NsoSsoService } from './nso-sso.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Request, Response } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly nsoSsoService: NsoSsoService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register new user (no email verification)' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email/password' })
  @ApiBody({ type: LoginDto })
  async login(@Req() req: Request) {
    return this.authService.login(req.user as any);
  }

  @UseGuards(GoogleAuthGuard)
  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth' })
  async googleAuth() {}

  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const result = await this.authService.login(req.user as any);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(
      `${frontendUrl}/auth/callback?token=${result.accessToken}&refresh=${result.refreshToken}`,
    );
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  async refresh(@Req() req: Request) {
    return this.authService.refreshTokens((req.user as any).sub);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  async getMe(@Req() req: Request) {
    return this.authService.sanitizeUser(req.user as any);
  }

  // ── NSO SSO ────────────────────────────────────────────────────────────────

  @Get('nso')
  @ApiOperation({ summary: 'Initiate NSO SSO OAuth2 login' })
  nsoSsoInitiate(@Res() res: Response) {
    const { url } = this.nsoSsoService.getAuthorizationUrl();
    return res.redirect(url);
  }

  @Get('nso/callback')
  @ApiOperation({ summary: 'NSO SSO OAuth2 callback (called by SSO server)' })
  async nsoSsoCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const basePath = this.configService.get<string>('NEXT_PUBLIC_BASE_PATH') ?? '';
    const errorRedirect = `${frontendUrl}${basePath}/login?error=nso_sso_failed`;

    try {
      if (error) throw new Error(`SSO returned error: ${error}`);
      if (!this.nsoSsoService.verifyState(state)) {
        throw new Error('Invalid OAuth2 state — possible CSRF');
      }
      if (!code) throw new Error('Missing authorization code');

      const ssoToken = await this.nsoSsoService.exchangeCodeForToken(code);
      const userinfo = await this.nsoSsoService.getUserinfo(ssoToken);
      const user = await this.authService.validateNsoSsoUser(userinfo);
      const { accessToken, refreshToken } = await this.authService.login(user);

      return res.redirect(
        `${frontendUrl}${basePath}/auth/sso-callback?token=${accessToken}&refresh=${refreshToken}`,
      );
    } catch (err) {
      this.logger.error('[NSO SSO callback error]', err?.message);
      return res.redirect(errorRedirect);
    }
  }
}
