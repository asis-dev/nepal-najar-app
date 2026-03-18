import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { OtpService } from './otp.service';

describe('OtpService', () => {
  let service: OtpService;
  let mockRedis: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockRedis = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      ttl: jest.fn().mockResolvedValue(3500),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: 'REDIS_CLIENT', useValue: mockRedis },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
  });

  describe('generateAndStore', () => {
    it('should generate a 6-digit code', async () => {
      const result = await service.generateAndStore('user@example.com');

      expect(result.otp).toBeDefined();
      expect(result.otp).toMatch(/^\d{6}$/);
      const num = parseInt(result.otp, 10);
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThanOrEqual(999999);
    });

    it('should store OTP in Redis with TTL of 300 seconds', async () => {
      const result = await service.generateAndStore('user@example.com');

      expect(mockRedis.set).toHaveBeenCalledWith(
        'otp:user@example.com',
        result.otp,
        'EX',
        300,
      );
    });

    it('should return expiresIn of 300 seconds', async () => {
      const result = await service.generateAndStore('user@example.com');

      expect(result.expiresIn).toBe(300);
    });

    it('should normalise the identifier (trim + lowercase)', async () => {
      await service.generateAndStore('  User@Example.COM  ');

      expect(mockRedis.set).toHaveBeenCalledWith(
        'otp:user@example.com',
        expect.any(String),
        'EX',
        300,
      );
    });

    it('should enforce rate limiting by incrementing rate limit key', async () => {
      await service.generateAndStore('user@example.com');

      expect(mockRedis.incr).toHaveBeenCalledWith('otp_rate:user@example.com');
    });

    it('should set TTL on rate limit key on first request', async () => {
      mockRedis.incr.mockResolvedValue(1);

      await service.generateAndStore('user@example.com');

      expect(mockRedis.expire).toHaveBeenCalledWith('otp_rate:user@example.com', 3600);
    });

    it('should not reset TTL on subsequent requests within window', async () => {
      mockRedis.incr.mockResolvedValue(3);

      await service.generateAndStore('user@example.com');

      expect(mockRedis.expire).not.toHaveBeenCalled();
    });
  });

  describe('verify', () => {
    it('should return true for correct OTP', async () => {
      mockRedis.get.mockResolvedValue('123456');

      const result = await service.verify('user@example.com', '123456');

      expect(result).toBe(true);
    });

    it('should return false for incorrect OTP', async () => {
      mockRedis.get.mockResolvedValue('123456');

      const result = await service.verify('user@example.com', '654321');

      expect(result).toBe(false);
    });

    it('should return false for expired/missing OTP', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.verify('user@example.com', '123456');

      expect(result).toBe(false);
    });

    it('should delete OTP after successful verification (no replay)', async () => {
      mockRedis.get.mockResolvedValue('123456');

      await service.verify('user@example.com', '123456');

      expect(mockRedis.del).toHaveBeenCalledWith('otp:user@example.com');
    });

    it('should NOT delete OTP after failed verification', async () => {
      mockRedis.get.mockResolvedValue('123456');

      await service.verify('user@example.com', '000000');

      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should normalise identifier before lookup', async () => {
      mockRedis.get.mockResolvedValue('123456');

      await service.verify('  User@Example.COM  ', '123456');

      expect(mockRedis.get).toHaveBeenCalledWith('otp:user@example.com');
    });
  });

  describe('rate limiting', () => {
    it('should throw HttpException (429) after 5 requests in the rate limit window', async () => {
      // Simulate the 6th request (exceeds max of 5)
      mockRedis.incr.mockResolvedValue(6);
      mockRedis.ttl.mockResolvedValue(2400);

      await expect(
        service.generateAndStore('user@example.com'),
      ).rejects.toThrow(HttpException);

      try {
        await service.generateAndStore('user@example.com');
      } catch (e: any) {
        expect(e.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(e.message).toContain('rate limit exceeded');
      }
    });

    it('should allow up to 5 requests within the window', async () => {
      mockRedis.incr.mockResolvedValue(5);

      await expect(
        service.generateAndStore('user@example.com'),
      ).resolves.toBeDefined();
    });
  });
});
