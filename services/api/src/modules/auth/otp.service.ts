import {
  Injectable,
  Inject,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import Redis from 'ioredis';

const OTP_TTL_SECONDS = 300; // 5 minutes
const RATE_LIMIT_WINDOW_SECONDS = 3600; // 1 hour
const RATE_LIMIT_MAX_REQUESTS = 5;

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  /**
   * Generate a cryptographically secure 6-digit OTP, store it in Redis,
   * and enforce rate limiting (max 5 requests per identifier per hour).
   */
  async generateAndStore(identifier: string): Promise<{ otp: string; expiresIn: number }> {
    const normalised = this.normaliseIdentifier(identifier);
    await this.enforceRateLimit(normalised);

    const otp = this.generateOtp();
    const otpKey = this.otpKey(normalised);

    await this.redis.set(otpKey, otp, 'EX', OTP_TTL_SECONDS);

    this.logger.log(`OTP generated for ${this.maskIdentifier(normalised)}`);

    return { otp, expiresIn: OTP_TTL_SECONDS };
  }

  /**
   * Verify the OTP for the given identifier. Deletes the OTP on success
   * to prevent replay. Returns true if valid.
   */
  async verify(identifier: string, otp: string): Promise<boolean> {
    const normalised = this.normaliseIdentifier(identifier);
    const otpKey = this.otpKey(normalised);

    const stored = await this.redis.get(otpKey);
    if (!stored) {
      return false;
    }

    // Constant-time comparison to mitigate timing attacks
    if (!this.timingSafeEqual(stored, otp)) {
      return false;
    }

    // Delete immediately to prevent replay
    await this.redis.del(otpKey);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private generateOtp(): string {
    // cryptographically secure random 6-digit code (100000–999999)
    return String(randomInt(100000, 999999 + 1));
  }

  private otpKey(identifier: string): string {
    return `otp:${identifier}`;
  }

  private rateLimitKey(identifier: string): string {
    return `otp_rate:${identifier}`;
  }

  private normaliseIdentifier(identifier: string): string {
    return identifier.trim().toLowerCase();
  }

  private maskIdentifier(identifier: string): string {
    if (identifier.includes('@')) {
      const [local, domain] = identifier.split('@');
      return `${local.slice(0, 2)}***@${domain}`;
    }
    return `***${identifier.slice(-4)}`;
  }

  private async enforceRateLimit(identifier: string): Promise<void> {
    const key = this.rateLimitKey(identifier);
    const current = await this.redis.incr(key);

    if (current === 1) {
      // First request in the window — set TTL
      await this.redis.expire(key, RATE_LIMIT_WINDOW_SECONDS);
    }

    if (current > RATE_LIMIT_MAX_REQUESTS) {
      const ttl = await this.redis.ttl(key);
      throw new HttpException(
        `OTP rate limit exceeded. Try again in ${ttl} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Constant-time string comparison to prevent timing-based OTP guessing.
   */
  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}
