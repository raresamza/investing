
import { Controller, Post, Body, UsePipes, Get, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupSchema } from './dto/signup.dto';
import type { SignupDto, } from './dto/signup.dto';
import { LoginSchema } from './dto/login.dto';
import type { LoginDto } from './dto/login.dto';
import { ZodValidationPipe } from './pipes/zod-validation.pipe';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @UsePipes(new ZodValidationPipe(SignupSchema))
  async signup(@Body() dto: SignupDto) {
    try{
    return this.authService.signup(dto);
    }catch(error){
      console.log(error);
      throw error;
    }
  }


  @Post("login")
  @UsePipes(new ZodValidationPipe(LoginSchema))
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get("verify-email")
  async verifyEmail(@Query("token") token:string) {
    return this.authService.verifyEmail(token);
  }
}
