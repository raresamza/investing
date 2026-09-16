import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockService = {
    signup: jest.fn(),
    login: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerificationEmail: jest.fn(),
    refresh: jest.fn(),
  };

  const mockResponse = {
    cookie: jest.fn().mockReturnThis(),
  } as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('should call authService.signup with dto', async () => {
      const dto = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
      };

      mockService.signup.mockResolvedValue({
        message: 'Account created successfully, please verify your email',
      });

      const result = await controller.signup(dto);

      expect(result).toEqual({
        message: 'Account created successfully, please verify your email',
      });
      expect(mockService.signup).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('should login user and set cookies', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockService.login.mockResolvedValue({
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
      });

      const result = await controller.login(dto, mockResponse);

      expect(result).toEqual({ accessToken: 'access-token-123' });
      expect(mockService.login).toHaveBeenCalledWith(dto);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-token-123',
        expect.objectContaining({
          httpOnly: true,
          path: '/',
        })
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'access_token',
        'access-token-123',
        expect.objectContaining({
          httpOnly: true,
          path: '/',
        })
      );
    });
  });

  describe('refresh', () => {
    it('should refresh tokens and set cookies', async () => {
      const mockReq = {
        cookies: {
          refresh_token: 'refresh-token-123',
        },
      };

      mockService.refresh.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const result = await controller.refresh(mockReq as any, mockResponse);

      expect(result).toEqual({ accessToken: 'new-access-token' });
      expect(mockService.refresh).toHaveBeenCalledWith('refresh-token-123');
      expect(mockResponse.cookie).toHaveBeenCalled();
    });

    it('should throw if refresh_token cookie is missing', async () => {
      const mockReq = {
        cookies: {},
      };

      mockService.refresh.mockImplementation(() => {
        throw new Error('Refresh token is required');
      });

      await expect(
        controller.refresh(mockReq as any, mockResponse)
      ).rejects.toThrow();
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with token', async () => {
      const token = 'verification-token-123';

      mockService.verifyEmail.mockResolvedValue({
        message: 'Email verified successfully',
      });

      const result = await controller.verifyEmail(token);

      expect(result).toEqual({
        message: 'Email verified successfully',
      });
      expect(mockService.verifyEmail).toHaveBeenCalledWith(token);
    });
  });

  describe('resendVerification', () => {
    it('should resend verification email', async () => {
      const email = 'test@example.com';

      mockService.resendVerificationEmail.mockResolvedValue({
        message: 'Verification email sent successfully',
      });

      const result = await controller.resendVerification(email);

      expect(result).toEqual({
        message: 'Verification email sent successfully',
      });
      expect(mockService.resendVerificationEmail).toHaveBeenCalledWith(email);
    });
  });
});

