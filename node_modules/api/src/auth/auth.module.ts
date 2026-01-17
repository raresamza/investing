import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService,PrismaService,MailService],
})
export class AuthModule {}
