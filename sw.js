/* Meus Plantões: guarda uma cópia do APP (as telas) no aparelho, para ele abrir mesmo sem internet.
   Os DADOS não passam por aqui: eles ficam no banco do navegador e na nuvem (Supabase).
   Ao mudar a lista de arquivos, troque o número da versão em CACHE.
   O app de teste e o app real ficam no mesmo site (honorio68.github.io): cada um só mexe nas cópias
   com o próprio começo de nome (PREFIXO), para um nunca apagar a cópia do outro. */
const PREFIXO = "meus-plantoes-real-";
const CACHE = PREFIXO + "v1";
const ARQUIVOS = [
  "./", "index.html", "manifest.webmanifest",
  "icone-192.png", "icone-512.png", "icone-maskable-192.png", "icone-maskable-512.png",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js"
];

// instalação: baixa e guarda os arquivos do app
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
// versão nova: apaga só as cópias antigas DESTE app
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE && (k.startsWith(PREFIXO))).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function guardar(pedido, resposta) {
  if (resposta && (resposta.ok || resposta.type === "opaque")) {
    const copia = resposta.clone();
    caches.open(CACHE).then(c => c.put(pedido, copia));
  }
  return resposta;
}

self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET") return;
  if (u.hostname.endsWith(".supabase.co")) return; // dados e login: sempre direto na nuvem

  // o próprio app: com internet, pega a versão mais nova; sem internet, usa a cópia guardada
  if (r.mode === "navigate" || u.origin === self.location.origin) {
    e.respondWith(
      fetch(r).then(resp => guardar(r, resp))
        .catch(() => caches.match(r, { ignoreSearch: true, cacheName: CACHE }).then(x => x || caches.match("index.html", { cacheName: CACHE })))
    );
    return;
  }
  // biblioteca do Supabase e letras do Google: usa a cópia guardada (o endereço já tem a versão fixa)
  if (u.hostname === "cdn.jsdelivr.net" || u.hostname === "fonts.googleapis.com" || u.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.match(r).then(x => x || fetch(r).then(resp => guardar(r, resp))));
  }
});
