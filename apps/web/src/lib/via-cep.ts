export type EnderecoViaCep = {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
};

/** Consulta publica do ViaCEP. Falha de rede nao trava o formulario: o usuario digita a mao. */
export async function buscarCep(cep: string): Promise<EnderecoViaCep | null> {
  const digitos = cep.replace(/\D/g, '');

  if (digitos.length !== 8) {
    return null;
  }

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);

    if (!resposta.ok) {
      return null;
    }

    const dados: unknown = await resposta.json();

    if (typeof dados !== 'object' || dados === null || 'erro' in dados) {
      return null;
    }

    const bruto = dados as Partial<EnderecoViaCep>;

    return {
      logradouro: bruto.logradouro ?? '',
      bairro: bruto.bairro ?? '',
      localidade: bruto.localidade ?? '',
      uf: bruto.uf ?? '',
    };
  } catch {
    return null;
  }
}
