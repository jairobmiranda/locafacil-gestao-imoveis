import { z } from 'zod';

export const tipoChavePixSchema = z.enum(['CPF', 'CNPJ', 'EMAIL', 'TELEFONE', 'ALEATORIA']);

const FORMATO_CHAVE: Record<z.infer<typeof tipoChavePixSchema>, RegExp> = {
  CPF: /^\d{11}$/,
  CNPJ: /^\d{14}$/,
  EMAIL: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
  TELEFONE: /^\+55\d{10,11}$/,
  ALEATORIA: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
};

export const criarChavePixSchema = z
  .object({
    tipoChave: tipoChavePixSchema,
    chave: z.string().min(1).max(77),
    // Limites do padrao BR Code EMV.
    nomeBeneficiario: z.string().min(1).max(25),
    cidadeBeneficiario: z.string().min(1).max(15),
    padrao: z.boolean().default(false),
    ativa: z.boolean().default(true),
  })
  .refine((dados) => FORMATO_CHAVE[dados.tipoChave].test(dados.chave), {
    message: 'Chave fora do formato esperado para o tipo informado',
    path: ['chave'],
  });

export const atualizarChavePixSchema = z.object({
  nomeBeneficiario: z.string().min(1).max(25).optional(),
  cidadeBeneficiario: z.string().min(1).max(15).optional(),
  padrao: z.boolean().optional(),
  ativa: z.boolean().optional(),
});

export const gerarCobrancaPixSchema = z.object({
  chavePixId: z.string().uuid().optional(),
  descricao: z.string().max(72).optional(),
});

export type TipoChavePix = z.infer<typeof tipoChavePixSchema>;
export type CriarChavePixDto = z.infer<typeof criarChavePixSchema>;
export type AtualizarChavePixDto = z.infer<typeof atualizarChavePixSchema>;
export type GerarCobrancaPixDto = z.infer<typeof gerarCobrancaPixSchema>;

export type CobrancaPix = {
  txid: string;
  payload: string;
  valor: number;
  chave: string;
  nomeBeneficiario: string;
};
