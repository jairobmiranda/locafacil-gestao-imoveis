import exifr from 'exifr';

export type MetadadosImagem = {
  capturadaEm?: string;
  latitude?: number;
  longitude?: number;
  largura?: number;
  altura?: number;
};

export type ImagemPreparada = {
  arquivo: Blob;
  metadados: MetadadosImagem;
};

const LADO_MAXIMO = 1600;
const QUALIDADE = 0.8;

/**
 * O canvas descarta o EXIF, entao data, hora e coordenada precisam ser lidos
 * do arquivo original antes de qualquer redimensionamento.
 */
async function lerExif(arquivo: File): Promise<MetadadosImagem> {
  try {
    const dados = await exifr.parse(arquivo, {
      pick: ['DateTimeOriginal', 'CreateDate', 'latitude', 'longitude'],
      gps: true,
    });

    if (!dados) {
      return {};
    }

    const capturada = dados.DateTimeOriginal ?? dados.CreateDate;

    return {
      ...(capturada instanceof Date ? { capturadaEm: capturada.toISOString() } : {}),
      ...(typeof dados.latitude === 'number' ? { latitude: dados.latitude } : {}),
      ...(typeof dados.longitude === 'number' ? { longitude: dados.longitude } : {}),
    };
  } catch {
    return {};
  }
}

/** Reduz para no maximo 1600px no lado maior. Uma foto de 4 MB cai para uns 300 KB. */
export async function prepararImagem(arquivo: File): Promise<ImagemPreparada> {
  const metadados = await lerExif(arquivo);

  // createImageBitmap ja aplica a orientacao do EXIF, o que evita foto deitada no iPhone.
  const bitmap = await createImageBitmap(arquivo, { imageOrientation: 'from-image' });

  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);

  const tela = document.createElement('canvas');
  tela.width = largura;
  tela.height = altura;

  const contexto = tela.getContext('2d');

  if (!contexto) {
    bitmap.close();
    throw new Error('Não foi possível processar a imagem neste navegador');
  }

  contexto.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();

  const comprimida = await new Promise<Blob | null>((resolver) =>
    tela.toBlob(resolver, 'image/jpeg', QUALIDADE),
  );

  if (!comprimida) {
    throw new Error('Não foi possível comprimir a imagem');
  }

  return { arquivo: comprimida, metadados: { ...metadados, largura, altura } };
}
