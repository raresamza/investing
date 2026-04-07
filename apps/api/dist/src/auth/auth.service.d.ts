import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { MailService } from './mail.service';
import { JwtService } from '@nestjs/jwt';
export declare class AuthService {
    private prisma;
    private readonly mailService;
    private readonly jwt;
    constructor(prisma: PrismaService, mailService: MailService, jwt: JwtService);
    signup(dto: SignupDto): Promise<{
        message: string;
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    verifyEmail(rawToken: string): Promise<{
        message: string;
    }>;
    refresh(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    generateVerificationToken(): {
        rawToken: string;
        hashedToken: string;
    };
    resendVerificationEmail(email: string): Promise<{
        message: string;
    }>;
    private generateRefreshTokenHashed;
}
