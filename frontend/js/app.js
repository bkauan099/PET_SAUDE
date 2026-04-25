/**
 * app.js — Controlador principal integrado com Auth
 */

const App = (() => {
  let state = { activities: [], participants: [], kpis: [], project: {} };

  /* ── Toast ── */
  function toast(msg, type = "success") {
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 350); }, 3000);
  }

  /* ── Spinner ── */
  function setLoading(on) {
    document.getElementById("global-spinner")?.classList.toggle("show", on);
  }

  /* ── Bootstrap ── */
  async function init() {
    /* Inicializa Auth primeiro (lê token do sessionStorage) */
    Auth.init();

    /* Escuta eventos do módulo Auth */
    document.addEventListener("auth:login",           () => { applyAuthUI(); renderAll(); });
    document.addEventListener("app:toast",            e  => toast(e.detail.msg, e.detail.type || "success"));
    document.addEventListener("auth:passwordChanged", () => toast("Senha alterada com sucesso ✅"));

    bindNav();
    setLoading(true);
    try {
      await loadAll();
    } catch (err) {
      toast("Erro ao conectar ao servidor. Verifique o backend.", "error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadAll() {
    const [activities, participants, kpis, project] = await Promise.all([
      API.activities.list(),
      API.participants.list(),
      API.kpis.list(),
      API.project.get(),
    ]);
    state = { activities, participants, kpis, project };
    window._appState = state;
    renderAll();
  }

  /* ── Render ── */
  function renderAll() {
    const { activities, participants, kpis, project } = state;

    document.getElementById("atividades-grid").innerHTML =
      activities.length
        ? activities.map(a => Render.activityCard(a, participants)).join("")
        : `<div class="empty-state">Nenhuma atividade cadastrada ainda.</div>`;

    document.getElementById("participantes-grid").innerHTML =
      participants.map(p => Render.participantCard(p, activities)).join("");

    document.getElementById("kpi-grid").innerHTML =
      kpis.map(k => Render.kpiCard(k)).join("");

    document.getElementById("project-list").innerHTML =
      Render.projectInfo(project);

    const em = document.getElementById("footer-email");
    if (em) { em.href = "mailto:" + (project.email||""); em.textContent = project.email || "—"; }

    const setEl = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    setEl("stat-members", participants.length + "+");
    setEl("stat-total",   activities.length   + "+");
    setEl("stat-done",    activities.filter(a => a.status === "done").length + "+");

    applyAuthUI();
    animateCards();
  }

  /* ── Aplica estado de autenticação na UI ── */
  function applyAuthUI() {
    const logged  = Auth.isLoggedIn();
    const isAdmin = Auth.isAdmin();

    /* ── Botão login/logout na navbar ── */
    const btn = document.getElementById("nav-auth-btn");
    if (btn) {
      const user = Auth.getUser();
      btn.textContent = logged
        ? `↩ Sair (${user?.name?.split(" ")[0] || "usuário"})`
        : "🔒 Login";
      btn.onclick = logged
        ? () => { Auth.logout(); }   /* logout dispara auth:logout → renderAll */
        : () => Auth.openLoginModal();
      btn.classList.toggle("nav-auth-logged", logged);
    }

    /* ── Botões da seção Sobre ── */
    const editProject = document.querySelector(".btn-edit-project");
    if (editProject) editProject.style.display = logged ? "" : "none";

    const manageUsers = document.getElementById("btn-manage-users");
    if (manageUsers) manageUsers.style.display = (logged && isAdmin) ? "" : "none";

    const changePass = document.getElementById("btn-change-password");
    if (changePass) changePass.style.display = logged ? "" : "none";

    /* ── Botão "Nova Atividade" ── */
    document.querySelectorAll(".btn-new-activity").forEach(el => {
      el.style.display = logged ? "" : "none";
    });

    /*
     * IMPORTANTE: Re-renderiza os cards para que o render.js
     * (que verifica Auth.isLoggedIn() em tempo de execução) recrie
     * o DOM correto — sem botões de edição para visitantes.
     * Só re-renderiza se o estado já tiver dados carregados.
     */
    if (state.activities.length || state.participants.length) {
      _renderCards();
    }
  }

  /* Renderiza apenas os grids de cards (sem re-buscar a API) */
  function _renderCards() {
    const { activities, participants, kpis } = state;

    const grid = document.getElementById("atividades-grid");
    if (grid) grid.innerHTML = activities.length
      ? activities.map(a => Render.activityCard(a, participants)).join("")
      : `<div class="empty-state">Nenhuma atividade cadastrada ainda.</div>`;

    const pgrid = document.getElementById("participantes-grid");
    if (pgrid) pgrid.innerHTML = participants.map(p => Render.participantCard(p, activities)).join("");

    const kgrid = document.getElementById("kpi-grid");
    if (kgrid) kgrid.innerHTML = kpis.map(k => Render.kpiCard(k)).join("");

    animateCards();
  }

  /* ── Nav hamburger ── */
  function bindNav() {
    document.querySelector(".hamburger")?.addEventListener("click", () => {
      document.querySelector(".nav-links").classList.toggle("nav-open");
    });
  }

  /* ─────────────────────────────────────────
     ATIVIDADES
  ───────────────────────────────────────── */
  function openEditActivity(actId) {
    if (!Auth.isLoggedIn()) return Auth.openLoginModal();
    const act = state.activities.find(a => a.id === actId);
    if (act) Modal.openEditActivity(act, state.participants);
  }

  async function saveActivity(actId) {
    const title = document.getElementById("ea-title").value.trim();
    if (!title) return toast("Título é obrigatório", "error");
    const members = [...document.querySelectorAll(".member-checks input:checked")].map(el => el.value);
    setLoading(true);
    try {
      const updated = await API.activities.update(actId, {
        title, members,
        description: document.getElementById("ea-desc").value.trim(),
        status:      document.getElementById("ea-status").value,
        tag:         document.getElementById("ea-tag").value,
        icon:        document.getElementById("ea-icon").value,
        icon_color:  document.getElementById("ea-iconcolor").value,
      });
      state.activities = state.activities.map(a => a.id === actId ? updated : a);
      window._appState = state;
      Modal.closeAll(); renderAll(); toast("Atividade salva ✅");
    } catch (err) { toast(err.message, "error"); }
    finally { setLoading(false); }
  }

  async function deleteActivity(actId) {
    if (!confirm("Excluir esta atividade permanentemente?")) return;
    setLoading(true);
    try {
      await API.activities.remove(actId);
      state.activities = state.activities.filter(a => a.id !== actId);
      window._appState = state;
      Modal.closeAll(); renderAll(); toast("Atividade excluída");
    } catch (err) { toast(err.message, "error"); }
    finally { setLoading(false); }
  }

  function openAddActivity() {
    if (!Auth.isLoggedIn()) return Auth.openLoginModal();
    Modal.openAddActivity(state.participants);
  }

  async function createActivity() {
    const title = document.getElementById("na-title").value.trim();
    if (!title) return toast("Título é obrigatório", "error");
    const members = [...document.querySelectorAll(".member-checks input:checked")].map(el => el.value);
    setLoading(true);
    try {
      const created = await API.activities.create({
        title, members,
        description: document.getElementById("na-desc").value.trim(),
        status:      document.getElementById("na-status").value,
        tag:         document.getElementById("na-tag").value,
        icon:        document.getElementById("na-icon").value,
        icon_color:  document.getElementById("na-iconcolor").value,
      });
      state.activities.push(created);
      window._appState = state;
      Modal.closeAll(); renderAll(); toast("Atividade criada ✅");
    } catch (err) { toast(err.message, "error"); }
    finally { setLoading(false); }
  }

  /* ─────────────────────────────────────────
     FOTOS
  ───────────────────────────────────────── */
  function triggerPhotoUpload(actId) {
    if (!Auth.isLoggedIn()) return Auth.openLoginModal();
    document.getElementById("photo-input-" + actId)?.click();
  }

  async function _uploadPhotos(actId, files, reopenModal = false) {
    setLoading(true);
    try {
      const added = await API.activities.addPhotos(actId, files);
      const act = state.activities.find(a => a.id === actId);
      if (act) act.photos = [...(act.photos || []), ...added];
      window._appState = state;
      renderAll();
      if (reopenModal) openEditActivity(actId);
      toast(`${added.length} foto(s) adicionada(s) ✅`);
    } catch (err) { toast(err.message, "error"); }
    finally { setLoading(false); }
  }

  function addPhotos(actId, input) {
    if (input.files?.length) _uploadPhotos(actId, input.files, false);
    input.value = "";
  }
  function addPhotosFromModal(actId, input) {
    if (input.files?.length) _uploadPhotos(actId, input.files, true);
    input.value = "";
  }

  async function deletePhoto(actId, photoId) {
    setLoading(true);
    try {
      await API.activities.deletePhoto(actId, photoId);
      const act = state.activities.find(a => a.id === actId);
      if (act) act.photos = act.photos.filter(p => p.id !== photoId);
      window._appState = state;
      renderAll(); openEditActivity(actId); toast("Foto removida");
    } catch (err) { toast(err.message, "error"); }
    finally { setLoading(false); }
  }

  const _capTimers = {};
  function _updateCaption(actId, photoId, caption) {
    clearTimeout(_capTimers[photoId]);
    _capTimers[photoId] = setTimeout(async () => {
      try {
        await API.activities.updatePhotoCaption(actId, photoId, caption);
        const act = state.activities.find(a => a.id === actId);
        const ph  = act?.photos?.find(p => p.id === photoId);
        if (ph) ph.caption = caption;
      } catch (e) { /* silencioso */ }
    }, 700);
  }

  /* ─────────────────────────────────────────
     DOCUMENTOS
  ───────────────────────────────────────── */
  async function addDoc(actId, input) {
    const file = input.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const doc = await API.activities.addDocument(actId, file);
      const act = state.activities.find(a => a.id === actId);
      if (act) act.documents = [...(act.documents || []), doc];
      renderAll(); toast("Documento anexado ✅");
    } catch (err) { toast(err.message, "error"); }
    finally { setLoading(false); input.value = ""; }
  }

  async function deleteDoc(actId, docId) {
    if (!confirm("Remover este documento?")) return;
    setLoading(true);
    try {
      await API.activities.deleteDocument(actId, docId);
      const act = state.activities.find(a => a.id === actId);
      if (act) act.documents = act.documents.filter(d => d.id !== docId);
      renderAll(); toast("Documento removido");
    } catch (err) { toast(err.message, "error"); }
    finally { setLoading(false); }
  }

  function openDoc(docUrl, docName) {
    const a = document.createElement("a");
    a.href = docUrl; a.download = docName; a.target = "_blank"; a.click();
  }

  /* ─────────────────────────────────────────
     PARTICIPANTES
  ───────────────────────────────────────── */
  function openEditParticipant(pId) {
    if (!Auth.isLoggedIn()) return Auth.openLoginModal();
    const p = state.participants.find(x => x.id === pId);
    if (p) Modal.openEditParticipant(p);
  }

  async function saveParticipant(pId) {
    const name = document.getElementById("ep-name").value.trim();
    if (!name) return toast("Nome é obrigatório", "error");
    setLoading(true);
    try {
      const updated = await API.participants.update(pId, {
        name,
        role:   document.getElementById("ep-role").value,
        course: document.getElementById("ep-course").value.trim(),
        color:  document.querySelector('input[name="ep-color"]:checked')?.value || "blue",
      });
      state.participants = state.participants.map(p => p.id === pId ? updated : p);
      Modal.closeAll(); renderAll(); toast("Participante salvo ✅");
    } catch (err) { toast(err.message, "error"); }
    finally { setLoading(false); }
  }

  /* ─────────────────────────────────────────
     KPIs
  ───────────────────────────────────────── */
  function openEditKpi(kpiId) {
    if (!Auth.isLoggedIn()) return Auth.openLoginModal();
    const k = state.kpis.find(x => x.id === kpiId);
    if (k) Modal.openEditKpi(k);
  }

  async function saveKpi(kpiId) {
    setLoading(true);
    try {
      const updated = await API.kpis.update(kpiId, {
        icon:  document.getElementById("ek-icon")?.value.trim(),
        label: document.getElementById("ek-label")?.value.trim(),
        value: document.getElementById("ek-value").value.trim(),
        sub:   document.getElementById("ek-sub").value.trim(),
        trend: document.getElementById("ek-trend").value,
      });
      state.kpis = state.kpis.map(k => k.id === kpiId ? updated : k);
      window._appState = state;
      Modal.closeAll(); renderAll(); toast("KPI atualizado ✅");
    } catch (err) { toast(err.message, "error"); }
    finally { setLoading(false); }
  }

  /* ─────────────────────────────────────────
     PROJETO
  ───────────────────────────────────────── */
  function openEditProject() {
    if (!Auth.isLoggedIn()) return Auth.openLoginModal();
    Modal.openEditProject(state.project);
  }

  async function saveProject() {
    setLoading(true);
    try {
      state.project = await API.project.update({
        theme:       document.getElementById("eproj-theme").value.trim(),
        institution: document.getElementById("eproj-institution").value.trim(),
        supervisor:  document.getElementById("eproj-supervisor").value.trim(),
        period:      document.getElementById("eproj-period").value.trim(),
        funding:     document.getElementById("eproj-funding").value.trim(),
        email:       document.getElementById("eproj-email").value.trim(),
      });
      Modal.closeAll(); renderAll(); toast("Projeto salvo ✅");
    } catch (err) { toast(err.message, "error"); }
    finally { setLoading(false); }
  }

  /* ── Animações ── */
  function animateCards() {
    const items = document.querySelectorAll(".atividade-card, .participante-card, .kpi-card");
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          e.target.style.animationDelay = (i * 0.04) + "s";
          e.target.style.animation = "fadeUp .45s ease both";
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.06 });
    items.forEach(c => obs.observe(c));
  }

  return {
    init, renderAll, applyAuthUI,
    _toast: toast,
    openEditActivity, saveActivity, deleteActivity, openAddActivity, createActivity,
    triggerPhotoUpload, addPhotos, addPhotosFromModal, deletePhoto, _updateCaption,
    addDoc, deleteDoc, openDoc,
    openEditParticipant, saveParticipant,
    openEditKpi, saveKpi,
    openEditProject, saveProject,
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  Auth.init();
  App.init();
  /* Após login/logout recria todo o DOM para refletir permissões corretamente */
  document.addEventListener("auth:login",  () => App.renderAll());
  document.addEventListener("auth:logout", () => App.renderAll());
  document.addEventListener("app:toast", e => App._toast(e.detail?.msg, e.detail?.type || "success"));
});
