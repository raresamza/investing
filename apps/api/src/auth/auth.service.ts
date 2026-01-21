import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { randomBytes, createHash } from 'crypto';
import { MailService } from './mail.service';
import { AuthState } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly jwt: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const { rawToken, hashedToken } = this.generateVerificationToken();

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new BadRequestException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        verificationToken: hashedToken,
        verificationTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
      select: {
        id: true,
        email: true,
        name: true,
        authState: true,
      },
    });

    await this.mailService.sendVerificationEmail(
      user.email,
      'Verify your email',
      `
        <p>Welcome ${user.name},</p>
        <p>Click the link below to verify your email:</p>
        <a href="${process.env.FRONTEND_URL}/verify-email?token=${rawToken}">
          Verify Email
        </a>
        <p>This link expires in 1 hour.</p>
      `,
    );

    return {
      message: 'Account created successfully, please verify your email',
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        name: true,
        authState: true,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    const fullUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!fullUser) {
      throw new BadRequestException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      fullUser.passwordHash,
    );

    if (!isPasswordValid) throw new BadRequestException('Invalid credentials');
    if (fullUser.authState === AuthState.LOCKED)
      throw new BadRequestException('Account locked');
    if (fullUser.authState === AuthState.PENDING_VERIFY)
      throw new BadRequestException('Please verify your email');

    const payload = {
      sub: user.id,
      name: user.name,
      email: user.email,
    };

    // Consider adding expiresIn here, example: { expiresIn: '15m' }
    const accessToken = await this.jwt.signAsync(payload);

    // Generate refresh token once; store hash in DB, return raw to client (or set cookie)
    const { refreshToken, hashedToken } = this.generateRefreshTokenHashed();

    await this.prisma.session.create({
      data: {
        userId: user.id,
        deviceInfo: 'web(change later now hardcoded)',
        refreshToken: hashedToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
      },
    });

    return { accessToken, refreshToken };
  }

  async verifyEmail(rawToken: string) {
    if (!rawToken || rawToken.length < 20) {
      throw new BadRequestException('Invalid token');
    }

    const hashedToken = createHash('sha256').update(rawToken).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: {
        verificationToken: hashedToken,
        verificationTokenExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        authState: AuthState.AUTHED,
        verificationToken: null,
        verificationTokenExpiresAt: null,
      },
    });

    return {
      message: 'Email verified successfully',
    };
  }

  // Renamed from refreshToken(...) to refresh(...) to avoid name confusion
  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    const refreshTokenHash = createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    // If refreshToken is unique in Prisma schema, findUnique is better than findFirst
    const session = await this.prisma.session.findUnique({
      where: { refreshToken: refreshTokenHash },
      include: { user: true },
    });

    if (!session) {
      throw new BadRequestException('Invalid refresh token');
    }

    if (session.expiresAt <= new Date()) {
      throw new BadRequestException('Refresh token expired');
    }

    const payload = {
      sub: session.user.id,
      name: session.user.name,
      email: session.user.email,
    };

    // Consider adding expiresIn here, example: { expiresIn: '15m' }
    const accessToken = await this.jwt.signAsync(payload);

    // Rotate refresh token (recommended): generate ONCE so raw/hash match
    const {
      refreshToken: newRefreshToken,
      hashedToken: newRefreshTokenHash,
    } = this.generateRefreshTokenHashed();

    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: newRefreshTokenHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
      },
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  generateVerificationToken() {
    const rawToken = randomBytes(32).toString('hex');
    const hashedToken = createHash('sha256').update(rawToken).digest('hex');
    return { rawToken, hashedToken };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return {
        message:
          'If an account with this email exists, you will receive a verification email.',
      };
    }

    if (user.isEmailVerified || user.authState !== AuthState.PENDING_VERIFY) {
      return {
        message: 'Email already verified',
      };
    }

    const { rawToken, hashedToken } = this.generateVerificationToken();

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: hashedToken,
        verificationTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await this.mailService.sendVerificationEmail(
      user.email,
      'Verify your email',
      `
        <p>Hi ${user.name},</p>
        <p>Here is your new verification link:</p>
        <a href="${process.env.FRONTEND_URL}/verify-email?token=${rawToken}">
          Verify Email
        </a>
        <p>This link expires in 1 hour.</p>
      `,
    );

    return {
      message: 'Verification email sent successfully',
    };
  }

  private generateRefreshTokenHashed() {
    const refreshToken = randomBytes(64).toString('hex');
    const hashedToken = createHash('sha256').update(refreshToken).digest('hex');
    return { refreshToken, hashedToken };
  }
}
