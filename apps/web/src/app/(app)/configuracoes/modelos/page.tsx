import { apiGet } from '@/lib/api';
import { EditorModelos } from './editor-modelos';

type Modelo = {
  id: string;
  chave: string;
  nome: string;
  assunto: string;
  corpoHtml: string;
  ativo: boolean;
};

export default async function PaginaModelos() {
  const [modelos, variaveis] = await Promise.all([
    apiGet<Modelo[]>('/cobranca/modelos'),
    apiGet<{ variaveis: string[] }>('/cobranca/variaveis'),
  ]);

  return <EditorModelos modelos={modelos} variaveis={variaveis.variaveis} />;
}
