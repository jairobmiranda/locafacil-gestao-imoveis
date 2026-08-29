import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** A versao do produto fica no package.json da raiz; o do app so existe como fallback. */
function ler(): string {
  const candidatos = [
    join(__dirname, '..', '..', '..', '..', 'package.json'),
    join(__dirname, '..', '..', 'package.json'),
  ];

  for (const caminho of candidatos) {
    try {
      const versao = (JSON.parse(readFileSync(caminho, 'utf8')) as { version?: string }).version;

      if (versao) {
        return versao;
      }
    } catch {
      continue;
    }
  }

  return '0.0.0';
}

export const VERSAO_API = ler();
