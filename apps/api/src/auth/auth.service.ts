
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { randomBytes, createHash } from 'crypto';
import { MailService } from './mail.service';
import { AuthState } from '@prisma/client';
import id from 'zod/v4/locales/id.js';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private readonly mailService: MailService
  ) { }

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
    console.log("THIS IS THE LINK THAT SHOULD BE SENT:" + process.env.FRONTEND_URL + " /verify-email");
    console.log(process.env.FRONTEND_URL);
    await this.mailService.sendVerificationEmail(
      user.email,
      "Verify your email",
      `
        <p>Welcome ${user.name},</p>
        <p>Click the link below to verify your email:</p>
        <a href="${process.env.FRONTEND_URL}/verify-email?token=${rawToken}">
          Verify Email
        </a>
        <p>This link expires in 1 hour.</p>
      `
    );


    return {
      message: "Account created successfully, please verify your email"
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        name: true,
        authState: true, // optional
      },
    });

    if (!user) {
      throw new BadRequestException("Invalid credentials");
    }

    const fullUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (user) {
      const isPasswordValid = await bcrypt.compare(dto.password, fullUser!.passwordHash)

      if (!isPasswordValid) throw new BadRequestException("Invalid credentials");
      if (fullUser!.authState === AuthState.LOCKED) throw new BadRequestException("Account locked");
      if (fullUser!.authState === AuthState.PENDING_VERIFY) throw new BadRequestException("Please verify your email");

    } else {
      throw new BadRequestException("Invalid credentials")
    }

    return user
  }

  async verifyEmail(rawToken: string) {
    if (!rawToken || rawToken.length < 20) {
      throw new BadRequestException("Invalid token")
    }

    const hashedToken = createHash("sha256").update(rawToken).digest("hex");

    const user = await this.prisma.user.findFirst({
      where: {
        verificationToken: hashedToken,
        verificationTokenExpiresAt: { gt: new Date() }
      }
    })

    if (!user) {
      throw new BadRequestException("Invalid or expired token")
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        authState: AuthState.AUTHED,
        verificationToken: null,
        verificationTokenExpiresAt: null
      }
    })

    return {
      message: "Email verified successfully"
    }
  }

  generateVerificationToken() {
    const rawToken = randomBytes(32).toString("hex");
    const hashedToken = createHash("sha256").update(rawToken).digest("hex");
    return { rawToken, hashedToken }
  }
}
