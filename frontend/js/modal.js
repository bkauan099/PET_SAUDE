/**
 * modal.js — Todos os modais de edição
 * Compatível com a shape da API:
 *   - atividade recebe o objeto completo (não actId + activities)
 *   - fotos usam { id, url, caption }
 *   - campo da BD é icon_color (não iconColor)
 *   - membros chegam como array de objetos { id, name, ... }
 */

const Modal = (() => {

  /* ── Abrir / fechar ── */
  function open(id)  {
    document.getElementById(id)?.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function close(id) {
    document.getElementById(id)?.classList.remove("open");
    document.body.style.overflow = "";
  }
  function closeAll() {
    document.querySelectorAll(".modal-overlay.open")
      .forEach(m => m.classList.remove("open"));
    document.body.style.overflow = "";
  }

  /* Clique fora e ESC fecham */
  document.addEventListener("click",   e => { if (e.target.classList.contains("modal-overlay")) closeAll(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeAll(); });

  /* ── Helper: checkboxes de membros ── */
  function buildMemberChecks(selectedIds, participants) {
    return participants.map(p => `
      <label class="member-check ${selectedIds.includes(p.id) ? "checked" : ""}">
        <input type="checkbox" value="${p.id}"
               ${selectedIds.includes(p.id) ? "checked" : ""}
               onchange="this.parentElement.classList.toggle('checked', this.checked)">
        <div class="avatar-sm ${p.color || 'blue'}">${p.avatar}</div>
        <span>${p.name}</span>
      </label>`).join("");
  }

  /* ════════════════════════════════════════
     EDITAR ATIVIDADE
     Recebe o objeto act completo (da API) e
     o array de participants para os checkboxes.
  ════════════════════════════════════════ */
  function openEditActivity(act, participants) {
    /* IDs dos membros já associados */
    const selectedIds = (act.members || []).map(m => m.id || m);

    const iconOpts = ICONS.map(i =>
      `<button type="button" class="icon-btn ${act.icon === i ? "sel" : ""}"
               data-val="${i}"
               onclick="this.closest('.icon-picker').querySelectorAll('.icon-btn').forEach(b=>b.classList.remove('sel'));
                        this.classList.add('sel');
                        document.getElementById('ea-icon').value=this.dataset.val">${i}</button>`
    ).join("");

    const tagOpts = TAGS.map(t =>
      `<option value="${t}" ${act.tag === t ? "selected" : ""}>${t}</option>`
    ).join("");

    const statusOpts = Object.entries(STATUS_MAP).map(([v, l]) =>
      `<option value="${v}" ${act.status === v ? "selected" : ""}>${l}</option>`
    ).join("");

    /* Thumbnails das fotos (shape da API: {id, url, caption}) */
    const thumbsHtml = (act.photos || []).map((ph, i) => `
      <div class="thumb-wrap">
        <img src="${ph.url}" alt="${ph.caption || ''}" class="thumb"
             onclick="Lightbox.open(${JSON.stringify(act.photos || [])}, ${i})"/>
        <input class="thumb-caption" type="text"
               placeholder="Legenda…" value="${ph.caption || ''}"
               oninput="App._updateCaption('${act.id}', '${ph.id}', this.value)">
        <button class="thumb-del"
                onclick="App.deletePhoto('${act.id}', '${ph.id}')"
                title="Remover foto">✕</button>
      </div>`).join("");

    document.getElementById("modal-edit-activity").innerHTML = `
      <div class="modal-box modal-large">
        <div class="modal-header">
          <h3>Editar Atividade</h3>
          <button class="modal-close" onclick="Modal.closeAll()">✕</button>
        </div>
        <div class="modal-body">

          <div class="form-row">
            <div class="form-group flex-2">
              <label>Título</label>
              <input id="ea-title" type="text"
                     value="${act.title || ''}"
                     placeholder="Título da atividade">
            </div>
            <div class="form-group">
              <label>Status</label>
              <select id="ea-status">${statusOpts}</select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Categoria</label>
              <select id="ea-tag">${tagOpts}</select>
            </div>
            <div class="form-group">
              <label>Cor do ícone</label>
              <select id="ea-iconcolor">
                <option value="blue"   ${(act.icon_color || act.iconColor) === "blue"   ? "selected" : ""}>Azul</option>
                <option value="orange" ${(act.icon_color || act.iconColor) === "orange" ? "selected" : ""}>Laranja</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Ícone</label>
            <div class="icon-picker">${iconOpts}</div>
            <input type="hidden" id="ea-icon" value="${act.icon || '📋'}">
          </div>

          <div class="form-group">
            <label>Descrição</label>
            <textarea id="ea-desc" rows="4"
                      placeholder="Objetivo, metodologia, resultados…">${act.description || ''}</textarea>
          </div>

          <div class="form-group">
            <label>Membros responsáveis</label>
            <div class="member-checks">
              ${buildMemberChecks(selectedIds, participants)}
            </div>
          </div>

          <div class="form-group">
            <label>Fotos
              <span class="label-hint">(clique na imagem para ampliar)</span>
            </label>
            <div class="thumbs-grid" id="ea-thumbs">
              ${thumbsHtml || '<span class="empty-hint">Nenhuma foto ainda.</span>'}
            </div>
            <label class="btn-add-photo-inline">
              📷 Adicionar fotos
              <input type="file" accept="image/*" multiple style="display:none"
                     onchange="App.addPhotosFromModal('${act.id}', this)">
            </label>
          </div>

        </div>
        <div class="modal-footer">
          <button class="btn-danger-sm"
                  onclick="App.deleteActivity('${act.id}')">🗑 Excluir atividade</button>
          <div style="display:flex;gap:10px">
            <button class="btn-cancel" onclick="Modal.closeAll()">Cancelar</button>
            <button class="btn-save"   onclick="App.saveActivity('${act.id}')">💾 Salvar</button>
          </div>
        </div>
      </div>`;

    open("modal-edit-activity");
  }

  /* ════════════════════════════════════════
     NOVA ATIVIDADE
  ════════════════════════════════════════ */
  function openAddActivity(participants) {
    const iconOpts = ICONS.map((i, n) =>
      `<button type="button" class="icon-btn ${n === 0 ? "sel" : ""}"
               data-val="${i}"
               onclick="this.closest('.icon-picker').querySelectorAll('.icon-btn').forEach(b=>b.classList.remove('sel'));
                        this.classList.add('sel');
                        document.getElementById('na-icon').value=this.dataset.val">${i}</button>`
    ).join("");

    const tagOpts = TAGS.map(t => `<option value="${t}">${t}</option>`).join("");

    const statusOpts = Object.entries(STATUS_MAP).map(([v, l]) =>
      `<option value="${v}">${l}</option>`
    ).join("");

    document.getElementById("modal-add-activity").innerHTML = `
      <div class="modal-box modal-large">
        <div class="modal-header">
          <h3>Nova Atividade</h3>
          <button class="modal-close" onclick="Modal.closeAll()">✕</button>
        </div>
        <div class="modal-body">

          <div class="form-row">
            <div class="form-group flex-2">
              <label>Título</label>
              <input id="na-title" type="text" placeholder="Nome da atividade">
            </div>
            <div class="form-group">
              <label>Status</label>
              <select id="na-status">${statusOpts}</select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Categoria</label>
              <select id="na-tag">${tagOpts}</select>
            </div>
            <div class="form-group">
              <label>Cor do ícone</label>
              <select id="na-iconcolor">
                <option value="blue">Azul</option>
                <option value="orange">Laranja</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Ícone</label>
            <div class="icon-picker">${iconOpts}</div>
            <input type="hidden" id="na-icon" value="${ICONS[0]}">
          </div>

          <div class="form-group">
            <label>Descrição</label>
            <textarea id="na-desc" rows="3"
                      placeholder="Objetivo, metodologia, resultados…"></textarea>
          </div>

          <div class="form-group">
            <label>Membros responsáveis</label>
            <div class="member-checks">
              ${buildMemberChecks([], participants)}
            </div>
          </div>

        </div>
        <div class="modal-footer">
          <div></div>
          <div style="display:flex;gap:10px">
            <button class="btn-cancel" onclick="Modal.closeAll()">Cancelar</button>
            <button class="btn-save"   onclick="App.createActivity()">➕ Criar</button>
          </div>
        </div>
      </div>`;

    open("modal-add-activity");
  }

  /* ════════════════════════════════════════
     EDITAR PARTICIPANTE
     Recebe o objeto participante completo.
  ════════════════════════════════════════ */
  function openEditParticipant(p) {
    document.getElementById("modal-edit-participant").innerHTML = `
      <div class="modal-box">
        <div class="modal-header">
          <h3>Editar Participante</h3>
          <button class="modal-close" onclick="Modal.closeAll()">✕</button>
        </div>
        <div class="modal-body">

          <div class="form-group">
            <label>Nome</label>
            <input id="ep-name" type="text" value="${p.name || ''}">
          </div>

          <div class="form-group">
            <label>Função</label>
            <select id="ep-role">
              <option ${p.role === "Estudante"    ? "selected" : ""}>Estudante</option>
              <option ${p.role === "Preceptor(a)" ? "selected" : ""}>Preceptor(a)</option>
              <option ${p.role === "Tutor(a)"     ? "selected" : ""}>Tutor(a)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Curso</label>
            <input id="ep-course" type="text" value="${p.course || ''}">
          </div>

          <div class="form-group">
            <label>Cor do avatar</label>
            <div style="display:flex;gap:16px;margin-top:6px">
              <label style="display:flex;align-items:center;gap:7px;cursor:pointer">
                <input type="radio" name="ep-color" value="blue"
                       ${(p.color || "blue") === "blue" ? "checked" : ""}>
                <span style="background:var(--blue);width:20px;height:20px;border-radius:50%;display:inline-block"></span>
                Azul
              </label>
              <label style="display:flex;align-items:center;gap:7px;cursor:pointer">
                <input type="radio" name="ep-color" value="orange"
                       ${p.color === "orange" ? "checked" : ""}>
                <span style="background:var(--orange);width:20px;height:20px;border-radius:50%;display:inline-block"></span>
                Laranja
              </label>
            </div>
          </div>

        </div>
        <div class="modal-footer">
          <div></div>
          <div style="display:flex;gap:10px">
            <button class="btn-cancel" onclick="Modal.closeAll()">Cancelar</button>
            <button class="btn-save"   onclick="App.saveParticipant('${p.id}')">💾 Salvar</button>
          </div>
        </div>
      </div>`;

    open("modal-edit-participant");
  }

  /* ════════════════════════════════════════
     EDITAR KPI
     Recebe o objeto kpi completo.
  ════════════════════════════════════════ */
  function openEditKpi(k) {
    document.getElementById("modal-edit-kpi").innerHTML = `
      <div class="modal-box modal-sm">
        <div class="modal-header">
          <h3>Editar Indicador</h3>
          <button class="modal-close" onclick="Modal.closeAll()">✕</button>
        </div>
        <div class="modal-body">

          <div class="form-group">
            <label>Ícone</label>
            <input id="ek-icon" type="text" value="${k.icon || '📊'}"
                   style="font-size:1.4rem;width:80px;text-align:center">
          </div>

          <div class="form-group">
            <label>Valor</label>
            <input id="ek-value" type="text" value="${k.value || '0'}"
                   placeholder="Ex: 24, 80%, 12+">
          </div>

          <div class="form-group">
            <label>Rótulo</label>
            <input id="ek-label" type="text" value="${k.label || ''}"
                   placeholder="Ex: Atividades realizadas">
          </div>

          <div class="form-group">
            <label>Descrição secundária</label>
            <input id="ek-sub" type="text" value="${k.sub || ''}"
                   placeholder="Ex: Atualize pelo painel">
          </div>

          <div class="form-group">
            <label>Tendência</label>
            <select id="ek-trend">
              <option value="info" ${k.trend === "info" ? "selected" : ""}>Neutro</option>
              <option value="up"   ${k.trend === "up"   ? "selected" : ""}>Positivo (↑ Ativo)</option>
            </select>
          </div>

        </div>
        <div class="modal-footer">
          <div></div>
          <div style="display:flex;gap:10px">
            <button class="btn-cancel" onclick="Modal.closeAll()">Cancelar</button>
            <button class="btn-save"   onclick="App.saveKpi('${k.id}')">💾 Salvar</button>
          </div>
        </div>
      </div>`;

    open("modal-edit-kpi");
  }

  /* ════════════════════════════════════════
     EDITAR PROJETO
     Recebe o objeto project completo.
  ════════════════════════════════════════ */
  function openEditProject(proj) {
    document.getElementById("modal-edit-project").innerHTML = `
      <div class="modal-box">
        <div class="modal-header">
          <h3>Editar Informações do Projeto</h3>
          <button class="modal-close" onclick="Modal.closeAll()">✕</button>
        </div>
        <div class="modal-body">

          <div class="form-group">
            <label>Tema</label>
            <textarea id="eproj-theme" rows="3"
                      placeholder="Tema central do projeto">${proj.theme || ''}</textarea>
          </div>

          <div class="form-group">
            <label>Instituição</label>
            <input id="eproj-institution" type="text"
                   value="${proj.institution || ''}"
                   placeholder="Universidade / Unidade de saúde parceira">
          </div>

          <div class="form-group">
            <label>Tutor(a) / Preceptor(a)</label>
            <input id="eproj-supervisor" type="text"
                   value="${proj.supervisor || ''}"
                   placeholder="Nome(s) dos responsáveis">
          </div>

          <div class="form-group">
            <label>Período</label>
            <input id="eproj-period" type="text"
                   value="${proj.period || ''}"
                   placeholder="Ex: 2024 – 2025">
          </div>

          <div class="form-group">
            <label>Financiamento</label>
            <input id="eproj-funding" type="text"
                   value="${proj.funding || ''}"
                   placeholder="Ex: Ministério da Saúde / SGTES">
          </div>

          <div class="form-group">
            <label>E-mail de contato</label>
            <input id="eproj-email" type="email"
                   value="${proj.email || ''}"
                   placeholder="email@instituicao.edu.br">
          </div>

        </div>
        <div class="modal-footer">
          <div></div>
          <div style="display:flex;gap:10px">
            <button class="btn-cancel" onclick="Modal.closeAll()">Cancelar</button>
            <button class="btn-save"   onclick="App.saveProject()">💾 Salvar</button>
          </div>
        </div>
      </div>`;

    open("modal-edit-project");
  }

  /* ── Exports ── */
  return {
    open, close, closeAll,
    openEditActivity,
    openAddActivity,
    openEditParticipant,
    openEditKpi,
    openEditProject,
  };
})();
