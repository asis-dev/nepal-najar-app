import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  /** User UUID */
  sub: string;
  /** Role names, e.g. ['ministry_admin', 'project_officer'] */
  roles: string[];
  /** Government unit UUIDs the user is scoped to */
  government_unit_ids: string[];
  /** Permission keys aggregated from all roles */
  permissions: string[];
  /** Token type: 'access' | 'refresh' */
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Called by Passport after JWT signature is validated.
   * Returned object is attached to `request.user`.
   */
  validate(payload: JwtPayload): JwtPayload {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    return {
      sub: payload.sub,
      roles: payload.roles,
      government_unit_ids: payload.government_unit_ids,
      permissions: payload.permissions,
      type: payload.type,
    };
  }
}
