import { PrismaClient, Natureza, SituacaoLancamento, TipoConfiguracao } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type SeedCategoria = {
  nome: string;
  natureza: Natureza;
  capitalizavel: boolean;
};

const CATEGORIAS: SeedCategoria[] = [
  { nome: 'Aquisição', natureza: 'SAIDA', capitalizavel: true },
  { nome: 'ITBI e Escritura', natureza: 'SAIDA', capitalizavel: true },
  { nome: 'Reforma/Material', natureza: 'SAIDA', capitalizavel: true },
  { nome: 'Reforma/Mão de obra', natureza: 'SAIDA', capitalizavel: true },
  { nome: 'Corretagem', natureza: 'SAIDA', capitalizavel: true },
  { nome: 'Documentação', natureza: 'SAIDA', capitalizavel: true },
  { nome: 'IPTU', natureza: 'SAIDA', capitalizavel: false },
  { nome: 'Condomínio', natureza: 'SAIDA', capitalizavel: false },
  { nome: 'Energia', natureza: 'SAIDA', capitalizavel: false },
  { nome: 'Água', natureza: 'SAIDA', capitalizavel: false },
  { nome: 'Gás', natureza: 'SAIDA', capitalizavel: false },
  { nome: 'Seguro', natureza: 'SAIDA', capitalizavel: false },
  { nome: 'Manutenção', natureza: 'SAIDA', capitalizavel: false },
  { nome: 'Taxas bancárias', natureza: 'SAIDA', capitalizavel: false },
  { nome: 'Juros de financiamento', natureza: 'SAIDA', capitalizavel: false },

  { nome: 'Aluguel', natureza: 'ENTRADA', capitalizavel: false },
  { nome: 'Reembolso de condomínio', natureza: 'ENTRADA', capitalizavel: false },
  { nome: 'Reembolso de IPTU', natureza: 'ENTRADA', capitalizavel: false },
  { nome: 'Multa e juros', natureza: 'ENTRADA', capitalizavel: false },
  { nome: 'Venda do imóvel', natureza: 'ENTRADA', capitalizavel: false },
  { nome: 'Caução retida', natureza: 'ENTRADA', capitalizavel: false },
];

const VARIAVEIS = [
  'inquilino.nome',
  'inquilino.primeiro_nome',
  'imovel.apelido',
  'imovel.endereco',
  'cobranca.competencia',
  'cobranca.vencimento',
  'cobranca.vencimento_util',
  'cobranca.valor',
  'cobranca.valor_total',
  'cobranca.itens',
  'cobranca.dias_atraso',
  'cobranca.valor_multa',
  'cobranca.valor_juros',
  'pix.copia_e_cola',
  'pix.qrcode_url',
  'link_pagamento',
  'cobrancas.quantidade',
  'cobrancas.total',
  'cobrancas.competencias',
  'cobrancas.vencimento_mais_antigo',
  'cobrancas.tabela',
];

function layout(titulo: string, miolo: string, comPix = true): string {
  const blocoPix = comPix
    ? `
    <h3 style="margin:24px 0 8px;font-size:15px;">Pagamento via Pix</h3>
    <p style="margin:0 0 12px;">Copie o código abaixo e cole no app do seu banco:</p>
    <p style="background:#f4f4f5;border:1px solid #e4e4e7;border-radius:6px;padding:12px;
              font-family:monospace;font-size:12px;word-break:break-all;">{{pix.copia_e_cola}}</p>
    <p style="margin:12px 0;"><img src="{{pix.qrcode_url}}" alt="QR Code Pix" width="180" height="180" /></p>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#fafafa;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e4e4e7;border-radius:8px;padding:32px;">
      <h2 style="margin:0 0 16px;font-size:18px;">${titulo}</h2>
      <p style="margin:0 0 16px;">Olá, {{inquilino.primeiro_nome}}.</p>
      ${miolo}
      {{cobranca.itens}}
      ${blocoPix}
      <p style="margin:28px 0 8px;">Já pagou? Avise por aqui:</p>
      <p style="margin:0 0 8px;">
        <a href="{{link_pagamento}}"
           style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;
                  border-radius:6px;padding:12px 20px;font-weight:bold;">Confirmar pagamento</a>
      </p>
      <p style="margin:24px 0 0;font-size:12px;color:#71717a;">
        Se o botão não abrir, copie este endereço: {{link_pagamento}}
      </p>
    </div>
  </body>
</html>`;
}

const MODELOS = [
  {
    chave: 'cobranca_pre_vencimento',
    nome: 'Lembrete de vencimento',
    assunto: 'Aluguel de {{cobranca.competencia}} vence em {{cobranca.vencimento}}',
    corpoHtml: layout(
      'Seu aluguel vence em breve',
      `<p style="margin:0 0 16px;">O aluguel de <strong>{{imovel.apelido}}</strong> referente a
       {{cobranca.competencia}} vence em <strong>{{cobranca.vencimento}}</strong>,
       no valor de <strong>{{cobranca.valor_total}}</strong>.</p>`,
    ),
  },
  {
    chave: 'cobranca_vence_hoje',
    nome: 'Vence hoje',
    assunto: 'Seu aluguel de {{cobranca.competencia}} vence hoje',
    corpoHtml: layout(
      'Seu aluguel vence hoje',
      `<p style="margin:0 0 16px;">O aluguel de <strong>{{imovel.apelido}}</strong> referente a
       {{cobranca.competencia}} vence hoje, no valor de
       <strong>{{cobranca.valor_total}}</strong>.</p>`,
    ),
  },
  {
    chave: 'cobranca_atraso_inicial',
    nome: 'Aviso de atraso',
    assunto: 'Aluguel de {{cobranca.competencia}} em atraso',
    corpoHtml: layout(
      'Identificamos um pagamento em aberto',
      `<p style="margin:0 0 16px;">O aluguel de <strong>{{imovel.apelido}}</strong> referente a
       {{cobranca.competencia}} venceu em {{cobranca.vencimento}} e consta em aberto.</p>
       <p style="margin:0 0 16px;">Se o pagamento já foi feito, desconsidere este aviso e
       envie o comprovante.</p>`,
    ),
  },
  {
    chave: 'cobranca_atraso_recorrente',
    nome: 'Cobrança de atraso com encargos',
    assunto: 'Aluguel de {{cobranca.competencia}} com {{cobranca.dias_atraso}} dias de atraso',
    corpoHtml: layout(
      'Pagamento em atraso',
      `<p style="margin:0 0 16px;">O aluguel de <strong>{{imovel.apelido}}</strong> referente a
       {{cobranca.competencia}} está com <strong>{{cobranca.dias_atraso}} dias</strong> de atraso.</p>
       <ul style="margin:0 0 16px;padding-left:20px;">
         <li>Valor original: {{cobranca.valor}}</li>
         <li>Multa: {{cobranca.valor_multa}}</li>
         <li>Juros: {{cobranca.valor_juros}}</li>
         <li><strong>Total atualizado: {{cobranca.valor_total}}</strong></li>
       </ul>`,
    ),
  },
  {
    chave: 'cobranca_consolidada',
    nome: 'Débitos em aberto (consolidado)',
    assunto: 'Você tem {{cobrancas.quantidade}} aluguéis em aberto',
    corpoHtml: layout(
      'Resumo dos valores em aberto',
      `<p style="margin:0 0 16px;">O imóvel <strong>{{imovel.apelido}}</strong> tem
       <strong>{{cobrancas.quantidade}}</strong> cobranças em aberto, a mais antiga vencida em
       {{cobrancas.vencimento_mais_antigo}}.</p>
       {{cobrancas.tabela}}
       <p style="margin:16px 0;">Multa e juros já inclusos:
       <strong>{{cobrancas.total}}</strong>.</p>
       <p style="margin:0 0 16px;">O Pix abaixo quita tudo de uma vez. Para pagar em separado ou
       negociar, entrar em contato com o proprietário.</p>`,
    ),
  },
];

type SeedRegra = {
  sequencia: number;
  diasOffset: number;
  intervaloRepeticaoDias: number | null;
  maximoRepeticoes: number | null;
  chaveModelo: string;
  apenasSeSituacao: SituacaoLancamento | null;
};

const REGRAS: SeedRegra[] = [
  {
    sequencia: 1,
    diasOffset: -5,
    intervaloRepeticaoDias: null,
    maximoRepeticoes: null,
    chaveModelo: 'cobranca_pre_vencimento',
    apenasSeSituacao: 'PENDENTE',
  },
  {
    sequencia: 2,
    diasOffset: 0,
    intervaloRepeticaoDias: null,
    maximoRepeticoes: null,
    chaveModelo: 'cobranca_vence_hoje',
    apenasSeSituacao: 'PENDENTE',
  },
  {
    sequencia: 3,
    diasOffset: 1,
    intervaloRepeticaoDias: null,
    maximoRepeticoes: null,
    chaveModelo: 'cobranca_atraso_inicial',
    apenasSeSituacao: 'ATRASADO',
  },
  {
    sequencia: 4,
    diasOffset: 7,
    intervaloRepeticaoDias: 7,
    maximoRepeticoes: 4,
    chaveModelo: 'cobranca_atraso_recorrente',
    apenasSeSituacao: 'ATRASADO',
  },
];

const CONFIGURACOES = [
  {
    chave: 'app.nome_exibicao',
    valor: 'LocaFácil',
    tipo: 'TEXTO' as TipoConfiguracao,
    grupo: 'geral',
    descricao: 'Nome exibido na interface e nos e-mails',
  },
  {
    chave: 'app.fuso_horario',
    valor: 'America/Sao_Paulo',
    tipo: 'TEXTO' as TipoConfiguracao,
    grupo: 'geral',
    descricao: 'Fuso usado nos agendamentos',
  },
  {
    chave: 'email.rodape',
    valor: 'Esta é uma mensagem automática. Em caso de dúvida, responda este e-mail.',
    tipo: 'TEXTO' as TipoConfiguracao,
    grupo: 'email',
    descricao: 'Texto do rodapé das notificações',
  },
  {
    chave: 'contrato.dias_aviso_encerramento',
    valor: '90',
    tipo: 'NUMERO' as TipoConfiguracao,
    grupo: 'contrato',
    descricao: 'Antecedência padrão do alerta de fim de contrato',
  },
  {
    chave: 'contrato.dias_aviso_reajuste',
    valor: '30',
    tipo: 'NUMERO' as TipoConfiguracao,
    grupo: 'contrato',
    descricao: 'Antecedência do alerta de reajuste',
  },
  {
    chave: 'lancamento.exigir_comprovante',
    valor: 'true',
    tipo: 'BOOLEANO' as TipoConfiguracao,
    grupo: 'financeiro',
    descricao: 'Exige anexo do tipo COMPROVANTE para dar baixa',
  },
];

async function main() {
  for (const categoria of CATEGORIAS) {
    await prisma.categoria.upsert({
      where: { nome_natureza: { nome: categoria.nome, natureza: categoria.natureza } },
      update: { capitalizavelPadrao: categoria.capitalizavel, doSistema: true },
      create: {
        nome: categoria.nome,
        natureza: categoria.natureza,
        capitalizavelPadrao: categoria.capitalizavel,
        doSistema: true,
      },
    });
  }
  console.log(`Categorias: ${CATEGORIAS.length}`);

  for (const modelo of MODELOS) {
    await prisma.modeloEmail.upsert({
      where: { chave: modelo.chave },
      update: { variaveisDisponiveis: VARIAVEIS },
      create: {
        chave: modelo.chave,
        nome: modelo.nome,
        assunto: modelo.assunto,
        corpoHtml: modelo.corpoHtml,
        variaveisDisponiveis: VARIAVEIS,
      },
    });
  }
  console.log(`Modelos de e-mail: ${MODELOS.length}`);

  const reguaExistente = await prisma.reguaCobranca.findFirst({ where: { padrao: true } });
  const regua =
    reguaExistente ??
    (await prisma.reguaCobranca.create({
      data: { nome: 'Régua padrão', padrao: true },
    }));

  const consolidado = await prisma.modeloEmail.findUniqueOrThrow({
    where: { chave: 'cobranca_consolidada' },
  });

  if (!regua.modeloConsolidadoId) {
    await prisma.reguaCobranca.update({
      where: { id: regua.id },
      data: { modeloConsolidadoId: consolidado.id },
    });
  }

  for (const regra of REGRAS) {
    const modelo = await prisma.modeloEmail.findUniqueOrThrow({
      where: { chave: regra.chaveModelo },
    });

    await prisma.regraCobranca.upsert({
      where: { reguaId_sequencia: { reguaId: regua.id, sequencia: regra.sequencia } },
      update: {},
      create: {
        reguaId: regua.id,
        sequencia: regra.sequencia,
        diasOffset: regra.diasOffset,
        intervaloRepeticaoDias: regra.intervaloRepeticaoDias,
        maximoRepeticoes: regra.maximoRepeticoes,
        modeloEmailId: modelo.id,
        apenasSeSituacao: regra.apenasSeSituacao,
      },
    });
  }
  console.log(`Regras da régua padrão: ${REGRAS.length}`);

  for (const config of CONFIGURACOES) {
    await prisma.configuracao.upsert({
      where: { chave: config.chave },
      update: { grupo: config.grupo, descricao: config.descricao },
      create: config,
    });
  }
  console.log(`Configurações: ${CONFIGURACOES.length}`);

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminSenha = process.env.ADMIN_SENHA;
  if (adminEmail && adminSenha) {
    await prisma.usuario.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        nome: process.env.ADMIN_NOME ?? 'Administrador',
        email: adminEmail,
        senhaHash: await bcrypt.hash(adminSenha, 12),
        perfil: 'ADMIN',
      },
    });
    console.log(`Usuário admin: ${adminEmail}`);
  } else {
    console.log('Usuário admin ignorado (defina ADMIN_EMAIL e ADMIN_SENHA)');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (erro) => {
    console.error(erro);
    await prisma.$disconnect();
    process.exit(1);
  });
