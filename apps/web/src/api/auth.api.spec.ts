import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as authApi from './auth.api';

// Mock axios
vi.mock('./axios-instance', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import axiosInstance from './axios-instance';

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signup', () => {
    it('should call signup endpoint with user data', async () => {
      const dto = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
      };

      const expected = {
        message: 'Account created successfully, please verify your email',
      };

      (axiosInstance.post as any).mockResolvedValue({ data: expected });

      const result = await authApi.signup(dto);

      expect(result).toEqual(expected);
      expect(axiosInstance.post).toHaveBeenCalledWith('/auth/signup', dto);
    });
  });

  describe('login', () => {
    it('should call login endpoint and return tokens', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const expected = {
        accessToken: 'access-token-123',
      };

      (axiosInstance.post as any).mockResolvedValue({ data: expected });

      const result = await authApi.login(dto);

      expect(result).toEqual(expected);
      expect(axiosInstance.post).toHaveBeenCalledWith('/auth/login', dto);
    });

    it('should throw on login error', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      (axiosInstance.post as any).mockRejectedValue({
        response: {
          data: { message: 'Invalid credentials' },
        },
      });

      await expect(authApi.login(dto)).rejects.toThrow();
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with token', async () => {
      const token = 'verification-token-123';
      const expected = {
        message: 'Email verified successfully',
      };

      (axiosInstance.get as any).mockResolvedValue({ data: expected });

      const result = await authApi.verifyEmail(token);

      expect(result).toEqual(expected);
      expect(axiosInstance.get).toHaveBeenCalledWith('/auth/verify-email', {
        params: { token },
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      });
    });
  });

  describe('resendVerificationEmail', () => {
    it('should resend verification email', async () => {
      const email = 'test@example.com';
      const expected = {
        message: 'Verification email sent successfully',
      };

      (axiosInstance.post as any).mockResolvedValue({ data: expected });

      const result = await authApi.resendVerificationEmail(email);

      expect(result).toEqual(expected);
      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/auth/resend-verification',
        { email }
      );
    });
  });
});
