import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  atualizarModeloEmailSchema,
  atualizarRegraCobrancaSchema,
  atualizarReguaCobrancaSchema,
  criarModeloEmailSchema,
  criarRegraCobrancaSchema,
  criarReguaCobrancaSchema,
  enviarCobrancaManualSchema,
  listarNotificacoesSchema,
  testarEmailSchema,
  VARIAVEIS_MODELO_EMAIL,
  type AtualizarModeloEmailDto,
  type AtualizarRegraCobrancaDto,
  type AtualizarReguaCobrancaDto,
  type CriarModeloEmailDto,
  type CriarRegraCobrancaDto,
  type CriarReguaCobrancaDto,
  type EnviarCobrancaManualDto,
  type ListarNotificacoesDto,
  type TestarEmailDto,
} from '@locafacil/contracts';
import { ZodValidationPipe } from '../comum/zod-validation.pipe';
import { ENVIADOR_EMAIL, type EnviadorEmail } from '../email/enviador-email';
import { CobrancaService } from './cobranca.service';
import { EnvioNotificacoesService } from './envio-notificacoes.service';
import { ReguaCobrancaService } from './regua-cobranca.service';

@ApiTags('cobranca')
@ApiBearerAuth()
@Controller('cobranca')
export class CobrancaController {
  constructor(
    private readonly cobranca: CobrancaService,
    private readonly regua: ReguaCobrancaService,
    private readonly envio: EnvioNotificacoesService,
    @Inject(ENVIADOR_EMAIL) private readonly enviador: EnviadorEmail,
    private readonly config: ConfigService,
  ) {}

  @Get('configuracao')
  @ApiOperation({ summary: 'Estado do envio de e-mails' })
  configuracao() {
    return { envioAtivo: this.config.get<string>('EMAIL_ENVIO_ATIVO') === 'true' };
  }

  @Get('variaveis')
  @ApiOperation({ summary: 'Variáveis aceitas nos modelos de e-mail' })
  variaveis() {
    return { variaveis: VARIAVEIS_MODELO_EMAIL };
  }

  @Get('modelos')
  @ApiOperation({ summary: 'Lista os modelos de e-mail' })
  listarModelos() {
    return this.cobranca.listarModelos();
  }

  @Post('modelos')
  @ApiOperation({ summary: 'Cria um modelo de e-mail' })
  criarModelo(@Body(new ZodValidationPipe(criarModeloEmailSchema)) dados: CriarModeloEmailDto) {
    return this.cobranca.criarModelo(dados);
  }

  @Patch('modelos/:id')
  @ApiOperation({ summary: 'Atualiza um modelo de e-mail' })
  atualizarModelo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(atualizarModeloEmailSchema)) dados: AtualizarModeloEmailDto,
  ) {
    return this.cobranca.atualizarModelo(id, dados);
  }

  @Delete('modelos/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um modelo não utilizado' })
  removerModelo(@Param('id', ParseUUIDPipe) id: string) {
    return this.cobranca.removerModelo(id);
  }

  @Get('reguas')
  @ApiOperation({ summary: 'Lista as réguas com suas regras' })
  listarReguas() {
    return this.cobranca.listarReguas();
  }

  @Post('reguas')
  @ApiOperation({ summary: 'Cria uma régua de cobrança' })
  criarRegua(@Body(new ZodValidationPipe(criarReguaCobrancaSchema)) dados: CriarReguaCobrancaDto) {
    return this.cobranca.criarRegua(dados);
  }

  @Patch('reguas/:id')
  @ApiOperation({ summary: 'Atualiza uma régua' })
  atualizarRegua(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(atualizarReguaCobrancaSchema)) dados: AtualizarReguaCobrancaDto,
  ) {
    return this.cobranca.atualizarRegua(id, dados);
  }

  @Post('reguas/:id/regras')
  @ApiOperation({ summary: 'Adiciona uma etapa à régua' })
  criarRegra(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(criarRegraCobrancaSchema)) dados: CriarRegraCobrancaDto,
  ) {
    return this.cobranca.criarRegra(id, dados);
  }

  @Patch('regras/:id')
  @ApiOperation({ summary: 'Atualiza uma etapa da régua' })
  atualizarRegra(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(atualizarRegraCobrancaSchema)) dados: AtualizarRegraCobrancaDto,
  ) {
    return this.cobranca.atualizarRegra(id, dados);
  }

  @Delete('regras/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove uma etapa da régua' })
  removerRegra(@Param('id', ParseUUIDPipe) id: string) {
    return this.cobranca.removerRegra(id);
  }

  @Get('notificacoes')
  @ApiOperation({ summary: 'Histórico e fila de envios' })
  listarNotificacoes(
    @Query(new ZodValidationPipe(listarNotificacoesSchema)) filtros: ListarNotificacoesDto,
  ) {
    return this.cobranca.listarNotificacoes(filtros);
  }

  @Get('notificacoes/:id')
  @ApiOperation({ summary: 'Detalha uma notificação, com o corpo renderizado' })
  buscarNotificacao(@Param('id', ParseUUIDPipe) id: string) {
    return this.cobranca.buscarNotificacao(id);
  }

  @Post('notificacoes/:id/reenviar')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Recoloca a notificação na fila' })
  reenviar(@Param('id', ParseUUIDPipe) id: string) {
    return this.envio.reenviar(id);
  }

  @Post('agendar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Executa a régua manualmente e agenda os disparos do dia' })
  agendar() {
    return this.regua.agendar();
  }

  @Post('lancamentos/:id/notificar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Envia um alerta avulso de uma cobrança, fora da régua' })
  async notificarLancamento(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(enviarCobrancaManualSchema)) dados: EnviarCobrancaManualDto,
  ) {
    const notificacao = await this.regua.criarNotificacaoManual(id, dados);
    const resultado = await this.envio.enviarAgora(notificacao.id);

    return { ...notificacao, ...resultado };
  }

  @Post('processar-fila')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Processa a fila de envio manualmente' })
  processarFila() {
    return this.envio.processarFila();
  }

  @Post('testar-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Envia um e-mail de teste para validar a configuração SMTP' })
  async testarEmail(@Body(new ZodValidationPipe(testarEmailSchema)) dados: TestarEmailDto) {
    const resultado = await this.enviador.enviar({
      destinatario: dados.destinatario,
      assunto: 'LocaFácil, teste de configuração',
      corpoHtml: '<p>Se você recebeu esta mensagem, o envio de e-mail está funcionando.</p>',
      corpoTexto: 'Se você recebeu esta mensagem, o envio de e-mail está funcionando.',
    });

    return { enviado: true, ...resultado };
  }
}
