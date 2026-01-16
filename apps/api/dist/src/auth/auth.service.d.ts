import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
export declare class AuthService {
    private prisma;
    constructor(prisma: PrismaService);
    signup(dto: SignupDto): Promise<{
        id: string;
        email: string;
        name: string;
        authState: import("@prisma/client").$Enums.AuthState;
    }>;
}
