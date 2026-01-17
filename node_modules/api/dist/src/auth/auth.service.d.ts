import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { MailService } from './mail.service';
export declare class AuthService {
    private prisma;
    private readonly mailService;
    constructor(prisma: PrismaService, mailService: MailService);
    signup(dto: SignupDto): Promise<{
        message: string;
    }>;
    login(dto: LoginDto): Promise<{
        email: string;
        name: string;
        id: string;
        authState: import("@prisma/client").$Enums.AuthState;
    }>;
    verifyEmail(rawToken: string): Promise<{
        message: string;
    }>;
    generateVerificationToken(): {
        rawToken: string;
        hashedToken: string;
    };
    resendVerificationEmail(email: string): Promise<{
        message: string;
    }>;
}
