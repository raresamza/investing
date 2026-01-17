import { AuthService } from './auth.service';
import type { SignupDto } from './dto/signup.dto';
import type { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    signup(dto: SignupDto): Promise<{
        message: string;
    }>;
    login(dto: LoginDto): Promise<{
        email: string;
        name: string;
        id: string;
        authState: import("@prisma/client").$Enums.AuthState;
    }>;
    verifyEmail(token: string): Promise<{
        message: string;
    }>;
    resendVerification(email: string): Promise<{
        message: string;
    }>;
}
