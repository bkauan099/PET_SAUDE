/**
 * js/api.js — Cliente HTTP
 * Injeta automaticamente o JWT do Auth em todas as requisições.
 */

const API_BASE = window.API_BASE || "http://localhost:3001";

async function http(method, path, body, isForm = false) {
  const headers = {};

  /* Injeta token se estiver logado */
  if (typeof Auth !== "undefined" && Auth.isLoggedIn()) {
    headers["Authorization"] = `Bearer ${Auth.getToken()}`;
  }

  if (!isForm) headers["Content-Type"] = "application/json";

  const opts = { method, headers };
  if (body) opts.body = isForm ? body : JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, opts);

  /* Token expirado → força logout */
  if (res.status === 401) {
    const data = await res.json().catch(() => ({}));
    if (data.expired && typeof Auth !== "undefined") {
      Auth.logout();
      document.dispatchEvent(new CustomEvent("app:toast", {
        detail: { msg: "Sessão expirada. Faça login novamente.", type: "error" }
      }));
    }
    throw new Error(data.error || "Não autorizado");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

const API = {
  health: () => http("GET", "/api/health"),

  project: {
    get:    ()     => http("GET", "/api/project"),
    update: (data) => http("PUT", "/api/project", data),
  },

  participants: {
    list:   ()         => http("GET", "/api/participants"),
    get:    (id)       => http("GET", `/api/participants/${id}`),
    update: (id, data) => http("PUT", `/api/participants/${id}`, data),
  },

  activities: {
    list:   ()         => http("GET",    "/api/activities"),
    get:    (id)       => http("GET",    `/api/activities/${id}`),
    create: (data)     => http("POST",   "/api/activities", data),
    update: (id, data) => http("PUT",    `/api/activities/${id}`, data),
    remove: (id)       => http("DELETE", `/api/activities/${id}`),

    addPhotos: (actId, files) => {
      const form = new FormData();
      [...files].forEach(f => form.append("photos", f));
      return http("POST", `/api/activities/${actId}/photos`, form, true);
    },
    updatePhotoCaption: (actId, photoId, caption) =>
      http("PATCH", `/api/activities/${actId}/photos/${photoId}`, { caption }),
    deletePhoto: (actId, photoId) =>
      http("DELETE", `/api/activities/${actId}/photos/${photoId}`),

    addDocument: (actId, file) => {
      const form = new FormData();
      form.append("document", file);
      return http("POST", `/api/activities/${actId}/documents`, form, true);
    },
    deleteDocument: (actId, docId) =>
      http("DELETE", `/api/activities/${actId}/documents/${docId}`),
  },

  kpis: {
    list:   ()         => http("GET", "/api/kpis"),
    update: (id, data) => http("PUT", `/api/kpis/${id}`, data),
  },
};
