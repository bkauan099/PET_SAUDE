/**
 * data.js — Dados base do projeto PET-Saúde Digital
 * Edite este arquivo para atualizar participantes, atividades e KPIs.
 * Os dados são carregados no app e podem ser sobrescritos pelo localStorage
 * quando o usuário edita pelo painel do site.
 */

const DEFAULT_PARTICIPANTS = [
  { id: "breno",       name: "Breno",        role: "Estudante", course: "Enfermagem",  avatar: "BR", color: "blue",   activities: [] },
  { id: "bruno",       name: "Bruno",        role: "Estudante", course: "BICT",        avatar: "BU", color: "orange", activities: [] },
  { id: "gabriel",     name: "Gabriel",      role: "Estudante", course: "Farmácia",    avatar: "GA", color: "blue",   activities: [] },
  { id: "joaogabriel", name: "João Gabriel", role: "Estudante", course: "BICT",        avatar: "JG", color: "orange", activities: [] },
  { id: "joaovitor",   name: "João Victor",  role: "Estudante", course: "Nutrição",    avatar: "JV", color: "blue",   activities: [] },
  { id: "karina",      name: "Karina",       role: "Estudante", course: "Psicologia",  avatar: "KA", color: "orange", activities: [] },
  { id: "matheus",     name: "Matheus",      role: "Estudante", course: "Biomedicina", avatar: "MA", color: "blue",   activities: [] },
  { id: "mylenne",     name: "Mylenne",      role: "Estudante", course: "Farmácia",    avatar: "MY", color: "orange", activities: [] },
  { id: "nelson",      name: "Nelson",       role: "Estudante", course: "BICT",        avatar: "NE", color: "blue",   activities: [] },
  { id: "paulo",       name: "Paulo",        role: "Estudante", course: "Medicina",    avatar: "PA", color: "orange", activities: [] },
  { id: "renan",       name: "Renan",        role: "Estudante", course: "Odontologia", avatar: "RE", color: "blue",   activities: [] },
];

const DEFAULT_ACTIVITIES = [
  {
    id: "ativ1",
    icon: "📊",
    iconColor: "blue",
    tag: "Diagnóstico",
    title: "Nome da Atividade 1",
    description: "Descrição da atividade. Clique em Editar para adicionar objetivo, metodologia e resultados.",
    status: "done",
    members: ["breno", "paulo"],
    photos: [],   // { dataUrl, caption }
    docs: []      // { name, type, url, dataUrl }
  },
  {
    id: "ativ2",
    icon: "🎓",
    iconColor: "orange",
    tag: "Capacitação",
    title: "Nome da Atividade 2",
    description: "Descrição da atividade. Clique em Editar para adicionar objetivo, metodologia e resultados.",
    status: "prog",
    members: ["bruno", "nelson", "joaogabriel"],
    photos: [],
    docs: []
  },
  {
    id: "ativ3",
    icon: "🏥",
    iconColor: "blue",
    tag: "Intervenção",
    title: "Nome da Atividade 3",
    description: "Descrição da atividade. Clique em Editar para adicionar objetivo, metodologia e resultados.",
    status: "done",
    members: ["karina", "mylenne", "gabriel"],
    photos: [],
    docs: []
  },
  {
    id: "ativ4",
    icon: "📱",
    iconColor: "orange",
    tag: "Tecnologia",
    title: "Nome da Atividade 4",
    description: "Descrição da atividade. Clique em Editar para adicionar objetivo, metodologia e resultados.",
    status: "plan",
    members: ["joaovitor", "renan"],
    photos: [],
    docs: []
  },
  {
    id: "ativ5",
    icon: "📝",
    iconColor: "blue",
    tag: "Pesquisa",
    title: "Nome da Atividade 5",
    description: "Descrição da atividade. Clique em Editar para adicionar objetivo, metodologia e resultados.",
    status: "done",
    members: ["matheus", "paulo"],
    photos: [],
    docs: []
  },
  {
    id: "ativ6",
    icon: "🌐",
    iconColor: "orange",
    tag: "Comunicação",
    title: "Nome da Atividade 6",
    description: "Descrição da atividade. Clique em Editar para adicionar objetivo, metodologia e resultados.",
    status: "prog",
    members: ["breno", "karina"],
    photos: [],
    docs: []
  },
];

const DEFAULT_KPI = [
  { id: "kpi_atividades",  icon: "🏥", label: "Atividades realizadas",          value: "0",  trend: "info", sub: "Atualize pelo painel" },
  { id: "kpi_membros",     icon: "👥", label: "Participantes",                   value: "11", trend: "up",   sub: "6 cursos · equipe multiprofissional" },
  { id: "kpi_producoes",   icon: "📄", label: "Produções geradas",               value: "0",  trend: "info", sub: "Artigos, relatórios, resumos" },
  { id: "kpi_horas",       icon: "🎓", label: "Horas de capacitação",            value: "0",  trend: "info", sub: "Atualize pelo painel" },
  { id: "kpi_sistemas",    icon: "🔗", label: "Sistemas de informação mapeados", value: "0",  trend: "info", sub: "RNDS, e-SUS, SISAB…" },
  { id: "kpi_completude",  icon: "📊", label: "Taxa de completude de dados",     value: "0%", trend: "info", sub: "Indicador de qualidade" },
];

const DEFAULT_PROJECT = {
  theme:       "Gestão e Governança dos Sistemas de Informação em Saúde para Integração e Qualidade de Dados",
  institution: "Nome da universidade e unidade de saúde parceira",
  supervisor:  "Nome do(a) tutor(a) e preceptor(a) responsáveis",
  period:      "Ano de início – vigência do edital",
  funding:     "Ministério da Saúde / SGTES — Edital PET-Saúde",
  email:       "email@instituicao.edu.br",
};

const TAGS = ["Diagnóstico","Capacitação","Intervenção","Tecnologia","Pesquisa","Comunicação","Gestão","Evento","Outro"];
const ICONS = ["📊","🎓","🏥","📱","📝","🌐","🔬","📋","🗂️","💊","🧬","🩺","🖥️","📡","⚕️"];
const STATUS_MAP = { done: "Concluído", prog: "Em andamento", plan: "Planejado" };
