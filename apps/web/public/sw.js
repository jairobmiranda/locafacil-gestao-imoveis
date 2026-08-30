// Cache apenas de assets imutaveis e da pagina offline. Nada de resposta com dado privado.
const VERSAO = 'locafacil-v2';
const ESTATICOS = ['/offline.html', '/icone-192.png', '/icone-512.png'];

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(VERSAO).then((cache) => cache.addAll(ESTATICOS)));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(chaves.filter((chave) => chave !== VERSAO).map((chave) => caches.delete(chave))),
      ),
  );
});

self.addEventListener('fetch', (evento) => {
  const requisicao = evento.request;

  if (requisicao.method !== 'GET' || new URL(requisicao.url).origin !== self.location.origin) {
    return;
  }

  if (new URL(requisicao.url).pathname.startsWith('/_next/static/')) {
    evento.respondWith(
      caches.match(requisicao).then(
        (cacheada) =>
          cacheada ??
          fetch(requisicao).then((resposta) => {
            if (resposta.ok) {
              const copia = resposta.clone();
              caches.open(VERSAO).then((cache) => cache.put(requisicao, copia));
            }
            return resposta;
          }),
      ),
    );
    return;
  }

  if (requisicao.mode === 'navigate') {
    evento.respondWith(
      fetch(requisicao).catch(() => caches.match('/offline.html').then((resposta) => resposta ?? Response.error())),
    );
  }
});
