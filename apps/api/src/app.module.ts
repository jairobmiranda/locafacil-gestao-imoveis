import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AnexosModule } from './anexos/anexos.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { CobrancaModule } from './cobranca/cobranca.module';
import { DecimalInterceptor } from './comum/decimal.interceptor';
import { ContratosModule } from './contratos/contratos.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EmailModule } from './email/email.module';
import { ImoveisModule } from './imoveis/imoveis.module';
import { LancamentosModule } from './lancamentos/lancamentos.module';
import { PessoasModule } from './pessoas/pessoas.module';
import { PixModule } from './pix/pix.module';
import { PrismaModule } from './prisma/prisma.module';
import { SaudeController } from './saude/saude.controller';
import { UsuariosModule } from './usuarios/usuarios.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    ScheduleModule.forRoot(),
    PrismaModule,
    EmailModule,
    AuthModule,
    AnexosModule,
    CobrancaModule,
    ContratosModule,
    DashboardModule,
    ImoveisModule,
    LancamentosModule,
    PessoasModule,
    PixModule,
    UsuariosModule,
  ],
  controllers: [SaudeController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: DecimalInterceptor },
  ],
})
export class AppModule {}
