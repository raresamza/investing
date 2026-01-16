
import { Controller, Post, Body, UsePipes } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupSchema } from './dto/signup.dto';
import type { SignupDto } from './dto/signup.dto';
import { ZodValidationPipe } from './pipes/zod-validation.pipe';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @UsePipes(new ZodValidationPipe(SignupSchema))
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }
}
