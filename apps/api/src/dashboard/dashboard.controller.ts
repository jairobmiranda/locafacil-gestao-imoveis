import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MetricasService } from './metricas.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly metricas: MetricasService) {}

  @Get('resumo')
  @ApiOperation({ summary: 'Indicadores consolidados da carteira' })
  resumo() {
    return this.metricas.resumo();
  }

  @Get('imoveis')
  @ApiOperation({ summary: 'ROI, retorno mensal e yield por imóvel' })
  desempenho() {
    return this.metricas.desempenhoPorImovel();
  }

  @Get('alertas')
  @ApiOperation({ summary: 'Contratos vencendo, reajustes e inadimplência' })
  alertas() {
    return this.metricas.alertas();
  }
}
