import { FormularioLogin } from './formulario-login';

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ proximo?: string }>;
}) {
  const { proximo } = await searchParams;

  return (
    <main className="tela-login">
      <FormularioLogin proximo={proximo ?? '/imoveis'} />
    </main>
  );
}
