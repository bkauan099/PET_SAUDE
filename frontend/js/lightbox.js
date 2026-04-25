/**
 * lightbox.js — Visualizador de fotos em tela cheia
 * Compatível com a shape da API: { id, url, caption }
 */

const Lightbox = (() => {
  let imgs = [], idx = 0;

  function open(photos, startIdx = 0) {
    if (!photos || !photos.length) return;
    imgs = photos;
    idx  = Math.max(0, Math.min(startIdx, photos.length - 1));
    update();
    document.getElementById("lightbox").classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function close() {
    document.getElementById("lightbox").classList.remove("open");
    document.body.style.overflow = "";
    imgs = []; idx = 0;
  }

  function nav(dir) {
    if (!imgs.length) return;
    idx = (idx + dir + imgs.length) % imgs.length;
    update();
  }

  function update() {
    const photo = imgs[idx];
    if (!photo) return;
    /* API retorna .url; fallback .dataUrl para compatibilidade futura */
    document.getElementById("lb-img").src = photo.url || photo.dataUrl || "";
    const cap     = photo.caption || "";
    const counter = imgs.length > 1 ? `${idx + 1} / ${imgs.length}` : "";
    document.getElementById("lb-cap").textContent =
      cap && counter ? `${cap}  ·  ${counter}` : cap || counter;
  }

  /* ── Teclado ── */
  document.addEventListener("keydown", e => {
    const lb = document.getElementById("lightbox");
    if (!lb?.classList.contains("open")) return;
    if (e.key === "Escape")     close();
    if (e.key === "ArrowRight") nav(1);
    if (e.key === "ArrowLeft")  nav(-1);
  });

  /* ── Clique fora fecha ── */
  document.addEventListener("click", e => {
    if (e.target.id === "lightbox") close();
  });

  /* ── Clique no card-gallery abre o lightbox ── */
  document.addEventListener("click", e => {
    const gal = e.target.closest(".card-gallery");
    if (!gal) return;
    const actId = gal.dataset.actid;
    if (!actId) return;
    /* Busca as fotos do estado global mantido pelo app.js */
    const act = (window._appState?.activities || []).find(a => a.id === actId);
    if (act?.photos?.length) open(act.photos, 0);
  });

  return { open, close, nav };
})();
