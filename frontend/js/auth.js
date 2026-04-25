/**
 * js/auth.js — Módulo de autenticação do frontend
 *
 * - Guarda o JWT no sessionStorage (expira ao fechar o navegador)
 * - Injeta o token em todas as chamadas da API
 * - Controla a visibilidade dos botões de edição
 * - Gerencia o modal de login e o painel de usuários (admin)
 */

const Auth = (() => {

  const TOKEN_KEY = "pet_saude_token";
  const USER_KEY  = "pet_saude_user";

  /* ── Estado ── */
  let _token = sessionStorage.getItem(TOKEN_KEY) || null;
  let _user  = (() => { try { return JSON.parse(sessionStorage.getItem(USER_KEY)); } catch { return null; } })();

  /* ── Getters públicos ── */
  function isLoggedIn()  { return !!_token; }
  function getToken()    { return _token; }
  function getUser()     { return _user; }
  function isAdmin()     { return _user?.role === "admin"; }

  /* ── Persistência ── */
  function _save(token, user) {
    _token = token; _user = user;
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY,  JSON.stringify(user));
  }
  function _clear() {
    _token = null; _user = null;
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  }

  /* ── Login ── */
  async function login(email, password) {
    const res = await fetch(`${window.API_BASE}/api/auth/login`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao fazer login");
    _save(data.token, data.user);
    applyAuthUI();
    return data.user;
  }

  /* ── Logout ── */
  async function logout() {
    try {
      await fetch(`${window.API_BASE}/api/auth/logout`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${_token}` },
      });
    } catch (_) { /* ignora erros de rede no logout */ }
    _clear();
    applyAuthUI();
    document.dispatchEvent(new CustomEvent("auth:logout"));
  }

  /* ── Aplica o estado de auth na UI ── */
  function applyAuthUI() {
    const logged = isLoggedIn();

    /* Botão login/logout na navbar */
    const btn = document.getElementById("nav-auth-btn");
    if (btn) {
      btn.textContent = logged ? `Sair (${_user?.name?.split(" ")[0]})` : "🔒 Login";
      btn.onclick     = logged ? () => logout() : () => openLoginModal();
      btn.classList.toggle("nav-auth-logged", logged);
    }

    /* Mostra / oculta todos os elementos de edição */
    document.querySelectorAll(
      ".btn-edit-card, .btn-add-photo, .btn-edit-member, " +
      ".btn-edit-kpi, .btn-edit-project, .btn-new-activity, .btn-danger-sm"
    ).forEach(el => {
      el.style.display = logged ? "" : "none";
    });

    /* Painel de usuários — visível só para admin */
    const usersBtn = document.getElementById("btn-manage-users");
    if (usersBtn) usersBtn.style.display = (logged && isAdmin()) ? "" : "none";
  }

  /* ══════════════════════════════════════════
     MODAL DE LOGIN
  ══════════════════════════════════════════ */
  function openLoginModal() {
    document.getElementById("modal-login").classList.add("open");
    document.body.style.overflow = "hidden";
    setTimeout(() => document.getElementById("login-email")?.focus(), 100);
  }

  function closeLoginModal() {
    document.getElementById("modal-login").classList.remove("open");
    document.body.style.overflow = "";
    document.getElementById("login-error").textContent = "";
    document.getElementById("login-email").value    = "";
    document.getElementById("login-password").value = "";
  }

  async function submitLogin() {
    const email    = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const errEl    = document.getElementById("login-error");
    const btn      = document.getElementById("login-submit-btn");

    if (!email || !password) {
      errEl.textContent = "Preencha e-mail e senha.";
      return;
    }
    btn.disabled = true;
    btn.textContent = "Entrando…";
    errEl.textContent = "";

    try {
      const user = await login(email, password);
      closeLoginModal();
      /* Dispara evento para o app re-renderizar se necessário */
      document.dispatchEvent(new CustomEvent("auth:login", { detail: user }));
    } catch (err) {
      errEl.textContent = err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = "Entrar";
    }
  }

  /* ══════════════════════════════════════════
     MODAL DE GESTÃO DE USUÁRIOS (admin)
  ══════════════════════════════════════════ */
  async function openUsersModal() {
    if (!isAdmin()) return;
    const modal = document.getElementById("modal-users");
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
    await refreshUsersList();
  }

  function closeUsersModal() {
    document.getElementById("modal-users").classList.remove("open");
    document.body.style.overflow = "";
    document.getElementById("users-form-error").textContent = "";
    clearUserForm();
  }

  async function refreshUsersList() {
    const list = document.getElementById("users-list");
    list.innerHTML = `<div class="users-loading">Carregando…</div>`;
    try {
      const res = await fetch(`${window.API_BASE}/api/auth/users`, {
        headers: { Authorization: `Bearer ${_token}` },
      });
      const users = await res.json();
      if (!res.ok) throw new Error(users.error);
      list.innerHTML = users.map(u => `
        <div class="user-row ${!u.active ? "user-inactive" : ""}" data-id="${u.id}">
          <div class="user-info">
            <div class="user-name">${u.name} ${u.id === _user?.id ? '<span class="user-you">(você)</span>' : ""}</div>
            <div class="user-email">${u.email}</div>
          </div>
          <div class="user-meta">
            <span class="user-role-badge ${u.role}">${u.role}</span>
            <span class="user-status ${u.active ? "active":"inactive"}">${u.active ? "Ativo":"Inativo"}</span>
          </div>
          <div class="user-actions">
            ${u.id !== _user?.id ? `
              <button class="btn-user-edit" onclick="Auth.openEditUser('${u.id}')">✏️</button>
              <button class="btn-user-del"  onclick="Auth.deleteUser('${u.id}','${u.name}')">🗑</button>
            ` : ""}
          </div>
        </div>`).join("") || `<div class="users-loading">Nenhum usuário cadastrado.</div>`;
    } catch (err) {
      list.innerHTML = `<div class="users-loading" style="color:#ef4444">Erro: ${err.message}</div>`;
    }
  }

  function clearUserForm() {
    ["user-form-id","user-form-name","user-form-email","user-form-password"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    const roleEl = document.getElementById("user-form-role");
    if (roleEl) roleEl.value = "editor";
    const activeEl = document.getElementById("user-form-active");
    if (activeEl) activeEl.checked = true;
    document.getElementById("user-form-title").textContent = "Novo Usuário";
    document.getElementById("user-form-pass-hint").style.display = "";
    document.getElementById("users-form-error").textContent = "";
  }

  async function openEditUser(userId) {
    try {
      const res  = await fetch(`${window.API_BASE}/api/auth/users`, {
        headers: { Authorization: `Bearer ${_token}` },
      });
      const users = await res.json();
      const u = users.find(x => x.id === userId);
      if (!u) return;
      document.getElementById("user-form-id").value     = u.id;
      document.getElementById("user-form-name").value   = u.name;
      document.getElementById("user-form-email").value  = u.email;
      document.getElementById("user-form-password").value = "";
      document.getElementById("user-form-role").value   = u.role;
      document.getElementById("user-form-active").checked = u.active;
      document.getElementById("user-form-title").textContent = "Editar Usuário";
      document.getElementById("user-form-pass-hint").style.display = "block";
      document.getElementById("users-form-error").textContent = "";
    } catch (err) { console.error(err); }
  }

  async function saveUser() {
    const id       = document.getElementById("user-form-id").value;
    const name     = document.getElementById("user-form-name").value.trim();
    const email    = document.getElementById("user-form-email").value.trim();
    const password = document.getElementById("user-form-password").value;
    const role     = document.getElementById("user-form-role").value;
    const active   = document.getElementById("user-form-active").checked;
    const errEl    = document.getElementById("users-form-error");

    if (!name || !email) { errEl.textContent = "Nome e e-mail são obrigatórios."; return; }
    if (!id && !password) { errEl.textContent = "Senha é obrigatória para novo usuário."; return; }
    if (password && password.length < 6) { errEl.textContent = "A senha deve ter pelo menos 6 caracteres."; return; }

    const btn = document.getElementById("user-form-save-btn");
    btn.disabled = true;
    errEl.textContent = "";

    try {
      let res, data;
      if (id) {
        /* Editar — atualiza dados básicos */
        res  = await fetch(`${window.API_BASE}/api/auth/users/${id}`, {
          method:  "PUT",
          headers: { "Content-Type":"application/json", Authorization:`Bearer ${_token}` },
          body:    JSON.stringify({ name, role, active }),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error);
        /* Se mudou a senha */
        if (password) {
          const rp = await fetch(`${window.API_BASE}/api/auth/users/${id}/password`, {
            method:  "PUT",
            headers: { "Content-Type":"application/json", Authorization:`Bearer ${_token}` },
            body:    JSON.stringify({ newPassword: password }),
          });
          if (!rp.ok) throw new Error((await rp.json()).error);
        }
      } else {
        /* Criar */
        res  = await fetch(`${window.API_BASE}/api/auth/users`, {
          method:  "POST",
          headers: { "Content-Type":"application/json", Authorization:`Bearer ${_token}` },
          body:    JSON.stringify({ name, email, password, role }),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error);
      }
      clearUserForm();
      await refreshUsersList();
    } catch (err) {
      errEl.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  }

  async function deleteUser(userId, userName) {
    if (!confirm(`Excluir o usuário "${userName}" permanentemente?`)) return;
    try {
      const res = await fetch(`${window.API_BASE}/api/auth/users/${userId}`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await refreshUsersList();
    } catch (err) {
      alert("Erro ao excluir: " + err.message);
    }
  }

  /* ══════════════════════════════════════════
     MODAL DE TROCA DE SENHA
  ══════════════════════════════════════════ */
  function openChangePasswordModal() {
    document.getElementById("modal-change-password").classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeChangePasswordModal() {
    document.getElementById("modal-change-password").classList.remove("open");
    document.body.style.overflow = "";
    ["cp-current","cp-new","cp-confirm"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    document.getElementById("cp-error").textContent = "";
  }

  async function submitChangePassword() {
    const currentPassword = document.getElementById("cp-current").value;
    const newPassword     = document.getElementById("cp-new").value;
    const confirmPassword = document.getElementById("cp-confirm").value;
    const errEl           = document.getElementById("cp-error");

    if (!currentPassword || !newPassword || !confirmPassword) {
      errEl.textContent = "Preencha todos os campos."; return;
    }
    if (newPassword !== confirmPassword) {
      errEl.textContent = "A nova senha e a confirmação não coincidem."; return;
    }
    if (newPassword.length < 6) {
      errEl.textContent = "A nova senha deve ter pelo menos 6 caracteres."; return;
    }

    const btn = document.getElementById("cp-submit-btn");
    btn.disabled = true;
    errEl.textContent = "";

    try {
      const res = await fetch(`${window.API_BASE}/api/auth/password`, {
        method:  "PUT",
        headers: { "Content-Type":"application/json", Authorization:`Bearer ${_token}` },
        body:    JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      closeChangePasswordModal();
      /* Toast de sucesso via App se disponível */
      document.dispatchEvent(new CustomEvent("auth:passwordChanged"));
    } catch (err) {
      errEl.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  }

  /* ── Inicialização ── */
  function init() {
    /* Verifica se token expirou ao carregar */
    if (_token) {
      try {
        const payload = JSON.parse(atob(_token.split(".")[1]));
        if (payload.exp * 1000 < Date.now()) _clear();
      } catch (_) { _clear(); }
    }

    /* Enter no modal de login submete */
    document.getElementById("login-password")?.addEventListener("keydown", e => {
      if (e.key === "Enter") submitLogin();
    });
    document.getElementById("login-email")?.addEventListener("keydown", e => {
      if (e.key === "Enter") document.getElementById("login-password")?.focus();
    });

    /* Evento de senha trocada */
    document.addEventListener("auth:passwordChanged", () => {
      document.dispatchEvent(new CustomEvent("app:toast", { detail: { msg: "Senha alterada com sucesso ✅" } }));
    });

    applyAuthUI();
  }

  return {
    init, isLoggedIn, getToken, getUser, isAdmin,
    login, logout, applyAuthUI,
    openLoginModal, closeLoginModal, submitLogin,
    openUsersModal, closeUsersModal, refreshUsersList,
    openEditUser, saveUser, deleteUser, clearUserForm,
    openChangePasswordModal, closeChangePasswordModal, submitChangePassword,
  };
})();
