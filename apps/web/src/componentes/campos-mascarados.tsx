'use client';

import { useRef, useState, type InputHTMLAttributes } from 'react';
import {
  desmascararValor,
  limparDocumento,
  mascararCep,
  mascararDocumento,
  mascararTelefone,
  mascararValor,
  somenteDigitos,
  valorParaMascara,
} from '@/lib/mascaras';
import { buscarCep } from '@/lib/via-cep';

/** Os campos de endereco sao nao controlados: escrever direto no DOM e seguro aqui. */
function preencher(formulario: HTMLFormElement, campo: string, valor: string) {
  if (valor.trim() === '') {
    return;
  }

  const elemento = formulario.elements.namedItem(campo);

  if (elemento instanceof HTMLInputElement) {
    elemento.value = valor;
  }
}

type PropsBase = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'type' | 'name'
>;

type Props = PropsBase & {
  name: string;
  /** Valor cru vindo da API. O campo visivel mostra a mascara, o hidden envia o valor limpo. */
  valor?: string | number | null;
};

/**
 * Campo mascarado. O input visivel nao tem `name`: quem viaja no FormData e o hidden,
 * sempre sem mascara, para o banco nunca guardar pontuacao.
 */
function CampoMascarado({
  name,
  valor,
  mascararInicial,
  mascarar,
  limpar,
  ...resto
}: Props & {
  mascararInicial: (bruto: string | number | null | undefined) => string;
  mascarar: (digitado: string) => string;
  limpar: (mascarado: string) => string;
}) {
  const [texto, setTexto] = useState(() => mascararInicial(valor));

  return (
    <>
      <input
        {...resto}
        type="text"
        value={texto}
        onChange={(evento) => setTexto(mascarar(evento.target.value))}
      />
      <input type="hidden" name={name} value={limpar(texto)} />
    </>
  );
}

export function EntradaTelefone(props: Props) {
  return (
    <CampoMascarado
      inputMode="tel"
      placeholder="(00) 00000-0000"
      autoComplete="tel"
      {...props}
      mascararInicial={(bruto) => mascararTelefone(String(bruto ?? ''))}
      mascarar={mascararTelefone}
      limpar={(mascarado) => somenteDigitos(mascarado)}
    />
  );
}

export function EntradaCep({ name, valor, ...resto }: Props) {
  const [texto, setTexto] = useState(() => mascararCep(String(valor ?? '')));
  const [situacao, setSituacao] = useState<'ocioso' | 'buscando' | 'nao-encontrado'>('ocioso');
  const campo = useRef<HTMLInputElement>(null);
  const ultimoConsultado = useRef('');

  async function consultar(cep: string) {
    const formulario = campo.current?.form;

    if (!formulario || ultimoConsultado.current === cep) {
      return;
    }

    ultimoConsultado.current = cep;
    setSituacao('buscando');

    const endereco = await buscarCep(cep);

    if (!endereco) {
      setSituacao('nao-encontrado');
      return;
    }

    setSituacao('ocioso');
    preencher(formulario, 'logradouro', endereco.logradouro);
    preencher(formulario, 'bairro', endereco.bairro);
    preencher(formulario, 'cidade', endereco.localidade);
    preencher(formulario, 'uf', endereco.uf);

    const numero = formulario.elements.namedItem('numero');

    if (numero instanceof HTMLInputElement && numero.value === '') {
      numero.focus();
    }
  }

  return (
    <>
      <input
        inputMode="numeric"
        placeholder="00.000-000"
        autoComplete="postal-code"
        {...resto}
        ref={campo}
        type="text"
        value={texto}
        onChange={(evento) => {
          const mascarado = mascararCep(evento.target.value);
          setTexto(mascarado);
          setSituacao('ocioso');

          const digitos = somenteDigitos(mascarado);

          if (digitos.length === 8) {
            void consultar(digitos);
          }
        }}
      />
      <input type="hidden" name={name} value={somenteDigitos(texto)} />
      {situacao === 'buscando' ? <small className="texto-suave">Buscando endereço...</small> : null}
      {situacao === 'nao-encontrado' ? (
        <small className="texto-suave">CEP não encontrado, preencha o endereço à mão</small>
      ) : null}
    </>
  );
}

export function EntradaDocumento(props: Props) {
  return (
    <CampoMascarado
      inputMode="text"
      placeholder="000.000.000-00"
      {...props}
      mascararInicial={(bruto) => mascararDocumento(String(bruto ?? ''))}
      mascarar={mascararDocumento}
      limpar={limparDocumento}
    />
  );
}

export function EntradaValor(props: Props) {
  return (
    <CampoMascarado
      inputMode="decimal"
      placeholder="0,00"
      {...props}
      mascararInicial={valorParaMascara}
      mascarar={mascararValor}
      limpar={desmascararValor}
    />
  );
}

/** Versao para telas que mantem o valor em estado (wizard), sem passar por FormData. */
export function EntradaValorControlada({
  valor,
  aoMudar,
  ...resto
}: PropsBase & { valor: number | null | undefined; aoMudar: (valor: number) => void }) {
  const [texto, setTexto] = useState(() => (valor ? valorParaMascara(valor) : ''));

  return (
    <input
      inputMode="decimal"
      placeholder="0,00"
      {...resto}
      type="text"
      value={texto}
      onChange={(evento) => {
        const mascarado = mascararValor(evento.target.value);
        setTexto(mascarado);
        aoMudar(Number(desmascararValor(mascarado) || 0));
      }}
    />
  );
}
