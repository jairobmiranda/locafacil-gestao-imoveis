import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { naturezaSchema } from '@locafacil/contracts';
import { ZodValidationPipe } from '../comum/zod-validation.pipe';
import { PrismaService } from '../prisma/prisma.service';

const listarCategoriasSchema = z.object({
  natureza: naturezaSchema.optional(),
  incluirInativas: z.coerce.boolean().default(false),
});

@ApiTags('categorias')
@ApiBearerAuth()
@Controller('categorias')
export class CategoriasController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Lista as categorias de lançamento' })
  listar(
    @Query(new ZodValidationPipe(listarCategoriasSchema))
    filtros: z.infer<typeof listarCategoriasSchema>,
  ) {
    return this.prisma.categoria.findMany({
      where: {
        natureza: filtros.natureza,
        ...(filtros.incluirInativas ? {} : { ativa: true }),
      },
      orderBy: [{ natureza: 'asc' }, { nome: 'asc' }],
    });
  }
}
