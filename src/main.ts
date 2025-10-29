import { bootstrap as globalAgentBootstrap } from 'global-agent';

// Initialize global proxy agent
if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) {
  globalAgentBootstrap();
  console.log('Global proxy agent initialized');
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`FocusBot is running on port ${port}`);
}

bootstrap();
