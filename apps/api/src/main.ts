import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log('DATABASE_URL from process.env:', process.env.DATABASE_URL ? 'DEFINED' : 'UNDEFINED');
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ["http://localhost:3000"], // Next dev origin
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  await app.listen(process.env.PORT ?? 4000);

}
bootstrap();
