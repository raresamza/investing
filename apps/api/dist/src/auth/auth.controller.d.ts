import { AuthService } from './auth.service';
import type { SignupDto } from './dto/signup.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    signup(dto: SignupDto): Promise<{
        id: string;
        email: string;
        name: string;
        authState: import("@prisma/client").$Enums.AuthState;
    }>;
}
