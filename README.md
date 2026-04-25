# PET-Saúde Digital

**Tema:** Gestão e Governança dos Sistemas de Informação em Saúde para Integração e Qualidade de Dados

Portal com frontend estático (Vercel) + API REST com autenticação JWT (Render + PostgreSQL).

---

## 📁 Estrutura

```
pet-saude/
├── frontend/               ← Deploy no Vercel  (Root Directory = frontend/)
│   ├── index.html
│   ├── assets/             ← Coloque logo.png aqui
│   ├── css/                ← 8 arquivos de estilo
│   └── js/
│       ├── data.js         ← Constantes e dados padrão
│       ├── auth.js         ← Login, sessão, gestão de usuários
│       ├── api.js          ← Cliente HTTP (injeta JWT automaticamente)
│       ├── render.js       ← Dados → HTML
│       ├── lightbox.js     ← Galeria de fotos
│       ├── modal.js        ← Todos os modais de edição
│       └── app.js          ← Controlador principal
│
└── backend/                ← Deploy no Render
    ├── server.js
    ├── package.json
    ├── .env.example        ← Renomeie para .env e preencha
    ├── db/
    │   ├── connection.js   ← Pool PostgreSQL
    │   ├── schema.sql      ← Tabelas + índices + seed
    │   ├── init.js         ← npm run db:init
    │   └── createAdmin.js  ← npm run create-admin
    ├── middleware/
    │   ├── authenticate.js ← Verificação do JWT
    │   ├── upload.js       ← Multer (fotos/docs)
    │   └── errorHandler.js
    └── routes/
        ├── auth.js         ← Login, logout, gestão de usuários
        ├── activities.js   ← CRUD + fotos + documentos
        ├── participants.js
        ├── kpis.js
        └── project.js
```

---

## 🚀 Deploy

### 1. Backend → Render

```bash
# Variáveis de ambiente no Render:
DATABASE_URL=postgresql://...        # fornecida pelo Render PostgreSQL
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://seu-projeto.vercel.app
JWT_SECRET=uma_string_longa_e_aleatoria   # gere com: openssl rand -hex 64
JWT_EXPIRES_IN=8h
BCRYPT_ROUNDS=10
MAX_FILE_MB=10
```

```bash
# Após o primeiro deploy, abra o Shell do Render:
npm run db:init        # cria as tabelas e seed
npm run create-admin   # cria o primeiro administrador
```

### 2. Frontend → Vercel

1. Em `frontend/index.html`, troque a linha:
   ```js
   window.API_BASE = "https://SEU-BACKEND.onrender.com";
   ```
2. No Vercel, defina **Root Directory** como `frontend/`
3. Deploy!

---

## 🔒 Sistema de Autenticação

| Ação | Quem pode |
|---|---|
| **Ver** atividades, participantes, KPIs | Qualquer visitante (público) |
| **Editar** qualquer conteúdo | Usuários logados (editor ou admin) |
| **Gerenciar usuários** (criar/editar/excluir) | Somente admin |

### Endpoints de auth
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/login` | Autentica e retorna JWT |
| GET  | `/api/auth/me` | Dados do usuário logado |
| POST | `/api/auth/logout` | Logout (stateless) |
| PUT  | `/api/auth/password` | Troca a própria senha |
| GET  | `/api/auth/users` | Lista usuários (admin) |
| POST | `/api/auth/users` | Cria usuário (admin) |
| PUT  | `/api/auth/users/:id` | Edita usuário (admin) |
| DELETE | `/api/auth/users/:id` | Remove usuário (admin) |
| PUT  | `/api/auth/users/:id/password` | Reseta senha (admin) |

---

## ✏️ Criar o primeiro admin

Após `npm run db:init`:

```bash
# Interativo (terminal):
npm run create-admin

# Ou via variáveis de ambiente (CI/deploy):
ADMIN_NAME="Seu Nome" ADMIN_EMAIL="admin@email.com" ADMIN_PASSWORD="senha123" npm run create-admin
```

---

## 🎨 Personalização

- **Logo:** substitua `frontend/assets/logo.png`
- **Cores:** edite `frontend/css/base.css` (`:root`)
- **URL da API:** edite `window.API_BASE` em `frontend/index.html`
- **Categorias de atividade:** edite `TAGS` em `frontend/js/data.js`
