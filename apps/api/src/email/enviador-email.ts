export const ENVIADOR_EMAIL = Symbol('ENVIADOR_EMAIL');

export type AnexoEmail = {
  nome: string;
  conteudo: Buffer;
  tipoConteudo: string;
  /** Preenchido quando a imagem e referenciada no HTML via cid:. */
  cid?: string;
};

export type MensagemEmail = {
  destinatario: string;
  copia?: string[];
  assunto: string;
  corpoHtml: string;
  corpoTexto?: string;
  anexos?: AnexoEmail[];
};

export type ResultadoEnvio = {
  idProvedor?: string;
};

export interface EnviadorEmail {
  enviar(mensagem: MensagemEmail): Promise<ResultadoEnvio>;
}
