import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from './mail.service';
import { BadRequestException } from '@nestjs/common';
import { AuthState } from '@prisma/client';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let mailService: MailService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockMailService = {
    sendVerificationEmail: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    mailService = module.get<MailService>(MailService);
  });

  describe('signup', () => {
    it('should create a new user', async () => {
      const dto = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-123',
        email: dto.email,
        name: dto.name,
        authState: AuthState.PENDING_VERIFY,
      });
      mockMailService.sendVerificationEmail.mockResolvedValue(true);

      const result = await service.signup(dto);

      expect(result).toEqual({
        message: 'Account created successfully, please verify your email',
      });
      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(mockMailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should throw if email already exists', async () => {
      const dto = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
      };

      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-123' });

      await expect(service.signup(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('login', () => {
    it('should return tokens on successful login', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const hashedPassword = await bcrypt.hash(dto.password, 10);

      mockPrisma.user.findUnique
        .mockResolvedValueOnce({
          id: 'user-123',
          email: dto.email,
          name: 'Test User',
          authState: AuthState.AUTHED,
        })
        .mockResolvedValueOnce({
          id: 'user-123',
          email: dto.email,
          passwordHash: hashedPassword,
          authState: AuthState.AUTHED,
        });

      mockJwtService.signAsync.mockResolvedValue('access-token');
      mockPrisma.session.create.mockResolvedValue({
        id: 'session-123',
        refreshToken: 'hashed-refresh-token',
      });

      const result = await service.login(dto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockJwtService.signAsync).toHaveBeenCalled();
      expect(mockPrisma.session.create).toHaveBeenCalled();
    });

    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nonexistent@example.com', password: 'password' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if password is invalid', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const hashedPassword = await bcrypt.hash('correctpassword', 10);

      mockPrisma.user.findUnique
        .mockResolvedValueOnce({
          id: 'user-123',
          email: dto.email,
          authState: AuthState.AUTHED,
        })
        .mockResolvedValueOnce({
          id: 'user-123',
          email: dto.email,
          passwordHash: hashedPassword,
          authState: AuthState.AUTHED,
        });

      await expect(service.login(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw if account is locked', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const hashedPassword = await bcrypt.hash(dto.password, 10);

      mockPrisma.user.findUnique
        .mockResolvedValueOnce({
          id: 'user-123',
          email: dto.email,
          authState: AuthState.LOCKED,
        })
        .mockResolvedValueOnce({
          id: 'user-123',
          email: dto.email,
          passwordHash: hashedPassword,
          authState: AuthState.LOCKED,
        });

      await expect(service.login(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw if email not verified', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const hashedPassword = await bcrypt.hash(dto.password, 10);

      mockPrisma.user.findUnique
        .mockResolvedValueOnce({
          id: 'user-123',
          email: dto.email,
          authState: AuthState.PENDING_VERIFY,
        })
        .mockResolvedValueOnce({
          id: 'user-123',
          email: dto.email,
          passwordHash: hashedPassword,
          authState: AuthState.PENDING_VERIFY,
        });

      await expect(service.login(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email and update auth state', async () => {
      const token = 'valid-token-123456789-should-be-long'; // Must be at least 20 chars
      const userId = 'user-123';

      mockPrisma.user.findFirst.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
      });

      mockPrisma.user.update.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        isEmailVerified: true,
        authState: AuthState.AUTHED,
      });

      const result = await service.verifyEmail(token);

      expect(result).toEqual({
        message: 'Email verified successfully',
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          isEmailVerified: true,
          authState: AuthState.AUTHED,
          verificationToken: null,
          verificationTokenExpiresAt: null,
        },
      });
    });

    it('should throw if token is invalid', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('refresh', () => {
    it('should generate new tokens', async () => {
      const refreshToken = 'refresh-token-123';

      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-123',
        user: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
        },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      mockJwtService.signAsync.mockResolvedValue('new-access-token');
      mockPrisma.session.update.mockResolvedValue({
        id: 'session-123',
        refreshToken: 'new-hashed-refresh-token',
      });

      const result = await service.refresh(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrisma.session.update).toHaveBeenCalled();
    });

    it('should throw if refresh token not provided', async () => {
      await expect(service.refresh('')).rejects.toThrow(BadRequestException);
    });

    it('should throw if session not found', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      await expect(service.refresh('invalid-token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if refresh token is expired', async () => {
      const refreshToken = 'expired-token';

      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session-123',
        user: { id: 'user-123' },
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('resendVerificationEmail', () => {
    it('should resend verification email', async () => {
      const email = 'test@example.com';

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email,
        name: 'Test User',
        isEmailVerified: false,
        authState: AuthState.PENDING_VERIFY,
      });

      mockPrisma.user.update.mockResolvedValue({
        id: 'user-123',
        email,
        verificationToken: 'new-hashed-token',
      });

      mockMailService.sendVerificationEmail.mockResolvedValue(true);

      const result = await service.resendVerificationEmail(email);

      expect(result).toEqual({
        message: 'Verification email sent successfully',
      });
      expect(mockMailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should not error if user not found (privacy)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.resendVerificationEmail(
        'nonexistent@example.com',
      );

      expect(result).toEqual({
        message:
          'If an account with this email exists, you will receive a verification email.',
      });
    });

    it('should throw if email already verified', async () => {
      const email = 'test@example.com';

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email,
        isEmailVerified: true,
        authState: AuthState.AUTHED,
      });

      const result = await service.resendVerificationEmail(email);

      expect(result).toEqual({
        message: 'Email already verified',
      });
    });
  });

  describe('generateVerificationToken', () => {
    it('should generate a verification token', () => {
      const { rawToken, hashedToken } = service.generateVerificationToken();

      expect(rawToken).toBeDefined();
      expect(hashedToken).toBeDefined();
      expect(rawToken).not.toEqual(hashedToken);
      expect(rawToken.length).toBeGreaterThan(0);
      expect(hashedToken.length).toBeGreaterThan(0);
    });
  });
});

