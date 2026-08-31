'use client';

import { useState, type InputHTMLAttributes } from 'react';
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

export function EntradaCep(props: Props) {
  return (
    <CampoMascarado
      inputMode="numeric"
      placeholder="00.000-000"
      autoComplete="postal-code"
      {...props}
      mascararInicial={(bruto) => mascararCep(String(bruto ?? ''))}
      mascarar={mascararCep}
      limpar={(mascarado) => somenteDigitos(mascarado)}
    />
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
