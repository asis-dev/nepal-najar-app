import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../../entities/user.entity';
import { UserRole } from '../../entities/user-role.entity';
import { Role } from '../../entities/role.entity';
import { RolePermission } from '../../entities/role-permission.entity';
import { OtpService } from './otp.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtPayload } from './strategies/jwt.strategy';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const ACCESS_TOKEN_EXPIRY_SECONDS = 900;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly otpService: OtpService,
  ) {}

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  async requestOtp(dto: RequestOtpDto) {
    const { otp, expiresIn } = await this.otpService.generateAndStore(
      dto.identifier,
    );

    // In development, log the OTP so it can be used for testing.
    // In production this is where SMS / email dispatch would happen.
    const isDev = this.configService.get<string>('NODE_ENV') !== 'production';
    if (isDev) {
      this.logger.debug(`[DEV] OTP for ${dto.identifier}: ${otp}`);
    }

    const response: { message: string; expires_in: number; dev_otp?: string } = {
      message: 'OTP sent successfully',
      expires_in: expiresIn,
    };

    // In dev mode, return the OTP in the response so pilot testers
    // can log in without SMS/email. NEVER enabled in production.
    if (isDev) {
      response.dev_otp = otp;
    }

    return response;
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const valid = await this.otpService.verify(dto.identifier, dto.otp);
    if (!valid) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const user = await this.findOrCreateUser(dto.identifier);

    // Load roles with permissions
    const userRoles = await this.userRoleRepo.find({
      where: { user_id: user.id },
      relations: [
        'role',
        'role.role_permissions',
        'role.role_permissions.permission',
      ],
    });

    const payload = this.buildJwtPayload(user, userRoles);

    const accessToken = this.jwtService.sign(
      { ...payload, type: 'access' as const },
      { expiresIn: ACCESS_TOKEN_EXPIRY },
    );

    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' as const },
      { expiresIn: REFRESH_TOKEN_EXPIRY },
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_EXPIRY_SECONDS,
      user: this.toUserProfile(user, userRoles),
    };
  }

  async refreshToken(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Re-fetch user and roles to pick up any permission changes
    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User not found or inactive');
    }

    const userRoles = await this.userRoleRepo.find({
      where: { user_id: user.id },
      relations: [
        'role',
        'role.role_permissions',
        'role.role_permissions.permission',
      ],
    });

    const newPayload = this.buildJwtPayload(user, userRoles);

    const accessToken = this.jwtService.sign(
      { ...newPayload, type: 'access' as const },
      { expiresIn: ACCESS_TOKEN_EXPIRY },
    );

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_EXPIRY_SECONDS,
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const userRoles = await this.userRoleRepo.find({
      where: { user_id: user.id },
      relations: [
        'role',
        'role.role_permissions',
        'role.role_permissions.permission',
      ],
    });

    return this.toUserProfile(user, userRoles);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildJwtPayload(
    user: User,
    userRoles: UserRole[],
  ): Omit<JwtPayload, 'type' | 'iat' | 'exp'> {
    const roles = [...new Set(userRoles.map((ur) => ur.role.name))];

    const governmentUnitIds = [
      ...new Set(
        userRoles
          .filter((ur) => ur.government_unit_id !== null)
          .map((ur) => ur.government_unit_id as string),
      ),
    ];

    const permissions = [
      ...new Set(
        userRoles.flatMap((ur) =>
          (ur.role.role_permissions ?? []).map((rp) => rp.permission.key),
        ),
      ),
    ];

    return {
      sub: user.id,
      roles,
      government_unit_ids: governmentUnitIds,
      permissions,
    };
  }

  private async findOrCreateUser(identifier: string): Promise<User> {
    const isEmail = identifier.includes('@');
    const normalised = identifier.trim().toLowerCase();

    const whereClause = isEmail
      ? { email: normalised }
      : { phone_number: normalised };

    let user = await this.userRepo.findOne({ where: whereClause });

    if (!user) {
      user = this.userRepo.create({
        ...(isEmail
          ? { email: normalised, display_name: normalised.split('@')[0] }
          : {
              phone_number: normalised,
              display_name: `User ${normalised.slice(-4)}`,
            }),
        verification_level: 'unverified',
        language_preference: 'en',
        status: 'active',
      });
      user = await this.userRepo.save(user);

      // Assign default citizen role
      const citizenRole = await this.roleRepo.findOne({
        where: { name: 'citizen' },
      });

      if (citizenRole) {
        const userRole = this.userRoleRepo.create({
          user_id: user.id,
          role_id: citizenRole.id,
        });
        await this.userRoleRepo.save(userRole);
      } else {
        this.logger.warn(
          'Default "citizen" role not found in database — new user created without a role.',
        );
      }
    }

    return user;
  }

  private toUserProfile(user: User, userRoles: UserRole[]) {
    const roles = [...new Set(userRoles.map((ur) => ur.role.name))];

    const governmentUnitIds = [
      ...new Set(
        userRoles
          .filter((ur) => ur.government_unit_id !== null)
          .map((ur) => ur.government_unit_id as string),
      ),
    ];

    const permissions = [
      ...new Set(
        userRoles.flatMap((ur) =>
          (ur.role.role_permissions ?? []).map((rp) => rp.permission.key),
        ),
      ),
    ];

    return {
      id: user.id,
      phone_number: user.phone_number,
      email: user.email,
      display_name: user.display_name,
      profile_photo_url: user.profile_photo_url,
      verification_level: user.verification_level,
      language_preference: user.language_preference,
      roles,
      government_unit_ids: governmentUnitIds,
      permissions,
    };
  }
}
