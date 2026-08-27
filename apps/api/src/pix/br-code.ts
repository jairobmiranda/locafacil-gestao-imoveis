/**
 * Gerador de BR Code (Pix estatico), padrao EMV(R) QRCPS-MPM do Banco Central.
 * Cada campo e "ID + tamanho em 2 digitos + valor", e o CRC16 fecha o payload.
 */

const ID_FORMATO = '00';
const ID_MERCHANT_ACCOUNT = '26';
const ID_CATEGORIA = '52';
const ID_MOEDA = '53';
const ID_VALOR = '54';
const ID_PAIS = '58';
const ID_NOME = '59';
const ID_CIDADE = '60';
const ID_ADICIONAL = '62';
const ID_CRC = '63';

const GUI_PIX = 'BR.GOV.BCB.PIX';
const MOEDA_REAL = '986';
const PAIS_BRASIL = 'BR';
const SEM_CATEGORIA = '0000';
const SEM_TXID = '***';

export type DadosBrCode = {
  chave: string;
  nomeBeneficiario: string;
  cidadeBeneficiario: string;
  valor?: number;
  txid?: string;
  descricao?: string;
};

function campo(id: string, valor: string): string {
  return `${id}${valor.length.toString().padStart(2, '0')}${valor}`;
}

/**
 * CRC16-CCITT-FALSE: polinomio 0x1021, valor inicial 0xFFFF, sem reflexao.
 * O calculo inclui o proprio "6304" do campo CRC.
 */
export function crc16(texto: string): string {
  let resultado = 0xffff;

  for (const caractere of Buffer.from(texto, 'utf8')) {
    resultado ^= caractere << 8;

    for (let bit = 0; bit < 8; bit += 1) {
      resultado = resultado & 0x8000 ? ((resultado << 1) ^ 0x1021) & 0xffff : (resultado << 1) & 0xffff;
    }
  }

  return resultado.toString(16).toUpperCase().padStart(4, '0');
}

/** Remove acentos e caracteres fora da faixa aceita pelo padrao. */
function higienizar(texto: string, limite: number): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 .-]/g, '')
    .trim()
    .slice(0, limite)
    .toUpperCase();
}

/** Alfanumerico, ate 25 posicoes. E o que permite conciliar o pagamento com a cobranca. */
export function higienizarTxid(txid: string): string {
  return txid.replace(/[^A-Za-z0-9]/g, '').slice(0, 25);
}

export function gerarBrCode(dados: DadosBrCode): string {
  const contaComercante =
    campo('00', GUI_PIX) +
    campo('01', dados.chave) +
    (dados.descricao ? campo('02', higienizar(dados.descricao, 72)) : '');

  const txid = dados.txid ? higienizarTxid(dados.txid) : SEM_TXID;

  const payload =
    campo(ID_FORMATO, '01') +
    campo(ID_MERCHANT_ACCOUNT, contaComercante) +
    campo(ID_CATEGORIA, SEM_CATEGORIA) +
    campo(ID_MOEDA, MOEDA_REAL) +
    (dados.valor !== undefined ? campo(ID_VALOR, dados.valor.toFixed(2)) : '') +
    campo(ID_PAIS, PAIS_BRASIL) +
    campo(ID_NOME, higienizar(dados.nomeBeneficiario, 25)) +
    campo(ID_CIDADE, higienizar(dados.cidadeBeneficiario, 15)) +
    campo(ID_ADICIONAL, campo('05', txid));

  const comMarcadorCrc = `${payload}${ID_CRC}04`;

  return `${comMarcadorCrc}${crc16(comMarcadorCrc)}`;
}
