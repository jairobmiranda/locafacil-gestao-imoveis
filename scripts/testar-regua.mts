/**
 * Confere o calendario da regua de cobranca sem banco, sem SMTP e sem esperar o cron.
 * Roda com `npm.cmd run regua:testar`.
 */
import { ReguaCobrancaService } from '../apps/api/src/cobranca/regua-cobranca.service';
import { instanteLocal } from '../apps/api/src/comum/datas';

type Regra = {
  diasOffset: number;
  intervaloRepeticaoDias: number | null;
  maximoRepeticoes: number | null;
};

type EtapaDevida = { ocorrencia: number; atraso: number } | null;

const dia = (texto: string): Date => new Date(`${texto}T00:00:00.000Z`);

// A regra de calendario nao toca em nenhuma dependencia, entao o servico sobe sem elas.
const servico = new ReguaCobrancaService(
  null as never,
  null as never,
  null as never,
  null as never,
);

const devida = (regra: Regra, vencimento: string, hoje: string, janela: number): EtapaDevida =>
  (servico as unknown as Record<string, (...args: unknown[]) => EtapaDevida>).ocorrenciaDevida(
    regra,
    dia(vencimento),
    dia(hoje),
    new Set<string>(),
    janela,
  );

let falhas = 0;

function conferir(titulo: string, obtido: unknown, esperado: unknown): void {
  const ok = JSON.stringify(obtido) === JSON.stringify(esperado);

  falhas += ok ? 0 : 1;

  console.log(
    `${ok ? 'ok   ' : 'FALHA'} ${titulo}: ${JSON.stringify(obtido)}${
      ok ? '' : ` (esperado ${JSON.stringify(esperado)})`
    }`,
  );
}

console.log('--- hora de envio no fuso do sistema ---');
conferir(
  '09:00 de 04/09 em São Paulo vira 12:00 UTC',
  instanteLocal(dia('2026-09-04'), '09:00', 'America/Sao_Paulo').toISOString(),
  '2026-09-04T12:00:00.000Z',
);
conferir(
  '09:00 num sistema em UTC continua 09:00',
  instanteLocal(dia('2026-09-04'), '09:00', 'UTC').toISOString(),
  '2026-09-04T09:00:00.000Z',
);

console.log('\n--- etapa no dia do vencimento (D+0, sem repetição) ---');
const noDia: Regra = { diasOffset: 0, intervaloRepeticaoDias: null, maximoRepeticoes: null };
conferir('véspera não dispara', devida(noDia, '2026-09-04', '2026-09-03', 3), null);
conferir('no próprio dia', devida(noDia, '2026-09-04', '2026-09-04', 3), {
  ocorrencia: 1,
  atraso: 0,
});
conferir(
  'contrato cadastrado depois da hora: a etapa é recuperada no dia seguinte',
  devida(noDia, '2026-09-04', '2026-09-05', 3),
  { ocorrencia: 1, atraso: 1 },
);
conferir('no limite da janela ainda recupera', devida(noDia, '2026-09-04', '2026-09-07', 3), {
  ocorrencia: 1,
  atraso: 3,
});
conferir('fora da janela não volta atrás', devida(noDia, '2026-09-04', '2026-09-08', 3), null);
conferir(
  'janela zero mantém o comportamento antigo, só o dia exato',
  devida(noDia, '2026-09-04', '2026-09-05', 0),
  null,
);
conferir(
  'contrato antigo recém cadastrado não dispara etapa de meses atrás',
  devida(noDia, '2026-03-04', '2026-09-04', 3),
  null,
);

console.log('\n--- etapa com repetição (D+3, a cada 7 dias, no máximo 3 vezes) ---');
const repetida: Regra = { diasOffset: 3, intervaloRepeticaoDias: 7, maximoRepeticoes: 3 };
conferir('primeira ocorrência no dia previsto', devida(repetida, '2026-09-04', '2026-09-07', 3), {
  ocorrencia: 1,
  atraso: 0,
});
conferir('segunda ocorrência no dia previsto', devida(repetida, '2026-09-04', '2026-09-14', 3), {
  ocorrencia: 2,
  atraso: 0,
});
conferir('um dia depois recupera a segunda', devida(repetida, '2026-09-04', '2026-09-15', 3), {
  ocorrencia: 2,
  atraso: 1,
});
conferir(
  'no meio do intervalo não inventa etapa',
  devida(repetida, '2026-09-04', '2026-09-18', 3),
  null,
);
conferir('terceira e última ocorrência', devida(repetida, '2026-09-04', '2026-09-21', 3), {
  ocorrencia: 3,
  atraso: 0,
});
conferir(
  'passado o máximo de repetições a régua para',
  devida(repetida, '2026-09-04', '2026-09-28', 3),
  null,
);

console.log('\n--- etapa antes do vencimento (D-5) ---');
const antes: Regra = { diasOffset: -5, intervaloRepeticaoDias: null, maximoRepeticoes: null };
conferir('cedo demais', devida(antes, '2026-09-30', '2026-09-20', 3), null);
conferir('no dia previsto', devida(antes, '2026-09-30', '2026-09-25', 3), {
  ocorrencia: 1,
  atraso: 0,
});
conferir(
  'contrato cadastrado depois ainda avisa antes de vencer',
  devida(antes, '2026-09-30', '2026-09-27', 3),
  { ocorrencia: 1, atraso: 2 },
);

console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo');

process.exit(falhas ? 1 : 0);
