export const TEMA_STORAGE_KEY = 'locafacil:tema';

export type Tema = 'claro' | 'escuro';

export function obterTemaSalvo(): Tema | null {
  try {
    const valor = localStorage.getItem(TEMA_STORAGE_KEY);
    return valor === 'claro' || valor === 'escuro' ? valor : null;
  } catch {
    return null;
  }
}

export function salvarTema(tema: Tema): void {
  document.documentElement.setAttribute('data-tema', tema);
  try {
    localStorage.setItem(TEMA_STORAGE_KEY, tema);
  } catch {
    // localStorage indisponível (modo privado, etc.) — a troca visual já foi aplicada.
  }
}
