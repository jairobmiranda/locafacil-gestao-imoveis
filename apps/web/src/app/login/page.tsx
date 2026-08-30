import { FormularioLogin } from './formulario-login';

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ proximo?: string; sessao?: string }>;
}) {
  const { proximo, sessao } = await searchParams;

  return (
    <main className="tela-login">
      <FormularioLogin
        proximo={proximo ?? '/imoveis'}
        expirada={sessao === 'expirada'}
      />
    </main>
  );
}
