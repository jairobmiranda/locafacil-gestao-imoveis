import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { MetricasService } from './metricas.service';

@Module({
  controllers: [DashboardController],
  providers: [MetricasService],
})
export class DashboardModule {}
