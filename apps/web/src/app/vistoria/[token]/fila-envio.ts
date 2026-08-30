'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MetadadosImagem } from './imagem';

export type ItemFila = {
  id: string;
  itemId: string;
  arquivo: Blob;
  metadados: MetadadosImagem;
  previa: string;
  tentativas: number;
  situacao: 'aguardando' | 'enviando' | 'falhou';
  erro?: string;
};

const CONCORRENCIA = 2;
const MAXIMO_TENTATIVAS = 5;
const ESPERA_BASE = 1200;

/**
 * Fila em memoria. Fechar a aba perde o que ainda nao subiu, e por isso a tela
 * avisa e o beforeunload segura a saida enquanto houver pendencia.
 */
export function useFilaEnvio(token: string, aoConcluirItem: () => void) {
  const [fila, setFila] = useState<ItemFila[]>([]);
  const [online, setOnline] = useState(true);
  const emVoo = useRef(new Set<string>());

  useEffect(() => {
    const atualizar = () => setOnline(navigator.onLine);

    atualizar();
    window.addEventListener('online', atualizar);
    window.addEventListener('offline', atualizar);

    return () => {
      window.removeEventListener('online', atualizar);
      window.removeEventListener('offline', atualizar);
    };
  }, []);

  const pendentes = fila.length;

  useEffect(() => {
    if (pendentes === 0) {
      return;
    }

    const avisar = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
      evento.returnValue = '';
    };

    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [pendentes]);

  const enfileirar = useCallback(
    (itemId: string, arquivo: Blob, metadados: MetadadosImagem) => {
      setFila((atual) => [
        ...atual,
        {
          id: `${itemId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          itemId,
          arquivo,
          metadados,
          previa: URL.createObjectURL(arquivo),
          tentativas: 0,
          situacao: 'aguardando',
        },
      ]);
    },
    [],
  );

  const remover = useCallback((id: string) => {
    setFila((atual) => {
      const alvo = atual.find((item) => item.id === id);

      if (alvo) {
        URL.revokeObjectURL(alvo.previa);
      }

      return atual.filter((item) => item.id !== id);
    });
  }, []);

  const tentarNovamente = useCallback(() => {
    setFila((atual) =>
      atual.map((item) =>
        item.situacao === 'falhou'
          ? { ...item, situacao: 'aguardando', tentativas: 0, erro: undefined }
          : item,
      ),
    );
  }, []);

  const enviar = useCallback(
    async (item: ItemFila) => {
      const formulario = new FormData();
      formulario.append('arquivo', item.arquivo, 'foto.jpg');

      for (const [chave, valor] of Object.entries(item.metadados)) {
        if (valor !== undefined) {
          formulario.append(chave, String(valor));
        }
      }

      const resposta = await fetch(`/api/vistoria/${token}/itens/${item.itemId}/fotos`, {
        method: 'POST',
        body: formulario,
      });

      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => null);
        throw new Error(corpo?.mensagem ?? corpo?.message ?? 'Falha no envio');
      }
    },
    [token],
  );

  useEffect(() => {
    if (!online) {
      return;
    }

    const proximo = fila.find(
      (item) => item.situacao === 'aguardando' && !emVoo.current.has(item.id),
    );

    if (!proximo || emVoo.current.size >= CONCORRENCIA) {
      return;
    }

    emVoo.current.add(proximo.id);
    setFila((atual) =>
      atual.map((item) => (item.id === proximo.id ? { ...item, situacao: 'enviando' } : item)),
    );

    void enviar(proximo)
      .then(() => {
        emVoo.current.delete(proximo.id);
        remover(proximo.id);
        aoConcluirItem();
      })
      .catch((falha: Error) => {
        emVoo.current.delete(proximo.id);
        const tentativas = proximo.tentativas + 1;

        if (tentativas >= MAXIMO_TENTATIVAS) {
          setFila((atual) =>
            atual.map((item) =>
              item.id === proximo.id
                ? { ...item, situacao: 'falhou', tentativas, erro: falha.message }
                : item,
            ),
          );
          return;
        }

        // Backoff exponencial: rede de imovel vazio oscila muito.
        setTimeout(
          () =>
            setFila((atual) =>
              atual.map((item) =>
                item.id === proximo.id ? { ...item, situacao: 'aguardando', tentativas } : item,
              ),
            ),
          ESPERA_BASE * 2 ** proximo.tentativas,
        );
      });
  }, [fila, online, enviar, remover, aoConcluirItem]);

  const enviando = fila.filter((item) => item.situacao !== 'falhou').length;
  const falhas = fila.filter((item) => item.situacao === 'falhou');

  return { fila, enviando, falhas, online, enfileirar, tentarNovamente, remover };
}
