/**
 * render.js — Funções de renderização (dados da API → HTML)
 *
 * Todos os controles de edição (botões, inputs de arquivo, doc-add, doc-del)
 * só são renderizados quando o usuário está autenticado.
 * Isso garante que nem mesmo via DevTools apareça o elemento no DOM.
 */

const Render = (() => {

  const STATUS_LABEL = { done:"Concluído", prog:"Em andamento", plan:"Planejado" };
  const STATUS_CLASS = { done:"status-done", prog:"status-prog", plan:"status-plan" };

  /* ── Helper: verifica login antes de renderizar controles ── */
  function logged() {
    return typeof Auth !== "undefined" && Auth.isLoggedIn();
  }

  /* ── ACTIVITY CARD ── */
  function activityCard(act, participants) {
    const isLogged = logged();
    const members  = act.members || [];

    const chips = members.length
      ? members.map(m => `<span class="member-chip">${m.name || m}</span>`).join("")
      : `<span style="color:#aaa;font-size:.78rem">Nenhum membro</span>`;

    /* ── Galeria de fotos ── */
    const photos = act.photos || [];
    let photoStrip;
    if (photos.length) {
      photoStrip = `
        <div class="card-gallery" data-actid="${act.id}">
          <img src="${photos[0].url}" alt="${photos[0].caption || 'Foto'}" loading="lazy"/>
          ${photos.length > 1 ? `<div class="gallery-count">${photos.length} fotos</div>` : ""}
        </div>`;
    } else if (isLogged) {
      /* Somente logado vê o placeholder de "Adicionar fotos" */
      photoStrip = `
        <div class="card-gallery-empty">
          <div class="gal-icon">🖼️</div>
          <div class="gal-hint">Adicionar fotos</div>
        </div>`;
    } else {
      /* Visitante sem fotos — exibe faixa neutra sem CTA de edição */
      photoStrip = `<div class="card-gallery-empty card-gallery-public"></div>`;
    }

    /* ── Documentos ── */
    const docs = act.documents || [];

    /* Botão de download sempre visível; botão de excluir só para logado */
    const docItems = docs.map(d => `
      <div class="doc-item">
        <span class="doc-icon">${docIcon(d.ext)}</span>
        <span class="doc-name">${d.original_name}</span>
        <span class="doc-type">${(d.ext || "?").toUpperCase()}</span>
        <button class="doc-open" onclick="App.openDoc('${d.url}','${d.original_name}')" title="Baixar">↗</button>
        ${isLogged ? `<button class="doc-del" onclick="App.deleteDoc('${act.id}','${d.id}')" title="Remover">✕</button>` : ""}
      </div>`).join("");

    /* Botão "Anexar documento" — SÓ para logado */
    const docAddBtn = isLogged ? `
      <label class="doc-add" title="Anexar documento">
        <span>＋</span> Anexar documento
        <input type="file"
               accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.png,.jpg,.jpeg"
               style="display:none"
               onchange="App.addDoc('${act.id}',this)">
      </label>` : "";

    /* Seção de documentos: mostra se tiver docs OU se logado */
    const docsSection = (docs.length > 0 || isLogged) ? `
      <div class="card-docs">
        <div class="card-docs-title">📎 Documentos</div>
        <div class="doc-list">${docItems}</div>
        ${docAddBtn}
      </div>` : "";

    /* Botões de edição do card — SÓ para logado */
    const cardActions = isLogged ? `
      <div class="card-actions">
        <button class="btn-edit-card" onclick="App.openEditActivity('${act.id}')">✏️ Editar</button>
        <button class="btn-add-photo" onclick="App.triggerPhotoUpload('${act.id}')">📷 Fotos</button>
        <input type="file" id="photo-input-${act.id}" accept="image/*" multiple
               style="display:none" onchange="App.addPhotos('${act.id}',this)">
      </div>` : "";

    return `
    <div class="atividade-card" data-id="${act.id}">
      ${photoStrip}
      <div class="card-body">
        <div class="card-top-row">
          <div class="card-icon ${act.icon_color === 'orange' ? 'orange' : ''}">${act.icon}</div>
          <span class="card-status ${STATUS_CLASS[act.status] || 'status-plan'}">${STATUS_LABEL[act.status] || act.status}</span>
        </div>
        <span class="card-tag">${act.tag}</span>
        <div class="card-title">${act.title}</div>
        <div class="card-desc">${act.description || '<em style="color:#bbb">Sem descrição.</em>'}</div>
        <div class="card-members">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          ${chips}
        </div>
        ${docsSection}
        ${cardActions}
      </div>
    </div>`;
  }

  /* ── PARTICIPANT CARD ── */
  function participantCard(p, activities) {
    const isLogged = logged();
    const myActs   = activities.filter(a =>
      (a.members || []).some(m => (m.id || m) === p.id)
    );
    const tags = myActs.length
      ? myActs.map(a => `<span class="tag">${a.tag}</span>`).join("")
      : `<span class="tag tag-empty">Sem atividades</span>`;

    /* Botão editar — SÓ para logado */
    const editBtn = isLogged
      ? `<button class="btn-edit-member" onclick="App.openEditParticipant('${p.id}')">✏️</button>`
      : "";

    return `
    <div class="participante-card" data-id="${p.id}">
      ${editBtn}
      <div class="avatar ${p.color || 'blue'}">${p.avatar}</div>
      <div class="participante-name">${p.name}</div>
      <div class="participante-role">${p.role}</div>
      <div class="participante-curso">${p.course}</div>
      <div class="participante-tags">${tags}</div>
    </div>`;
  }

  /* ── KPI CARD ── */
  function kpiCard(k) {
    const isLogged = logged();
    const trend    = k.trend === "up"
      ? `<span class="kpi-trend up">↑ Ativo</span>`
      : `<span class="kpi-trend info">Atualizar</span>`;

    /* Botão editar — SÓ para logado */
    const editBtn = isLogged
      ? `<button class="btn-edit-kpi" onclick="App.openEditKpi('${k.id}')" title="Editar KPI">✏️</button>`
      : "";

    return `
    <div class="kpi-card" data-id="${k.id}">
      <div class="kpi-top"><div class="kpi-icon">${k.icon}</div>${trend}</div>
      <div class="kpi-value">${k.value}</div>
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-sub">${k.sub || ""}</div>
      ${editBtn}
    </div>`;
  }

  /* ── PROJECT INFO ── */
  function projectInfo(proj) {
    const fields = [
      { icon: "🎯",  label: "Tema central",             key: "theme" },
      { icon: "🏛️", label: "Instituição",               key: "institution" },
      { icon: "👩‍⚕️", label: "Tutor(a) / Preceptor(a)",  key: "supervisor" },
      { icon: "📅",  label: "Período",                   key: "period" },
      { icon: "💡",  label: "Financiamento",              key: "funding" },
    ];
    return fields.map(f => `
      <li>
        <div class="icon-wrap">${f.icon}</div>
        <div class="text">
          <strong>${f.label}</strong>
          <span>${proj[f.key] || "—"}</span>
        </div>
      </li>`).join("");
  }

  /* ── Ícone de documento ── */
  function docIcon(ext) {
    const t = (ext || "").toLowerCase();
    if (t === "pdf")                              return "📄";
    if (["doc", "docx"].includes(t))             return "📝";
    if (["ppt", "pptx"].includes(t))             return "📊";
    if (["xls", "xlsx"].includes(t))             return "📈";
    if (["zip", "rar"].includes(t))              return "🗜️";
    if (["png","jpg","jpeg","gif","webp"].includes(t)) return "🖼️";
    return "📎";
  }

  return { activityCard, participantCard, kpiCard, projectInfo };
})();
