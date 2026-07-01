import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface NsoUserinfo {
  sub: string;
  preferred_username?: string;
  display_name?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string | null;
  email?: string;
  email_verified?: boolean;
  branch?: string;
  department?: string;
  province_code?: string | null;
  permissions?: string[];
}

@Injectable()
export class NsoSsoService {
  private readonly logger = new Logger(NsoSsoService.name);

  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly hmacKey: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = config.get('NSO_SSO_BASE_URL') ?? 'https://sso.nso.go.th';
    this.clientId = config.get('NSO_SSO_CLIENT_ID') ?? '';
    this.clientSecret = config.get('NSO_SSO_CLIENT_SECRET') ?? '';
    this.redirectUri = config.get('NSO_SSO_REDIRECT_URI') ?? '';
    // Reuse NEXTAUTH_SECRET so the state HMAC key is the same as the JWT secret
    this.hmacKey = config.get('NEXTAUTH_SECRET') ?? 'nso-quiz-dev-only-change-me';
  }

  /** Build the SSO authorize URL and return it with the signed state */
  getAuthorizationUrl(): { url: string; state: string } {
    const state = this.generateSignedState();
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid profile email org_full',
      state,
    });
    return { url: `${this.baseUrl}/api/sso/authorize.php?${params}`, state };
  }

  /** Exchange authorization code for an SSO access_token */
  async exchangeCodeForToken(code: string): Promise<string> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const res = await fetch(`${this.baseUrl}/api/sso/token.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const data = await res.json() as Record<string, unknown>;

    if (!data.access_token) {
      this.logger.error('NSO SSO token response missing access_token', data);
      throw new BadRequestException('NSO SSO did not return an access_token');
    }
    return data.access_token as string;
  }

  /** Fetch userinfo using the SSO access_token */
  async getUserinfo(accessToken: string): Promise<NsoUserinfo> {
    const res = await fetch(`${this.baseUrl}/api/sso/userinfo.php`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.json() as Promise<NsoUserinfo>;
  }

  /** Revoke the SSO session (best-effort, call on logout) */
  async logout(accessToken: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/auth/logout.php`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (err) {
      this.logger.warn('NSO SSO logout failed (non-fatal)', (err as Error)?.message);
    }
  }

  /** Verify the signed state returned by the SSO server */
  verifyState(state: string): boolean {
    if (!state || typeof state !== 'string') return false;

    const lastDot = state.lastIndexOf('.');
    if (lastDot < 1) return false;

    const payload = state.slice(0, lastDot);
    const receivedSig = state.slice(lastDot + 1);

    const expectedSig = crypto
      .createHmac('sha256', this.hmacKey)
      .update(payload)
      .digest('base64url');

    try {
      const a = Buffer.from(expectedSig);
      const b = Buffer.from(receivedSig);
      if (a.length !== b.length) return false;
      if (!crypto.timingSafeEqual(a, b)) return false;
    } catch {
      return false;
    }

    // State expires after 10 minutes
    const parts = payload.split('.');
    if (parts.length < 2) return false;
    const ts = parseInt(parts[1], 36);
    return !isNaN(ts) && Date.now() - ts < 10 * 60 * 1000;
  }

  private generateSignedState(): string {
    const rand = crypto.randomBytes(16).toString('hex');
    const ts = Date.now().toString(36);
    const payload = `${rand}.${ts}`;
    const sig = crypto.createHmac('sha256', this.hmacKey).update(payload).digest('base64url');
    return `${payload}.${sig}`;
  }
}
