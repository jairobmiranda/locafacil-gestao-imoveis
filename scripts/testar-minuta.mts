import { respostasBlindagemSchema } from '@locafacil/contracts';
import type { ContextoMinuta, ParteQualificada } from '../apps/api/src/minutas/contexto';
import { renderizarDocumento } from '../apps/api/src/minutas/documento';
import { avaliarRiscos } from '../apps/api/src/minutas/clausulas';

const parte = (nome: string, casado = false, participacao: number | null = null): ParteQualificada => ({
  nome,
  qualificacao: 'brasileiro(a), casado(a), autônomo(a), inscrito(a) no CPF 000.000.000-00.',
  documento: 'CPF 000.000.000-00',
  email: 'x@y.com',
  estadoCivil: casado ? 'CASADO' : 'SOLTEIRO',
  casado,
  participacao,
});

const contexto: ContextoMinuta = {
  locadores: [parte('Ana Souza', true, 60), parte('Bruno Souza', true, 40)],
  locatarios: [parte('Carla Lima'), parte('Diego Lima')],
  fiadores: [parte('Eva Prado', true)],
  anuentes: [parte('Fabio Prado', true)],
  testemunhas: [parte('Gabi Reis'), parte('Hugo Reis')],
  imovel: {
    apelido: 'Ed. Aurora 301',
    tipo: 'apartamento',
    endereco: 'Rua das Flores, nº 100, Setor Central, Goiânia/GO, CEP 74000-000',
    cidade: 'Goiânia',
    uf: 'GO',
    matricula: '12345',
    inscricaoMunicipal: null,
    areaConstruida: 78,
    quartos: 3,
    banheiros: 2,
    vagas: 1,
    caracteristicas: [
      { descricao: 'suíte', quantidade: 1 },
      { descricao: 'quintal', quantidade: null },
    ],
  },
  finalidade: 'RESIDENCIAL',
  dataInicio: new Date(Date.UTC(2026, 8, 1)),
  dataFim: new Date(Date.UTC(2029, 2, 1)),
  prazoMeses: 30,
  diaVencimento: 10,
  valorAluguel: 2500,
  percentualMulta: 2,
  percentualJurosDia: 0.033,
  descontoPontualidade: 100,
  indiceReajuste: 'IGPM',
  intervaloReajusteMeses: 12,
  tipoGarantia: 'FIADOR',
  valorGarantia: null,
  encargos: [{ descricao: 'Condomínio', valor: 480 }],
  chavePix: { tipo: 'CPF', chave: '000.000.000-00', titular: 'Ana Souza' },
  respostas: respostasBlindagemSchema.parse({}),
  foro: 'Goiânia',
  emitidaEm: new Date(Date.UTC(2026, 7, 30)),
};

const alertas = avaliarRiscos(contexto);
const documento = renderizarDocumento(contexto);

console.log('Cláusulas:', documento.clausulas.length);
console.log('Proteção:', documento.nivelProtecao);
console.log('Alertas:', alertas);
console.log('---');
console.log(
  documento.html
    .replace(/<\/p>/g, '</p>\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .slice(0, 6000),
);
