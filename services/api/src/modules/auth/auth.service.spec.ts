import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { User } from '../../entities/user.entity';
import { UserRole } from '../../entities/user-role.entity';
import { Role } from '../../entities/role.entity';
import { RolePermission } from '../../entities/role-permission.entity';

describe('AuthService', () => {
  let service: AuthService;
  let otpService: Record<string, jest.Mock>;
  let jwtService: Record<string, jest.Mock>;
  let configService: Record<string, jest.Mock>;
  let userRepo: Record<string, jest.Mock>;
  let userRoleRepo: Record<string, jest.Mock>;
  let roleRepo: Record<string, jest.Mock>;
  let rolePermissionRepo: Record<string, jest.Mock>;

  const mockUser: Partial<User> = {
    id: 'user-uuid-1',
    phone_number: '+9779800000001',
    email: null,
    display_name: 'User 0001',
    profile_photo_url: null,
    verification_level: 'unverified',
    language_preference: 'en',
    status: 'active',
  };

  const mockRole: Partial<Role> = {
    id: 'role-uuid-1',
    name: 'citizen',
    role_permissions: [],
  };

  const mockUserRole: Partial<UserRole> = {
    id: 'ur-uuid-1',
    user_id: 'user-uuid-1',
    role_id: 'role-uuid-1',
    government_unit_id: null,
    role: mockRole as Role,
  };

  beforeEach(async () => {
    otpService = {
      generateAndStore: jest.fn().mockResolvedValue({ otp: '123456', expiresIn: 300 }),
      verify: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('signed-jwt-token'),
      verify: jest.fn(),
    };

    configService = {
      get: jest.fn().mockReturnValue('development'),
    };

    userRepo = {
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ id: 'new-user-uuid', ...dto })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    userRoleRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((dto) => dto),
      save: jest.fn().mockResolvedValue(undefined),
    };

    roleRepo = {
      findOne: jest.fn(),
    };

    rolePermissionRepo = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: OtpService, useValue: otpService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(UserRole), useValue: userRoleRepo },
        { provide: getRepositoryToken(Role), useValue: roleRepo },
        { provide: getRepositoryToken(RolePermission), useValue: rolePermissionRepo },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('verifyOtp', () => {
    it('should return tokens on valid OTP', async () => {
      otpService.verify.mockResolvedValue(true);
      userRepo.findOne.mockResolvedValue(mockUser);
      userRoleRepo.find.mockResolvedValue([mockUserRole]);

      const result = await service.verifyOtp({
        identifier: '+9779800000001',
        otp: '123456',
      });

      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
      expect(result.token_type).toBe('Bearer');
      expect(result.expires_in).toBe(900);
      expect(result.user).toBeDefined();
    });

    it('should throw UnauthorizedException on invalid OTP', async () => {
      otpService.verify.mockResolvedValue(false);

      await expect(
        service.verifyOtp({ identifier: '+9779800000001', otp: '000000' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should create new user if not found (phone number)', async () => {
      otpService.verify.mockResolvedValue(true);

      // findOne returns null for the phone lookup, then null again when
      // findOrCreateUser calls findOne, simulating a new user
      userRepo.findOne.mockResolvedValue(null);
      roleRepo.findOne.mockResolvedValue(mockRole);
      userRoleRepo.find.mockResolvedValue([]);

      const result = await service.verifyOtp({
        identifier: '+9779800000002',
        otp: '123456',
      });

      // create should have been called for the new user
      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          phone_number: '+9779800000002',
          status: 'active',
        }),
      );
      expect(userRepo.save).toHaveBeenCalled();
      expect(result.access_token).toBeDefined();
    });

    it('should create new user if not found (email)', async () => {
      otpService.verify.mockResolvedValue(true);
      userRepo.findOne.mockResolvedValue(null);
      roleRepo.findOne.mockResolvedValue(mockRole);
      userRoleRepo.find.mockResolvedValue([]);

      const result = await service.verifyOtp({
        identifier: 'New@Example.com',
        otp: '123456',
      });

      // Email should be normalized to lowercase
      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@example.com',
          display_name: 'new',
        }),
      );
      expect(result.access_token).toBeDefined();
    });

    it('should return existing user if found', async () => {
      otpService.verify.mockResolvedValue(true);
      userRepo.findOne.mockResolvedValue(mockUser);
      userRoleRepo.find.mockResolvedValue([mockUserRole]);

      const result = await service.verifyOtp({
        identifier: '+9779800000001',
        otp: '123456',
      });

      // create should NOT have been called
      expect(userRepo.create).not.toHaveBeenCalled();
      expect(result.user.id).toBe(mockUser.id);
    });

    it('should sign JWT with correct payload structure', async () => {
      otpService.verify.mockResolvedValue(true);
      userRepo.findOne.mockResolvedValue(mockUser);
      userRoleRepo.find.mockResolvedValue([mockUserRole]);

      await service.verifyOtp({
        identifier: '+9779800000001',
        otp: '123456',
      });

      // Two sign calls: one for access, one for refresh
      expect(jwtService.sign).toHaveBeenCalledTimes(2);

      // Access token call
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.id,
          roles: ['citizen'],
          type: 'access',
        }),
        { expiresIn: '15m' },
      );

      // Refresh token call
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.id,
          type: 'refresh',
        }),
        { expiresIn: '7d' },
      );
    });

    it('should assign default citizen role to new users', async () => {
      otpService.verify.mockResolvedValue(true);
      userRepo.findOne.mockResolvedValue(null);
      roleRepo.findOne.mockResolvedValue(mockRole);
      userRoleRepo.find.mockResolvedValue([]);

      await service.verifyOtp({
        identifier: '+9779800000003',
        otp: '123456',
      });

      expect(roleRepo.findOne).toHaveBeenCalledWith({
        where: { name: 'citizen' },
      });
      expect(userRoleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role_id: mockRole.id,
        }),
      );
      expect(userRoleRepo.save).toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should throw UnauthorizedException on invalid token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      await expect(
        service.refreshToken('invalid-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if token type is not refresh', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'user-uuid-1',
        roles: ['citizen'],
        type: 'access',
        permissions: [],
        government_unit_ids: [],
      });

      await expect(
        service.refreshToken('access-token-not-refresh'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is not found or inactive', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'user-uuid-1',
        roles: ['citizen'],
        type: 'refresh',
        permissions: [],
        government_unit_ids: [],
      });
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.refreshToken('valid-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return new access token for valid refresh token', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'user-uuid-1',
        roles: ['citizen'],
        type: 'refresh',
        permissions: [],
        government_unit_ids: [],
      });
      userRepo.findOne.mockResolvedValue(mockUser);
      userRoleRepo.find.mockResolvedValue([mockUserRole]);

      const result = await service.refreshToken('valid-refresh-token');

      expect(result.access_token).toBeDefined();
      expect(result.token_type).toBe('Bearer');
      expect(result.expires_in).toBe(900);
    });

    it('should throw UnauthorizedException if user status is not active', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'user-uuid-1',
        roles: ['citizen'],
        type: 'refresh',
        permissions: [],
        government_unit_ids: [],
      });
      userRepo.findOne.mockResolvedValue({ ...mockUser, status: 'suspended' });

      await expect(
        service.refreshToken('valid-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('should return user with roles', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      userRoleRepo.find.mockResolvedValue([mockUserRole]);

      const result = await service.getProfile('user-uuid-1');

      expect(result.id).toBe(mockUser.id);
      expect(result.display_name).toBe(mockUser.display_name);
      expect(result.roles).toEqual(['citizen']);
      expect(result.permissions).toEqual([]);
      expect(result.government_unit_ids).toEqual([]);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getProfile('non-existent-user'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should include permissions from role_permissions', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);

      const roleWithPerms = {
        ...mockRole,
        role_permissions: [
          { permission: { key: 'project.create' } },
          { permission: { key: 'project.read' } },
        ],
      };

      userRoleRepo.find.mockResolvedValue([
        { ...mockUserRole, role: roleWithPerms },
      ]);

      const result = await service.getProfile('user-uuid-1');

      expect(result.permissions).toContain('project.create');
      expect(result.permissions).toContain('project.read');
    });

    it('should include government_unit_ids from user roles', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      userRoleRepo.find.mockResolvedValue([
        {
          ...mockUserRole,
          government_unit_id: 'gu-1',
          role: mockRole,
        },
      ]);

      const result = await service.getProfile('user-uuid-1');

      expect(result.government_unit_ids).toEqual(['gu-1']);
    });

    it('should deduplicate roles and permissions', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);

      const roleA = {
        ...mockRole,
        role_permissions: [{ permission: { key: 'project.read' } }],
      };

      // User has same role twice (scoped to different units)
      userRoleRepo.find.mockResolvedValue([
        { ...mockUserRole, government_unit_id: 'gu-1', role: roleA },
        { ...mockUserRole, id: 'ur-uuid-2', government_unit_id: 'gu-2', role: roleA },
      ]);

      const result = await service.getProfile('user-uuid-1');

      // Should be deduplicated
      expect(result.roles).toEqual(['citizen']);
      expect(result.permissions).toEqual(['project.read']);
      expect(result.government_unit_ids).toHaveLength(2);
    });
  });
});
