/* Modo offline do painel de massas.
   - Guarda a página, as imagens e a fonte no aparelho na primeira visita.
   - A planilha (outro site) NUNCA passa por aqui: vai sempre direta à rede.
   Se mudares as imagens/páginas, aumenta o número da VERSAO para limpar o que estava guardado. */
var VERSAO = "massas-v1";
var ARQUIVOS = ["./", "index.html", "img/logo.png",
  "img/1.jpg", "img/2.jpg", "img/3.jpg", "img/4.jpg", "img/5.jpg", "img/6.jpg", "img/7.jpg", "img/8.jpg", "img/9.jpg"];
var FONTES = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSAO).then(function (c) {
    return Promise.all(ARQUIVOS.map(function (f) { return c.add(f).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSAO; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  var mesmoSite = url.origin === self.location.origin, ehFonte = FONTES.indexOf(url.hostname) > -1;
  if (req.method !== "GET" || (!mesmoSite && !ehFonte)) return;

  var guardar = function (c, r) { if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone()); return r; };

  // Página: tenta a rede primeiro (para receber atualizações); sem internet, usa a guardada
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(function (r) {
      return caches.open(VERSAO).then(function (c) { c.put("index.html", r.clone()); return r; });
    }).catch(function () { return caches.match("index.html", { ignoreSearch: true }); }));
    return;
  }
  // Imagens e fontes: mostra já o que está guardado e atualiza em segundo plano
  e.respondWith(caches.open(VERSAO).then(function (c) {
    return c.match(req, { ignoreSearch: true }).then(function (hit) {
      var rede = fetch(req).then(function (r) { return guardar(c, r); }).catch(function () { return hit; });
      return hit || rede;
    });
  }));
});
