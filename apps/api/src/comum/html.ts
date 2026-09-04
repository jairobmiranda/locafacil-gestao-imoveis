/** Valores vindos do banco entram em HTML de modelo editavel pelo usuario. */
export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Formatacao que o editor do painel produz. Tudo fora disso vira texto puro. */
const TAGS_PERMITIDAS = new Map<string, string>([
  ['b', 'strong'],
  ['strong', 'strong'],
  ['i', 'em'],
  ['em', 'em'],
  ['u', 'u'],
  ['p', 'p'],
  ['div', 'p'],
  ['br', 'br'],
  ['ul', 'ul'],
  ['ol', 'ol'],
  ['li', 'li'],
]);

const VAZIAS = new Set(['br']);

/** Depois da limpeza toda tag vira exatamente isto, sem atributo nenhum. */
const TAG_NORMALIZADA = /<(?!\/?(?:strong|em|u|p|br|ul|ol|li)>)/g;

/**
 * Sanitiza o HTML de um campo rico antes de gravar. A whitelist e fechada e **todo** atributo
 * cai junto com a tag original, entao nao sobra `on*`, `style` nem `href`: nao ha superficie
 * para script nem para `javascript:`. O texto entre as tags nao precisa ser reescrito porque o
 * editor ja entrega `<` e `&` escapados, e o que escapar dele vira entidade no final.
 */
export function sanitizarHtmlRico(html: string): string {
  // Tag com conteudo executavel some inteira: so tirar a marcacao deixaria o corpo como texto.
  const semBlocos = html.replace(/<(script|style|iframe|object|embed)\b[\s\S]*?<\/\1\s*>/gi, '');

  const limpo = semBlocos.replace(/<\/?([a-zA-Z0-9]+)\b[^>]*>/g, (tag, nome: string) => {
    const permitida = TAGS_PERMITIDAS.get(nome.toLowerCase());

    if (!permitida) {
      return '';
    }

    if (VAZIAS.has(permitida)) {
      return `<${permitida}>`;
    }

    return tag.startsWith('</') ? `</${permitida}>` : `<${permitida}>`;
  });

  // Sobra de tag mal formada (`<script` sem fechar, por exemplo) nunca volta a ser marcacao.
  return limpo.replace(TAG_NORMALIZADA, '&lt;').trim();
}

/** Um campo rico vazio ainda chega cheio de marcacao: `<p><br></p>` e afins. */
export function textoDeHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Por ultimo: antes dele, `&amp;lt;` viraria `<` em vez de `&lt;`.
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}
