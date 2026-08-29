import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { formatarData, formatarMoeda, rotular } from '@/lib/formato';
import type { Pessoa, VinculoContrato } from '@/lib/tipos';
import { FormularioPessoa } from '../formulario-pessoa';

type PessoaDetalhe = Pessoa & { partesContrato: VinculoContrato[] };

export default async function PaginaPessoa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pessoa = await apiGet<PessoaDetalhe>(`/pessoas/${id}`);

  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <h1>{pessoa.nome}</h1>
          <p className="texto-suave">
            {pessoa.email ?? 'sem e-mail cadastrado'}
            {pessoa.arquivadoEm ? ' · arquivada' : ''}
          </p>
        </div>
      </div>

      {!pessoa.email ? (
        <p className="aviso">
          Sem e-mail cadastrado esta pessoa não pode ser o contato principal de um contrato, porque
          não haveria para onde enviar as cobranças.
        </p>
      ) : null}

      <section>
        <div className="cabecalho-secao">
          <h2>Contratos</h2>
        </div>

        {pessoa.partesContrato.length === 0 ? (
          <div className="cartao vazio">
            <p>Nenhum contrato vinculado.</p>
          </div>
        ) : (
          <div className="cartao">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Imóvel</th>
                  <th>Papel</th>
                  <th>Vigência</th>
                  <th>Situação</th>
                  <th className="direita">Aluguel</th>
                </tr>
              </thead>
              <tbody>
                {pessoa.partesContrato.map((vinculo) => (
                  <tr key={`${vinculo.contrato.id}-${vinculo.papel}`}>
                    <td>
                      <Link href={`/imoveis/${vinculo.contrato.imovel.id}`} className="link">
                        {vinculo.contrato.imovel.apelido}
                      </Link>
                    </td>
                    <td data-label="Papel">
                      {rotular(vinculo.papel)}
                      {vinculo.contatoPrincipal ? ' (contato)' : ''}
                    </td>
                    <td data-label="Vigência">
                      {formatarData(vinculo.contrato.dataInicio)} a{' '}
                      {formatarData(vinculo.contrato.dataFim)}
                    </td>
                    <td data-label="Situação">
                      <span
                        className={`etiqueta situacao-${vinculo.contrato.situacao.toLowerCase()}`}
                      >
                        {rotular(vinculo.contrato.situacao)}
                      </span>
                    </td>
                    <td className="direita" data-label="Aluguel">
                      {formatarMoeda(vinculo.contrato.valorAluguel)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <div className="cabecalho-secao">
          <h2>Dados cadastrais</h2>
        </div>
        <FormularioPessoa pessoa={pessoa} />
      </section>
    </>
  );
}
