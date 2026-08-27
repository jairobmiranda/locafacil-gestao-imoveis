/**
 * Sem prefixo NEXT_PUBLIC porque a API so e chamada pelo servidor. Isso permite
 * trocar a URL por variavel de ambiente, sem rebuild da imagem.
 */
export const API_URL = process.env.API_URL ?? 'http://localhost:3000/api';
