"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
const crypto_1 = require("crypto");
const mail_service_1 = require("./mail.service");
const client_1 = require("@prisma/client");
const jwt_1 = require("@nestjs/jwt");
let AuthService = class AuthService {
    prisma;
    mailService;
    jwt;
    constructor(prisma, mailService, jwt) {
        this.prisma = prisma;
        this.mailService = mailService;
        this.jwt = jwt;
    }
    async signup(dto) {
        const { rawToken, hashedToken } = this.generateVerificationToken();
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existing) {
            throw new common_1.BadRequestException('Email already in use');
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
        await this.mailService.sendVerificationEmail(user.email, 'Verify your email', `
        <p>Welcome ${user.name},</p>
        <p>Click the link below to verify your email:</p>
        <a href="${process.env.FRONTEND_URL}/verify-email?token=${rawToken}">
          Verify Email
        </a>
        <p>This link expires in 1 hour.</p>
      `);
        return {
            message: 'Account created successfully, please verify your email',
        };
    }
    async login(dto) {
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
            throw new common_1.BadRequestException('Invalid credentials');
        }
        const fullUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (!fullUser) {
            throw new common_1.BadRequestException('Invalid credentials');
        }
        const isPasswordValid = await bcrypt.compare(dto.password, fullUser.passwordHash);
        if (!isPasswordValid)
            throw new common_1.BadRequestException('Invalid credentials');
        if (fullUser.authState === client_1.AuthState.LOCKED)
            throw new common_1.BadRequestException('Account locked');
        if (fullUser.authState === client_1.AuthState.PENDING_VERIFY)
            throw new common_1.BadRequestException('Please verify your email');
        const payload = {
            sub: user.id,
            name: user.name,
            email: user.email,
        };
        const accessToken = await this.jwt.signAsync(payload);
        const { refreshToken, hashedToken } = this.generateRefreshTokenHashed();
        await this.prisma.session.create({
            data: {
                userId: user.id,
                deviceInfo: 'web(change later now hardcoded)',
                refreshToken: hashedToken,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
        });
        return { accessToken, refreshToken };
    }
    async verifyEmail(rawToken) {
        if (!rawToken || rawToken.length < 20) {
            throw new common_1.BadRequestException('Invalid token');
        }
        const hashedToken = (0, crypto_1.createHash)('sha256').update(rawToken).digest('hex');
        const user = await this.prisma.user.findFirst({
            where: {
                verificationToken: hashedToken,
                verificationTokenExpiresAt: { gt: new Date() },
            },
        });
        if (!user) {
            throw new common_1.BadRequestException('Invalid or expired token');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                isEmailVerified: true,
                authState: client_1.AuthState.AUTHED,
                verificationToken: null,
                verificationTokenExpiresAt: null,
            },
        });
        return {
            message: 'Email verified successfully',
        };
    }
    async refresh(refreshToken) {
        if (!refreshToken) {
            throw new common_1.BadRequestException('Refresh token is required');
        }
        const refreshTokenHash = (0, crypto_1.createHash)('sha256')
            .update(refreshToken)
            .digest('hex');
        const session = await this.prisma.session.findUnique({
            where: { refreshToken: refreshTokenHash },
            include: { user: true },
        });
        if (!session) {
            throw new common_1.BadRequestException('Invalid refresh token');
        }
        if (session.expiresAt <= new Date()) {
            throw new common_1.BadRequestException('Refresh token expired');
        }
        const payload = {
            sub: session.user.id,
            name: session.user.name,
            email: session.user.email,
        };
        const accessToken = await this.jwt.signAsync(payload);
        const { refreshToken: newRefreshToken, hashedToken: newRefreshTokenHash, } = this.generateRefreshTokenHashed();
        await this.prisma.session.update({
            where: { id: session.id },
            data: {
                refreshToken: newRefreshTokenHash,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
        });
        return {
            accessToken,
            refreshToken: newRefreshToken,
        };
    }
    generateVerificationToken() {
        const rawToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const hashedToken = (0, crypto_1.createHash)('sha256').update(rawToken).digest('hex');
        return { rawToken, hashedToken };
    }
    async resendVerificationEmail(email) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return {
                message: 'If an account with this email exists, you will receive a verification email.',
            };
        }
        if (user.isEmailVerified || user.authState !== client_1.AuthState.PENDING_VERIFY) {
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
        await this.mailService.sendVerificationEmail(user.email, 'Verify your email', `
        <p>Hi ${user.name},</p>
        <p>Here is your new verification link:</p>
        <a href="${process.env.FRONTEND_URL}/verify-email?token=${rawToken}">
          Verify Email
        </a>
        <p>This link expires in 1 hour.</p>
      `);
        return {
            message: 'Verification email sent successfully',
        };
    }
    generateRefreshTokenHashed() {
        const refreshToken = (0, crypto_1.randomBytes)(64).toString('hex');
        const hashedToken = (0, crypto_1.createHash)('sha256').update(refreshToken).digest('hex');
        return { refreshToken, hashedToken };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map