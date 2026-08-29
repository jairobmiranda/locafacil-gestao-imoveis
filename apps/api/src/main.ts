import 'reflect-metadata';
import './comum/ambiente';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const prefixo = process.env.API_PREFIX ?? 'api';
  app.setGlobalPrefix(prefixo);

  const origens = (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean);
  app.enableCors({ origin: origens.length ? origens : false, credentials: true });

  if (process.env.NODE_ENV !== 'production') {
    const doc = new DocumentBuilder()
      .setTitle('LocaFácil API')
      .setDescription('Gestão imobiliária: imóveis, lançamentos, contratos e cobrança')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup(`${prefixo}/docs`, app, SwaggerModule.createDocument(app, doc));
  }

  const porta = Number(process.env.API_PORT ?? 3000);
  await app.listen(porta, '0.0.0.0');
  Logger.log(`API disponível em http://localhost:${porta}/${prefixo}`, 'Bootstrap');
}

void bootstrap();
