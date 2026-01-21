import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { StringValue } from 'ms';
@Module({
  controllers: [AuthController],
  providers: [AuthService, PrismaService, MailService, ConfigService, JwtStrategy],
  imports: [
    ConfigModule, // or make ConfigModule global in AppModule
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET", { infer: true }),
        signOptions: {
          expiresIn: (config.getOrThrow<string>("JWT_EXPIRES_IN", { infer: true }) ?? "15m") as StringValue,
        },
      }),
    }),
  ],
})
export class AuthModule { }
