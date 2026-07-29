import { authGateway, dataGateway, isSupabaseConfigured } from "./supabase-client.js?v=12";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const STORAGE_KEY = "munnius-social-v3";
const LEGACY_STORAGE_KEY = "munnius-social-v2";
const countLabels = { profiles: "Novos follows", likes: "Curtidas", comments: "Comentários", directs: "Directs", responses: "Responderam", phones: "Telefones captados" };
const titles = { home: "Visão geral", session: "Sessão", leads: "Leads", followups: "Follow-ups", more: "Mais", clinics: "Clínicas", reports: "Relatórios" };
const statusNames = { new: "Lead mapeado", talking: "Conversando", follow_up: "Em follow-up", lost: "Perdido", sent_to_hunter: "Qualificado e encaminhado", finished: "Finalizado" };
const qualificationItems = [
  ["procedureDiscussed", "Falou sobre o procedimento"],
  ["valueUnderstood", "Entendeu o valor do atendimento"],
  ["fitConfirmed", "Respondeu se faz sentido para ele(a)"],
  ["knowsDoctor", "Já conhece a Dra."],
  ["interestedThisMonth", "Tem interesse em fazer ainda este mês"]
];
const googleEnabled = Boolean(window.MUNNIUS_SOCIAL_CONFIG?.googleEnabled);
const recoveryLinkDetected = new URLSearchParams(location.hash.slice(1)).get("type") === "recovery"
  || new URLSearchParams(location.search).get("type") === "recovery";

const seed = {
  version: 3,
  profile: { name: "Usuário", initials: "US", role: "social_seller" },
  clinics: [
    { id: "bella", name: "Clínica Bella", doctor: "Dra. Beatriz", instagram: "@clinicabella", hunter: "Ana", hunterPhone: "5541999990001", protocol: "Glow", location: "Curitiba, PR", evaluationPrice: 300, target: 8, color: "#75566f", active: true },
    { id: "aura", name: "Instituto Aura", doctor: "Dra. Camila", instagram: "@institutoaura", hunter: "Marina", hunterPhone: "5541999990002", protocol: "Aura Natural", location: "São Paulo, SP", evaluationPrice: 250, target: 6, color: "#df765f", active: true },
    { id: "leve", name: "Clínica Leve", doctor: "Dra. Renata", instagram: "@clinicaleve", hunter: "Clara", hunterPhone: "5541999990003", protocol: "Leve Face", location: "Belo Horizonte, MG", evaluationPrice: 280, target: 5, color: "#1f6b57", active: true }
  ],
  leads: [
    { id: "lead-1", name: "Mariana Costa", instagram: "@maricosta", whatsapp: "", clinicId: "bella", status: "talking", interest: "Harmonização facial", location: "Curitiba", temperature: "warm", prospectedAt: new Date().toISOString(), lastContactAt: new Date().toISOString(), sentToHunterAt: null, timeline: [{ at: new Date().toISOString(), label: "Primeiro contato realizado" }] },
    { id: "lead-2", name: "Júlia Martins", instagram: "@jumartins", whatsapp: "", clinicId: "aura", status: "follow_up", interest: "Botox", location: "São Paulo", temperature: "warm", prospectedAt: new Date(Date.now() - 86400000).toISOString(), lastContactAt: new Date(Date.now() - 86400000).toISOString(), sentToHunterAt: null, timeline: [{ at: new Date(Date.now() - 86400000).toISOString(), label: "Primeiro contato realizado" }] },
    { id: "lead-3", name: "Fernanda Lima", instagram: "@fernandalima", whatsapp: "41999990010", clinicId: "leve", status: "sent_to_hunter", interest: "Preenchimento labial", location: "Belo Horizonte", temperature: "hot", prospectedAt: new Date().toISOString(), lastContactAt: new Date().toISOString(), sentToHunterAt: new Date().toISOString(), timeline: [{ at: new Date().toISOString(), label: "Enviado para closer" }] }
  ],
  followups: [
    { id: "fu-1", leadId: "lead-2", scheduledFor: new Date(Date.now() - 3600000).toISOString(), step: "1º follow-up", status: "pending" },
    { id: "fu-2", leadId: "lead-1", scheduledFor: new Date(Date.now() + 5400000).toISOString(), step: "Pedir WhatsApp", status: "pending" }
  ],
  sessions: [],
  templates: [
    { id: "first", title: "1º contato", category: "first_contact", message: "Oi, {{nome}}! Vi seu perfil e achei que talvez você gostasse de conhecer o trabalho da {{clinica}}. Posso te contar mais?" },
    { id: "follow1", title: "1º follow-up", category: "first_follow_up", message: "Oi, {{nome}}! Passando só para saber se você conseguiu ver minha mensagem 😊" },
    { id: "follow2", title: "2º follow-up", category: "second_follow_up", message: "Oi, {{nome}}! Prometo não te incomodar mais depois dessa 😅 Se ainda tiver interesse, posso te passar as informações por aqui." },
    { id: "phone", title: "Pedir WhatsApp", category: "ask_phone", message: "Posso pedir para nossa equipe entrar em contato com você? Qual é o melhor WhatsApp?" }
  ]
};

function normalizeState(candidate) {
  const normalized = candidate;
  normalized.version = 3;
  normalized.clinics ||= [];
  normalized.leads ||= [];
  normalized.followups ||= [];
  normalized.sessions ||= [];
  normalized.templates ||= structuredClone(seed.templates);
  normalized.leads.forEach(lead => {
    if (lead.status === "no_response") lead.status = "lost";
    if (lead.status === "qualified") lead.status = lead.whatsapp ? "sent_to_hunter" : "talking";
    lead.qualification ||= {};
    lead.timeline ||= [];
  });
  return normalized;
}

function loadState() {
  const base = isSupabaseConfigured
    ? { ...structuredClone(seed), profile: { name: "Carregando", initials: "··", role: "social_seller" }, clinics: [], leads: [], followups: [], sessions: [] }
    : structuredClone(seed);
  if (isSupabaseConfigured) {
    return { ...base, session: null, timerId: null, lastAction: null, leadFilter: "all", followupFilter: "today", reportPeriod: "day" };
  }
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY));
    if (stored?.version >= 2) {
      const { profile: _ignoredProfile, ...operationalState } = stored;
      return normalizeState({ ...base, ...operationalState, profile: base.profile, session: null, timerId: null, lastAction: null, leadFilter: "all", followupFilter: "today", reportPeriod: "day" });
    }
  } catch (error) { console.warn("Não foi possível recuperar os dados locais.", error); }
  return { ...base, session: null, timerId: null, lastAction: null, leadFilter: "all", followupFilter: "today", reportPeriod: "day" };
}

let state = loadState();
let syncTimer;
let workspaceOpened = false;
let recoveryMode = recoveryLinkDetected;
let stopWorkspaceRealtime;
function operationalStorageKey(profileId = state.profile?.id) {
  return isSupabaseConfigured && profileId ? `${STORAGE_KEY}:${profileId}` : STORAGE_KEY;
}
function legacyOperationalStorageKey(profileId = state.profile?.id) {
  return isSupabaseConfigured && profileId ? `${LEGACY_STORAGE_KEY}:${profileId}` : LEGACY_STORAGE_KEY;
}
function loadLocalOperational(profile) {
  const base = { ...structuredClone(seed), profile, clinics: [], leads: [], followups: [], sessions: [] };
  try {
    const stored = JSON.parse(
      localStorage.getItem(operationalStorageKey(profile?.id))
      || localStorage.getItem(legacyOperationalStorageKey(profile?.id))
    );
    if (stored?.version >= 2) {
      const { profile: _ignoredProfile, ...operationalState } = stored;
      return normalizeState({ ...base, ...operationalState, profile, session: null, timerId: null, lastAction: null, leadFilter: "all", followupFilter: "today", reportPeriod: "day" });
    }
  } catch (error) { console.warn("Não foi possível recuperar o cache desta conta.", error); }
  return { ...base, session: null, timerId: null, lastAction: null, leadFilter: "all", followupFilter: "today", reportPeriod: "day" };
}
function mergeById(localItems = [], remoteItems = []) {
  const merged = new Map();
  localItems.forEach(item => item?.id && merged.set(item.id, item));
  remoteItems.forEach(item => item?.id && merged.set(item.id, item));
  return [...merged.values()];
}
function mergeOperationalState(localState, remoteState, profile) {
  const local = normalizeState(localState);
  const remote = normalizeState(remoteState);
  return normalizeState({
    ...local,
    ...remote,
    profile,
    clinics: mergeById(local.clinics, remote.clinics),
    leads: mergeById(local.leads, remote.leads),
    followups: mergeById(local.followups, remote.followups),
    sessions: mergeById(local.sessions, remote.sessions),
    templates: mergeById(local.templates, remote.templates),
    session: null,
    timerId: null,
    lastAction: null,
    leadFilter: "all",
    followupFilter: "today",
    reportPeriod: "day"
  });
}
function persist() {
  const { profile, timerId, session, lastAction, leadFilter, followupFilter, reportPeriod, ...serializable } = state;
  localStorage.setItem(operationalStorageKey(), JSON.stringify(serializable));
  if (isSupabaseConfigured) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => dataGateway.saveSnapshot(serializable).catch(error => {
      console.warn("Sincronização adiada.", error);
      showToast("Salvo neste aparelho; sincronização pendente");
    }), 500);
  }
}

async function hydrateRemoteState() {
  if (!isSupabaseConfigured) return;
  const workspace = await dataGateway.loadWorkspace();
  const remote = workspace?.snapshot;
  const local = loadLocalOperational(workspace.profile);
  if (!remote || Number(remote.version || 0) < 2) {
    state = local;
    persist();
    return;
  }
  const base = { ...structuredClone(seed), clinics: [], leads: [], followups: [], sessions: [] };
  const { profile: _ignoredProfile, ...operationalState } = remote;
  state = mergeOperationalState(local, { ...base, ...operationalState }, workspace.profile);
  const { profile, timerId, session, lastAction, leadFilter, followupFilter, reportPeriod, ...serializable } = state;
  localStorage.setItem(operationalStorageKey(profile.id), JSON.stringify(serializable));
  persist();
}

function applyRemoteSnapshot(remote) {
  if (!remote || Number(remote.version || 0) < 2 || state.session) return;
  const profile = state.profile;
  const base = { ...structuredClone(seed), clinics: [], leads: [], followups: [], sessions: [] };
  const { profile: _ignoredProfile, ...operationalState } = remote;
  state = mergeOperationalState(state, { ...base, ...operationalState }, profile);
  localStorage.setItem(operationalStorageKey(profile.id), JSON.stringify(state));
  renderDashboard();
  renderLeads();
  renderFollowups();
  renderReport();
  showToast("Dados atualizados por outro aparelho");
}

function expireUnansweredLeads() {
  const cutoff = Date.now() - 7 * 86400000;
  let changed = false;
  state.leads.forEach(lead => {
    const referenceDate = new Date(lead.lastContactAt || lead.prospectedAt || 0).getTime();
    if (lead.status === "new" && referenceDate && referenceDate < cutoff) {
      const now = new Date().toISOString();
      lead.status = "lost";
      lead.timeline ||= [];
      lead.timeline.push({ at: now, label: "Encerrado sem resposta após 7 dias" });
      changed = true;
    }
  });
  if (changed) persist();
}

function renderProfile() {
  const name = state.profile?.name || "Usuário";
  const firstName = name.split(/\s+/)[0];
  const initials = state.profile?.initials || firstName.slice(0, 2).toUpperCase();
  $("#greeting").textContent = `Olá, ${firstName}`;
  $("#profile-avatar-button").textContent = initials;
  $("#profile-avatar-large").textContent = initials;
  $("#profile-name").textContent = name;
  $("#profile-role").textContent = state.profile?.role === "admin" ? "Admin · Social seller" : "Social seller";
}

function showRecoveryForm() {
  recoveryMode = true;
  $("#login-form").classList.add("hidden");
  $("#recovery-form").classList.remove("hidden");
  requestAnimationFrame(() => $("#new-password").focus());
}

async function openWorkspace(message = "Bem-vindo") {
  if (workspaceOpened) return;
  workspaceOpened = true;
  let identity;
  try {
    identity = await dataGateway.loadIdentity();
    if (identity) state.profile = identity;
    await hydrateRemoteState();
  } catch (error) {
    console.warn("Não foi possível carregar a nuvem.", error);
    if (!identity && isSupabaseConfigured) {
      workspaceOpened = false;
      showToast("Sua sessão expirou. Entre novamente.");
      return;
    }
    state = loadLocalOperational(identity || state.profile);
    message = "Conta aberta · sincronização será retomada";
  }
  $("#auth-screen").classList.add("hidden");
  $("#app-shell").classList.remove("hidden");
  expireUnansweredLeads();
  renderProfile();
  renderDashboard();
  renderLeads();
  renderFollowups();
  renderReport();
  stopWorkspaceRealtime?.();
  try {
    stopWorkspaceRealtime = await dataGateway.subscribeToWorkspace?.(applyRemoteSnapshot);
  } catch (error) {
    console.warn("Atualização em tempo real será retomada depois.", error);
  }
  showToast(message);
}

function uid(prefix) { return crypto.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; }
function clinicById(id) { return state.clinics.find(clinic => clinic.id === id); }
function leadById(id) { return state.leads.find(lead => lead.id === id); }
function formatDate(value, withTime = false) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", withTime ? { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "short" }).format(new Date(value));
}
function isSameDay(a, b = new Date()) { const date = new Date(a); return date.toDateString() === new Date(b).toDateString(); }
function periodStart(period) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (period === "week") start.setDate(start.getDate() - 6);
  if (period === "month") start.setDate(start.getDate() - 29);
  return start;
}
function inPeriod(value, period) { return new Date(value) >= periodStart(period); }

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.add("hidden"), 2300);
}

function navigate(view) {
  $$(".view").forEach(panel => panel.classList.toggle("active", panel.dataset.viewPanel === view));
  $$(".bottom-nav button").forEach(button => button.classList.toggle("active", button.dataset.view === view));
  $("#page-title").textContent = titles[view];
  if (view === "home") renderDashboard();
  if (view === "clinics") renderClinics();
  if (view === "leads") renderLeads();
  if (view === "followups") renderFollowups();
  if (view === "reports") renderReport();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function periodStats(period = state.period || "day") {
  const leads = state.leads.filter(lead => inPeriod(lead.prospectedAt, period));
  const sessions = state.sessions.filter(session => inPeriod(session.startedAt, period));
  const counts = sessions.reduce((total, session) => {
    Object.keys(countLabels).forEach(key => total[key] += Number(session.counts?.[key] || 0));
    total.seconds += Number(session.durationSeconds || 0);
    return total;
  }, { profiles: 0, likes: 0, comments: 0, directs: 0, responses: 0, phones: 0, seconds: 0 });
  return { leads: leads.length, hunters: leads.filter(lead => lead.sentToHunterAt && inPeriod(lead.sentToHunterAt, period)).length, sessions, ...counts };
}

function renderDashboard() {
  const stats = periodStats(state.period);
  const activeClinics = state.clinics.filter(clinic => clinic.active);
  const pending = state.followups.filter(item => item.status === "pending").length;
  const actions = Object.keys(countLabels).reduce((total, key) => total + Number(stats[key] || 0), 0);
  const talking = state.leads.filter(lead => lead.status === "talking").length;
  const followingUp = state.leads.filter(lead => lead.status === "follow_up").length;
  const lost = state.leads.filter(lead => lead.status === "lost").length;
  const qualified = state.leads.filter(lead => lead.status === "sent_to_hunter").length;
  $("#actions-total").textContent = actions;
  $("#leads-total").textContent = stats.leads;
  $("#clinics-total").textContent = activeClinics.length;
  $("#hunters-total").textContent = stats.hunters;
  $("#followups-total").textContent = pending;
  $("#pipeline-mapped").textContent = stats.directs;
  $("#pipeline-talking").textContent = talking;
  $("#pipeline-followups").textContent = followingUp;
  $("#pipeline-lost").textContent = lost;
  $("#pipeline-qualified").textContent = qualified;
  $("#hero-summary").textContent = actions
    ? `${stats.directs} directs · ${stats.responses} respostas · ${stats.phones} telefones`
    : activeClinics.length ? "Escolha uma clínica abaixo e comece a sessão." : "Cadastre sua primeira clínica para começar.";
  const badge = $(".bottom-nav [data-view='followups'] i");
  badge.textContent = pending;
  badge.classList.toggle("hidden", pending === 0);
  renderClinics();
}

function clinicLeadCount(clinicId, period = "day") { return state.leads.filter(lead => lead.clinicId === clinicId && inPeriod(lead.prospectedAt, period)).length; }
function clinicMarkup(clinic, detailed = false) {
  const leads = clinicLeadCount(clinic.id);
  const pct = Math.min(100, clinic.target ? leads / clinic.target * 100 : 0);
  const active = state.session?.clinicId === clinic.id;
  return `<article class="clinic-card ${detailed ? "clickable" : ""} ${active ? "has-active-session" : ""}" ${detailed ? `data-clinic-detail="${clinic.id}"` : ""}>
    <div class="clinic-avatar" style="background:${clinic.color}">${clinic.name.split(" ").slice(-1)[0][0]}</div>
    <div class="clinic-main"><strong>${clinic.name}</strong><span>${clinic.instagram} · Closer ${clinic.hunter}</span><div class="progress"><i style="width:${pct}%"></i></div></div>
    <div class="clinic-card-side"><div class="clinic-score"><strong>${leads}/${clinic.target}</strong><span>leads hoje</span></div>
      ${detailed ? `<span class="material-symbols-outlined clinic-chevron">chevron_right</span>` : `<button class="clinic-start ${active ? "active" : ""}" data-start-session="${clinic.id}"><span class="material-symbols-outlined">${active ? "timer" : "play_arrow"}</span>${active ? "Continuar" : "Iniciar"}</button>`}
    </div>
  </article>`;
}
function renderClinics() {
  const active = state.clinics.filter(clinic => clinic.active);
  $("#clinic-list").innerHTML = active.map(clinic => clinicMarkup(clinic)).join("") || emptyState("Nenhuma clínica ativa.");
  $("#clinics-page-list").innerHTML = active.map(clinic => clinicMarkup(clinic, true)).join("") || emptyState("Cadastre sua primeira clínica.");
  $$("[data-start-session]").forEach(button => button.addEventListener("click", event => {
    event.stopPropagation();
    const clinicId = button.dataset.startSession;
    if (state.session?.clinicId === clinicId) return navigate("session");
    if (state.session) return showToast("Encerre a sessão atual antes de iniciar outra.");
    startSession(clinicId);
  }));
  $$("[data-clinic-detail]").forEach(card => card.addEventListener("click", () => openClinicForm(card.dataset.clinicDetail)));
}

function renderLeads() {
  const query = $("#lead-search").value.trim().toLowerCase();
  const filtered = state.leads
    .filter(lead => state.leadFilter === "all" || lead.status === state.leadFilter)
    .filter(lead => `${lead.name} ${lead.instagram}`.toLowerCase().includes(query))
    .sort((a, b) => new Date(b.prospectedAt) - new Date(a.prospectedAt));
  $("#lead-list").innerHTML = filtered.map(lead => {
    const clinic = clinicById(lead.clinicId);
    return `<article class="lead-card clickable" data-lead="${lead.id}">
      <div class="lead-top"><div class="lead-avatar">${initials(lead.name || lead.instagram)}</div>
      <div class="lead-info"><strong>${escapeHtml(lead.name || lead.instagram)}</strong><span>${escapeHtml(lead.instagram)}${lead.interest ? ` · ${escapeHtml(lead.interest)}` : ""}</span></div><span class="status ${lead.status}">${statusNames[lead.status] || "Novo"}</span></div>
      <div class="lead-meta"><span>${clinic?.name || "Clínica removida"}</span><span class="lead-temperature ${lead.temperature || "cold"}">${{ hot: "Quente", warm: "Morno", cold: "Frio" }[lead.temperature] || "Não avaliado"}</span><span>${formatDate(lead.prospectedAt, true)}</span></div>
    </article>`;
  }).join("") || emptyState("Nenhum lead encontrado.");
  $$("[data-lead]").forEach(card => card.addEventListener("click", () => openLeadDetail(card.dataset.lead)));
}

function renderFollowups() {
  const now = new Date();
  const endToday = new Date(); endToday.setHours(23, 59, 59, 999);
  const items = state.followups
    .filter(item => item.status === "pending")
    .filter(item => {
      const scheduled = new Date(item.scheduledFor);
      if (state.followupFilter === "overdue") return scheduled < now;
      if (state.followupFilter === "next") return scheduled > endToday;
      return scheduled >= now && scheduled <= endToday;
    })
    .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));
  $("#followup-priority-title").textContent = state.followupFilter === "overdue" ? "Follow-ups atrasados" : state.followupFilter === "next" ? "Próximas ações" : "Prioridades de hoje";
  $("#followup-list").innerHTML = items.map(item => {
    const lead = leadById(item.leadId);
    if (!lead) return "";
    const overdue = new Date(item.scheduledFor) < now;
    return `<article class="followup-card"><div class="lead-avatar">${initials(lead.name || lead.instagram)}</div>
      <div class="lead-info"><strong>${escapeHtml(lead.name || lead.instagram)}</strong><span>${escapeHtml(lead.instagram)} · ${overdue ? "Atrasado · " : ""}${formatDate(item.scheduledFor, true)}</span></div>
      <button data-followup="${item.id}">${escapeHtml(item.step)}</button></article>`;
  }).join("") || emptyState(state.followupFilter === "today" ? "Tudo em dia por aqui." : "Nenhum follow-up neste grupo.");
  $$("[data-followup]").forEach(button => button.addEventListener("click", () => openFollowup(button.dataset.followup)));
}

function renderReport() {
  const stats = periodStats(state.reportPeriod);
  const actions = Object.keys(countLabels).reduce((total, key) => total + Number(stats[key] || 0), 0);
  const labels = { day: "Hoje", week: "Últimos 7 dias", month: "Últimos 30 dias" };
  $("#report-label").textContent = labels[state.reportPeriod];
  $("#report-date").textContent = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date());
  $("#report-leads").textContent = stats.leads;
  $("#report-hunters").textContent = stats.hunters;
  $("#report-directs").textContent = stats.directs;
  $("#report-hours").textContent = `${(stats.seconds / 3600).toFixed(1).replace(".", ",")}h`;
  $("#report-actions-total").textContent = `${actions} ${actions === 1 ? "ação" : "ações"}`;
  $("#report-profiles").textContent = stats.profiles;
  $("#report-likes").textContent = stats.likes;
  $("#report-comments").textContent = stats.comments;
  $("#report-directs-detail").textContent = stats.directs;
  $("#report-responses").textContent = stats.responses;
  $("#report-phones").textContent = stats.phones;
  $("#report-efficiency").textContent = stats.directs && stats.phones
    ? `1 telefone a cada ${(stats.directs / stats.phones).toFixed(1).replace(".", ",")} directs`
    : stats.responses && stats.directs ? `${Math.round(stats.responses / stats.directs * 100)}% de respostas` : "Comece uma sessão";
  const days = state.reportPeriod === "day" ? 1 : state.reportPeriod === "week" ? 7 : 10;
  const values = Array.from({ length: days }, (_, index) => {
    const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (days - 1 - index));
    return state.leads.filter(lead => isSameDay(lead.prospectedAt, date)).length;
  });
  const max = Math.max(1, ...values);
  $("#report-chart").innerHTML = values.map((value, index) => `<div><span style="height:${Math.max(8, value / max * 88)}%"></span><small>${state.reportPeriod === "day" ? "Hoje" : index === values.length - 1 ? "Hoje" : new Intl.DateTimeFormat("pt-BR", { weekday: "narrow" }).format(new Date(Date.now() - (values.length - 1 - index) * 86400000))}</small></div>`).join("");
  const clinicRows = state.clinics.filter(clinic => clinic.active).map(clinic => {
    const clinicSessions = stats.sessions.filter(session => session.clinicId === clinic.id);
    const clinicActions = clinicSessions.reduce((total, session) => total + Object.keys(countLabels).reduce((sum, key) => sum + Number(session.counts?.[key] || 0), 0), 0);
    const clinicLeads = state.leads.filter(lead => lead.clinicId === clinic.id && inPeriod(lead.prospectedAt, state.reportPeriod)).length;
    return { clinic, clinicActions, clinicLeads };
  }).filter(row => row.clinicActions || row.clinicLeads).sort((a, b) => (b.clinicLeads - a.clinicLeads) || (b.clinicActions - a.clinicActions));
  $("#report-clinic-breakdown").innerHTML = clinicRows.slice(0, 8).map(({ clinic, clinicActions, clinicLeads }) => `
    <div><span class="clinic-mini-avatar" style="background:${clinic.color}">${initials(clinic.name).slice(0,1)}</span>
      <p><strong>${escapeHtml(clinic.name)}</strong><small>${clinicActions} ações</small></p>
      <b>${clinicLeads} ${clinicLeads === 1 ? "lead" : "leads"}</b>
    </div>`).join("") || `<p class="report-empty">As clínicas aparecem aqui quando houver atividade no período.</p>`;
}

function emptyState(message) { return `<div class="empty-inline"><span class="material-symbols-outlined">inbox</span><p>${message}</p></div>`; }
function initials(value = "") { return value.replace("@", "").split(/[ ._-]+/).filter(Boolean).map(part => part[0]).slice(0, 2).join("").toUpperCase(); }
function escapeHtml(value = "") { const div = document.createElement("div"); div.textContent = value; return div.innerHTML; }
function phoneDigits(value = "") { return value.replace(/\D/g, ""); }
function instagramHandle(value = "") {
  const trimmed = value.trim();
  const match = trimmed.match(/instagram\.com\/([^/?#]+)/i);
  return `@${(match?.[1] || trimmed).replace(/^@/, "").replace(/\/$/, "")}`;
}

function openSheet(content, onOpen) {
  $("#sheet-content").innerHTML = content;
  $("#sheet-backdrop").classList.remove("hidden");
  onOpen?.();
}
function closeSheet() { $("#sheet-backdrop").classList.add("hidden"); }

function clinicPicker() {
  const clinics = state.clinics.filter(clinic => clinic.active);
  openSheet(`<h2 class="sheet-title">Escolha a clínica</h2><p class="sheet-subtitle">Todos os registros desta sessão ficarão associados a ela.</p>
    <div class="clinic-options">${clinics.map(clinic => `<button class="clinic-option" data-clinic-pick="${clinic.id}"><span><strong>${clinic.name}</strong><small>${clinic.instagram}</small></span><b class="material-symbols-outlined">chevron_right</b></button>`).join("")}</div>`, () => {
    $$("[data-clinic-pick]").forEach(button => button.addEventListener("click", () => startSession(button.dataset.clinicPick)));
  });
}

function startSession(clinicId) {
  const clinic = clinicById(clinicId);
  if (!clinic) return showToast("Clínica não encontrada.");
  state.session = { id: uid("session"), clinicId, startedAt: new Date().toISOString(), counts: Object.fromEntries(Object.keys(countLabels).map(key => [key, 0])) };
  $("#session-clinic").textContent = clinic.name;
  $("#session-empty").classList.add("hidden");
  $("#session-active").classList.remove("hidden");
  $$("[data-action] strong").forEach(node => node.textContent = "0");
  closeSheet();
  clearInterval(state.timerId);
  state.timerId = setInterval(updateTimer, 1000);
  updateTimer(); renderClinics(); navigate("session");
  showToast(`Sessão iniciada · ${clinic.name}`);
}
function updateTimer() {
  if (!state.session) return;
  const elapsed = Math.floor((Date.now() - new Date(state.session.startedAt)) / 1000);
  $("#timer").textContent = [Math.floor(elapsed / 3600), Math.floor(elapsed % 3600 / 60), elapsed % 60].map(value => String(value).padStart(2, "0")).join(":");
}
function updateAction(action, delta = 1) {
  if (!state.session) return;
  const previous = state.session.counts[action];
  state.session.counts[action] = Math.max(0, previous + delta);
  const countNode = $(`[data-action="${action}"] strong`);
  countNode.textContent = state.session.counts[action];
  countNode.classList.remove("count-pop");
  requestAnimationFrame(() => countNode.classList.add("count-pop"));
  if (delta > 0) state.lastAction = action;
}
function handleSessionAction(action) {
  if (!state.session) return;
  if (action === "responses") {
    openLeadForm({ mode: "response", onSaved: () => updateAction("responses") });
    return;
  }
  if (action === "phones") {
    openLeadForm({ mode: "phone", onSaved: () => updateAction("phones") });
    return;
  }
  updateAction(action);
}
async function finishSession() {
  if (!state.session) return;
  const endedAt = new Date();
  const completed = { ...state.session, endedAt: endedAt.toISOString(), durationSeconds: Math.max(1, Math.floor((endedAt - new Date(state.session.startedAt)) / 1000)) };
  state.sessions.push(completed);
  await dataGateway.saveSession?.(completed);
  persist(); clearInterval(state.timerId); state.session = null; state.lastAction = null;
  $("#session-empty").classList.remove("hidden"); $("#session-active").classList.add("hidden");
  $$("[data-action] strong").forEach(node => node.textContent = "0");
  renderDashboard(); renderReport(); showToast("Sessão salva no histórico");
}

function openAdjustCounts() {
  if (!state.session) return;
  openSheet(`<h2 class="sheet-title">Ajustar contagens</h2><p class="sheet-subtitle">Use somente para corrigir um toque por engano.</p>
    <div class="adjust-list">${Object.entries(countLabels).map(([key, label]) => `<div><span>${label}</span><button data-adjust="${key}" data-delta="-1">−</button><strong id="adjust-${key}">${state.session.counts[key]}</strong><button data-adjust="${key}" data-delta="1">+</button></div>`).join("")}</div>`, () => {
      $$("[data-adjust]").forEach(button => button.addEventListener("click", () => {
        const key = button.dataset.adjust; const delta = Number(button.dataset.delta);
        updateAction(key, delta); $(`#adjust-${key}`).textContent = state.session.counts[key];
      }));
  });
}

function openClinicForm(clinicId = null) {
  const clinic = clinicId ? clinicById(clinicId) : {};
  const edit = Boolean(clinicId);
  openSheet(`<h2 class="sheet-title">${edit ? "Editar clínica" : "Nova clínica"}</h2><p class="sheet-subtitle">A closer fica vinculada para agilizar cada entrega.</p>
    <form class="sheet-form" id="clinic-form">
      ${field("clinic-name", "Nome da clínica", clinic.name, true)}
      ${field("clinic-doctor", "Dra. responsável", clinic.doctor, true)}
      ${field("clinic-instagram", "Instagram", clinic.instagram, true, "text", "@clinica")}
      <div class="form-grid">${field("clinic-hunter", "Closer responsável", clinic.hunter, true)}${field("clinic-hunter-phone", "WhatsApp da closer", clinic.hunterPhone, true, "tel", "(00) 00000-0000")}</div>
      ${field("clinic-protocol", "Protocolo da clínica", clinic.protocol)}
      ${field("clinic-location", "Localização", clinic.location)}
      <div class="form-grid">${field("clinic-price", "Valor da avaliação", clinic.evaluationPrice, false, "number", "300")}${field("clinic-target", "Meta diária de leads", clinic.target || 5, true, "number", "5")}</div>
      <button class="primary-button" type="submit">${edit ? "Salvar alterações" : "Salvar clínica"}</button>
      ${edit ? `<button class="danger-link" type="button" id="archive-clinic">Arquivar clínica</button>` : ""}
    </form>`, () => {
    $("#clinic-form").addEventListener("submit", event => {
      event.preventDefault();
      const record = {
        id: clinicId || uid("clinic"), name: $("#clinic-name").value.trim(), doctor: $("#clinic-doctor").value.trim(),
        instagram: instagramHandle($("#clinic-instagram").value), hunter: $("#clinic-hunter").value.trim(),
        hunterPhone: phoneDigits($("#clinic-hunter-phone").value), protocol: $("#clinic-protocol").value.trim(),
        location: $("#clinic-location").value.trim(), evaluationPrice: Number($("#clinic-price").value || 0),
        target: Number($("#clinic-target").value || 0), color: clinic.color || ["#75566f", "#df765f", "#1f6b57", "#dda94c"][state.clinics.length % 4], active: true
      };
      if (edit) Object.assign(clinic, record); else state.clinics.push(record);
      persist(); renderClinics(); closeSheet(); showToast(edit ? "Clínica atualizada" : "Clínica cadastrada");
    });
    $("#archive-clinic")?.addEventListener("click", () => { clinic.active = false; persist(); renderClinics(); closeSheet(); showToast("Clínica arquivada"); });
  });
}

function field(id, label, value = "", required = false, type = "text", placeholder = "") {
  return `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${escapeHtml(String(value ?? ""))}" placeholder="${placeholder}" ${required ? "required" : ""}></div>`;
}

function qualificationChecklist(lead = {}) {
  return `<div class="qualification-checklist">${qualificationItems.map(([key, label]) => `
    <label class="qualification-check"><input id="qualification-${key}" type="checkbox" ${lead.qualification?.[key] ? "checked" : ""}><span>${label}</span></label>`).join("")}</div>`;
}

function readQualification() {
  return Object.fromEntries(qualificationItems.map(([key]) => [key, Boolean($(`#qualification-${key}`)?.checked)]));
}

function openLeadForm({ leadId = null, mode = "mapped", onSaved = null } = {}) {
  const originalLead = leadId ? leadById(leadId) : null;
  const lead = originalLead || {};
  const edit = Boolean(originalLead);
  const isPhone = mode === "phone";
  const isResponse = mode === "response";
  const fixedStatus = isPhone ? "sent_to_hunter" : isResponse ? "talking" : null;
  const title = edit ? "Editar lead" : isPhone ? "Telefone captado" : isResponse ? "Lead respondeu" : "Lead mapeado";
  const submitLabel = isPhone ? "🎉 Salvar e enviar para closer" : edit ? "Salvar alterações" : isResponse ? "Salvar em Conversando" : "Salvar lead";
  openSheet(`<h2 class="sheet-title">${title}</h2><p class="sheet-subtitle">${isPhone ? "Complete o contexto e entregue a oportunidade para a closer." : "Cole o @ ou o link do Instagram para não perder a conversa."}</p>
    <form class="sheet-form" id="lead-form">
      ${field("lead-instagram", "Instagram", lead.instagram, true, "text", "@usuario ou link")}
      ${field("lead-name", "Nome", lead.name, false, "text", "Nome do lead")}
      ${isPhone || edit ? field("lead-phone", "WhatsApp", lead.whatsapp, isPhone, "tel", "(00) 00000-0000") : ""}
      <div class="field"><label for="lead-clinic">Clínica</label><select id="lead-clinic">${state.clinics.filter(c => c.active).map(c => `<option value="${c.id}" ${(lead.clinicId || state.session?.clinicId) === c.id ? "selected" : ""}>${c.name}</option>`).join("")}</select></div>
      <div class="qualification-block">
        <div class="qualification-heading"><span class="material-symbols-outlined">verified</span><div><strong>Contexto da conversa</strong><small>Evita que a closer repita o que já foi falado.</small></div></div>
        ${field("lead-interest", "Procedimento de interesse", lead.interest, false, "text", "Ex.: Botox, avaliação facial")}
        <div class="field"><label for="lead-temperature">Temperatura</label><select id="lead-temperature">
          <option value="cold" ${lead.temperature === "cold" ? "selected" : ""}>Frio</option>
          <option value="warm" ${(!lead.temperature || lead.temperature === "warm") ? "selected" : ""}>Morno</option>
          <option value="hot" ${lead.temperature === "hot" ? "selected" : ""}>Quente</option>
        </select></div>
        ${qualificationChecklist(lead)}
      </div>
      ${fixedStatus ? "" : `<div class="field"><label for="lead-status">Etapa do lead</label><select id="lead-status">${Object.entries(statusNames).map(([key, label]) => `<option value="${key}" ${(lead.status || "new") === key ? "selected" : ""}>${label}</option>`).join("")}</select></div>`}
      ${isPhone ? "" : `<div class="field"><label for="lead-followup">Próximo follow-up <span class="optional">(opcional)</span></label><input id="lead-followup" type="datetime-local"></div>`}
      <button class="primary-button ${isPhone ? "victory-button" : ""}" type="submit">${submitLabel}</button>
    </form>`, () => {
    $("#lead-instagram").addEventListener("blur", event => { event.target.value = instagramHandle(event.target.value); });
    $("#lead-form").addEventListener("submit", event => {
      event.preventDefault();
      const clinicId = $("#lead-clinic").value;
      const instagram = instagramHandle($("#lead-instagram").value);
      const existing = !edit ? state.leads.find(item => item.clinicId === clinicId && instagramHandle(item.instagram) === instagram) : null;
      const record = originalLead || existing || {
        id: uid("lead"), prospectedAt: new Date().toISOString(), timeline: [], sentToHunterAt: null
      };
      const now = new Date().toISOString();
      const status = fixedStatus || $("#lead-status").value;
      const shouldSend = isPhone || (status === "sent_to_hunter" && !record.sentToHunterAt);
      record.timeline ||= [];
      Object.assign(record, {
        name: $("#lead-name").value.trim(), instagram,
        whatsapp: $("#lead-phone") ? phoneDigits($("#lead-phone").value) : record.whatsapp || "",
        clinicId, status, lastContactAt: now,
        interest: $("#lead-interest").value.trim(),
        temperature: $("#lead-temperature").value,
        qualification: readQualification()
      });
      if (!originalLead && !existing) state.leads.unshift(record);
      if (isResponse) record.timeline.push({ at: now, label: existing ? "Nova resposta registrada" : "Lead respondeu ao direct" });
      else if (isPhone) record.timeline.push({ at: now, label: "WhatsApp captado e qualificação concluída" });
      else record.timeline.push({ at: now, label: edit ? `Etapa alterada para ${statusNames[status]}` : "Lead mapeado" });
      const followupAt = $("#lead-followup")?.value;
      if (followupAt) {
        state.followups.push({ id: uid("fu"), leadId: record.id, scheduledFor: new Date(followupAt).toISOString(), step: "Follow-up", status: "pending" });
        record.status = "follow_up";
        record.timeline.push({ at: now, label: `Follow-up agendado para ${formatDate(followupAt, true)}` });
      }
      if (shouldSend) {
        record.status = "sent_to_hunter";
        record.sentToHunterAt ||= now;
        record.timeline.push({ at: now, label: `Encaminhado para ${clinicById(clinicId)?.hunter || "closer"}` });
      }
      persist();
      renderDashboard();
      renderLeads();
      renderFollowups();
      closeSheet();
      onSaved?.(record);
      if (shouldSend) openHunterWhatsApp(record);
      else showToast(edit || existing ? "Lead atualizado" : "Lead salvo");
    });
  });
}

function openLeadDetail(leadId) {
  const lead = leadById(leadId); const clinic = clinicById(lead.clinicId);
  const alignedItems = qualificationItems.filter(([key]) => lead.qualification?.[key]);
  openSheet(`<div class="lead-detail-head"><div class="lead-avatar">${initials(lead.name || lead.instagram)}</div><div><h2 class="sheet-title">${escapeHtml(lead.name || lead.instagram)}</h2><p class="sheet-subtitle">${escapeHtml(lead.instagram)} · ${clinic?.name || ""}</p></div></div>
    <div class="qualification-summary">
      <div><span>Interesse</span><strong>${escapeHtml(lead.interest || "Ainda não informado")}</strong></div>
      <div><span>Temperatura</span><strong class="lead-temperature ${lead.temperature || "cold"}">${{ hot: "Quente", warm: "Morno", cold: "Frio" }[lead.temperature] || "Não avaliado"}</strong></div>
      <div><span>WhatsApp</span><strong>${lead.whatsapp ? escapeHtml(lead.whatsapp) : "Ainda não captado"}</strong></div>
    </div>
    <h3 class="timeline-title">O que já foi alinhado</h3>
    <div class="qualification-result">${alignedItems.length ? alignedItems.map(([, label]) => `<div><span>✓</span><p>${escapeHtml(label)}</p></div>`).join("") : `<div><span>—</span><p>Nenhum ponto confirmado ainda.</p></div>`}</div>
    <div class="detail-actions"><button class="secondary-button" id="edit-lead">Editar</button><button class="primary-button" id="contact-lead">Abrir Instagram</button></div>
    <h3 class="timeline-title">Histórico resumido</h3><div class="timeline">${[...(lead.timeline || [])].reverse().map(item => `<div><i></i><span><strong>${escapeHtml(item.label)}</strong><small>${formatDate(item.at, true)}</small></span></div>`).join("")}</div>
    ${lead.whatsapp && !lead.sentToHunterAt ? `<button class="primary-button" id="send-hunter"><span class="material-symbols-outlined">forward_to_inbox</span>Enviar para closer</button>` : ""}`, () => {
    $("#edit-lead").addEventListener("click", () => openLeadForm({ leadId }));
    $("#contact-lead").addEventListener("click", () => window.open(`https://instagram.com/${lead.instagram.replace("@", "")}`, "_blank", "noopener"));
    $("#send-hunter")?.addEventListener("click", () => { lead.status = "sent_to_hunter"; lead.sentToHunterAt = new Date().toISOString(); lead.timeline.push({ at: lead.sentToHunterAt, label: `Enviado para ${clinic.hunter}` }); persist(); renderLeads(); renderDashboard(); openHunterWhatsApp(lead); });
  });
}

function openHunterWhatsApp(lead) {
  const clinic = clinicById(lead.clinicId);
  if (!clinic) return showToast("Clínica não encontrada para esta entrega.");
  const temperature = { hot: "🔥 Quente", warm: "🌤️ Morno", cold: "❄️ Frio" }[lead.temperature] || "Não avaliada";
  const aligned = qualificationItems
    .map(([key, label]) => `${lead.qualification?.[key] ? "✅" : "▫️"} ${label}`)
    .join("\n");
  const message = `🎉 *NOVO LEAD QUALIFICADO!*\n\nBoa, ${clinic.hunter}! Temos uma nova oportunidade da *${clinic.name}* pronta para você continuar. 🚀\n\n👤 *Lead*\n• Nome: ${lead.name || "Não informado"}\n• Instagram: ${lead.instagram}\n• WhatsApp: ${lead.whatsapp || "Não informado"}\n• Interesse: ${lead.interest || "Não informado"}\n• Temperatura: ${temperature}\n\n💬 *O que já foi conversado*\n${aligned}\n\n✨ O contato já recebeu a primeira qualificação. Pode seguir daqui sem repetir a abordagem inicial.\n\n📅 Captado em ${formatDate(lead.prospectedAt, true)}`;
  showToast("🎉 Lead qualificado e mensagem preparada!");
  window.open(`https://wa.me/${clinic.hunterPhone}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
}

function openFollowup(followupId) {
  const followup = state.followups.find(item => item.id === followupId);
  const lead = leadById(followup.leadId);
  const clinic = clinicById(lead.clinicId);
  const suggested = state.templates.find(template => followup.step.toLowerCase().includes("whatsapp") ? template.category === "ask_phone" : followup.step.includes("2º") ? template.category === "second_follow_up" : template.category === "first_follow_up");
  const message = personalize(suggested?.message || state.templates[1].message, lead, clinic);
  openSheet(`<h2 class="sheet-title">${escapeHtml(followup.step)}</h2><p class="sheet-subtitle">${escapeHtml(lead.name || lead.instagram)} · ${escapeHtml(lead.instagram)}</p>
    <div class="message-preview">${escapeHtml(message)}</div>
    <div class="detail-actions"><button class="secondary-button" id="copy-followup">Copiar mensagem</button><button class="primary-button" id="open-followup-instagram">Abrir Instagram</button></div>
    <button class="primary-button" id="complete-followup">Marcar como realizado</button>`, () => {
    $("#copy-followup").addEventListener("click", async () => { await navigator.clipboard.writeText(message); showToast("Mensagem copiada"); });
    $("#open-followup-instagram").addEventListener("click", () => window.open(`https://instagram.com/${lead.instagram.replace("@", "")}`, "_blank", "noopener"));
    $("#complete-followup").addEventListener("click", () => {
      followup.status = "completed"; followup.completedAt = new Date().toISOString(); lead.status = "talking"; lead.lastContactAt = followup.completedAt;
      lead.timeline.push({ at: followup.completedAt, label: `${followup.step} realizado` });
      persist(); renderFollowups(); renderDashboard(); closeSheet(); showToast("Follow-up concluído");
    });
  });
}
function personalize(message, lead, clinic) { return message.replaceAll("{{nome}}", lead.name?.split(" ")[0] || "").replaceAll("{{clinica}}", clinic?.name || "clínica"); }

function openMessages() {
  openSheet(`<h2 class="sheet-title">Mensagens rápidas</h2><p class="sheet-subtitle">Copie, personalize e envie com naturalidade.</p>${state.templates.map(template => `<div class="template-card"><strong>${escapeHtml(template.title)}</strong><p>${escapeHtml(template.message)}</p><button class="small-link copy-template" data-template="${template.id}">Copiar mensagem</button></div>`).join("")}`, () => {
    $$(".copy-template").forEach(button => button.addEventListener("click", async () => {
      const template = state.templates.find(item => item.id === button.dataset.template);
      await navigator.clipboard.writeText(template.message); showToast("Mensagem copiada");
    }));
  });
}

function openSettings() {
  openSheet(`<h2 class="sheet-title">Preferências</h2><p class="sheet-subtitle">Seu espaço de operação manual</p>
    <div class="template-card"><strong>Dados</strong><p>${isSupabaseConfigured ? "Espaço compartilhado da equipe com sincronização em tempo real." : "Modo local de validação. Os dados ficam somente neste navegador."}</p></div>
    <div class="template-card"><strong>Instalar no iPhone</strong><p>No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.</p></div>
    <button class="danger-link" id="reset-demo">Apagar dados locais de demonstração</button>`, () => {
    $("#reset-demo").addEventListener("click", () => {
      if (!confirm("Apagar os dados locais e voltar ao estado inicial?")) return;
      localStorage.removeItem(operationalStorageKey()); location.reload();
    });
  });
}

async function exportReport(share = false) {
  const stats = periodStats(state.reportPeriod);
  const actions = Object.keys(countLabels).reduce((total, key) => total + Number(stats[key] || 0), 0);
  const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1600;
  const ctx = canvas.getContext("2d"); ctx.fillStyle = "#f7f5f0"; ctx.fillRect(0, 0, 1080, 1600);
  ctx.fillStyle = "#1f6b57"; ctx.fillRect(70, 70, 940, 18);
  ctx.fillStyle = "#1f6b57"; ctx.font = "700 28px Arial"; ctx.fillText("MUNNIUS", 70, 145);
  ctx.fillStyle = "#172521"; ctx.font = "700 72px Arial"; ctx.fillText($("#report-label").textContent, 70, 245);
  ctx.fillStyle = "#71807a"; ctx.font = "30px Arial"; ctx.fillText($("#report-date").textContent, 70, 295);
  const metrics = [
    [stats.leads, "Leads captados"], [stats.hunters, "Para closer"],
    [stats.profiles, "Novos follows"], [stats.likes, "Curtidas"],
    [stats.comments, "Comentários"], [stats.directs, "Directs enviados"],
    [stats.responses, "Leads que responderam"], [stats.phones, "Telefones captados"]
  ];
  metrics.forEach(([value, label], index) => {
    const x = 70 + (index % 2) * 480, y = 365 + Math.floor(index / 2) * 225;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(x, y, 430, 180);
    ctx.fillStyle = "#172521"; ctx.font = "700 60px Arial"; ctx.fillText(String(value), x + 32, y + 82);
    ctx.fillStyle = "#71807a"; ctx.font = "25px Arial"; ctx.fillText(label, x + 32, y + 132);
  });
  ctx.fillStyle = "#1f6b57"; ctx.fillRect(70, 1300, 940, 190);
  ctx.fillStyle = "#ffffff"; ctx.font = "700 38px Arial"; ctx.fillText(`${actions} ações · ${(stats.seconds / 3600).toFixed(1)}h trabalhadas`, 110, 1385);
  ctx.font = "26px Arial"; ctx.fillText(stats.directs && stats.phones ? `1 telefone a cada ${(stats.directs / stats.phones).toFixed(1)} directs` : "Operação pronta para começar", 110, 1440);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
  const file = new File([blob], `munnius-social-${state.reportPeriod}.png`, { type: "image/png" });
  if (share && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "Relatório Munnius Social" });
  else {
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = file.name; link.click(); URL.revokeObjectURL(link.href);
    showToast("Relatório baixado em imagem");
  }
}

$("#login-form").addEventListener("submit", async event => {
  event.preventDefault();
  const result = await authGateway.signIn($("#email").value, $("#password").value);
  if (!result.ok) return showToast(result.message);
  await openWorkspace(isSupabaseConfigured ? "Bem-vindo de volta" : "Ambiente local aberto");
});
if (googleEnabled) {
  $("#google-login").classList.remove("hidden");
  $("#google-divider").classList.remove("hidden");
}
$("#google-login").addEventListener("click", async () => {
  const button = $("#google-login");
  button.disabled = true;
  button.querySelector("span").textContent = "Abrindo Google...";
  const result = await authGateway.signInWithGoogle();
  if (!result.ok) {
    button.disabled = false;
    button.querySelector("span").textContent = "Continuar com Google";
    showToast(result.message);
  }
});
$("#toggle-password").addEventListener("click", () => { const input = $("#password"); input.type = input.type === "password" ? "text" : "password"; $("#toggle-password").textContent = input.type === "password" ? "Ver" : "Ocultar"; });
$("#forgot-password").addEventListener("click", async () => {
  const email = $("#email").value;
  if (!email) return showToast("Digite seu e-mail primeiro");
  const button = $("#forgot-password");
  button.disabled = true;
  button.textContent = "Enviando...";
  const result = await authGateway.resetPassword?.(email);
  button.disabled = false;
  button.textContent = "Esqueci minha senha";
  showToast(result?.message || "Não foi possível solicitar a recuperação.");
});
$("#recovery-form").addEventListener("submit", async event => {
  event.preventDefault();
  const password = $("#new-password").value;
  const confirmation = $("#confirm-password").value;
  if (password.length < 8) return showToast("Use pelo menos 8 caracteres.");
  if (password !== confirmation) return showToast("As senhas não são iguais.");
  const button = $("#save-password");
  button.disabled = true;
  button.textContent = "Salvando...";
  const result = await authGateway.updatePassword(password);
  if (!result.ok) {
    button.disabled = false;
    button.textContent = "Salvar senha e entrar";
    return showToast(result.message);
  }
  recoveryMode = false;
  history.replaceState({}, document.title, location.pathname);
  await openWorkspace("Senha criada. Bem-vindo!");
});
$("#signout").addEventListener("click", async () => { await authGateway.signOut(); location.reload(); });
$$("[data-view]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.view)));
$$("[data-period]").forEach(button => button.addEventListener("click", () => { $$("[data-period]").forEach(b => b.classList.remove("active")); button.classList.add("active"); state.period = button.dataset.period; renderDashboard(); }));
$$("[data-report-period]").forEach(button => button.addEventListener("click", () => { $$("[data-report-period]").forEach(b => b.classList.remove("active")); button.classList.add("active"); state.reportPeriod = button.dataset.reportPeriod; renderReport(); }));
$("#choose-clinic").addEventListener("click", clinicPicker);
$$("[data-action]").forEach(button => button.addEventListener("click", () => handleSessionAction(button.dataset.action)));
$("#undo-action").addEventListener("click", () => state.lastAction ? (updateAction(state.lastAction, -1), state.lastAction = null, showToast("Última ação desfeita")) : showToast("Nenhuma ação para desfazer"));
$("#adjust-counts").addEventListener("click", openAdjustCounts);
$("#finish-session").addEventListener("click", finishSession);
$("#open-instagram").addEventListener("click", () => { const clinic = clinicById(state.session?.clinicId); if (clinic) window.open(`https://instagram.com/${clinic.instagram.replace("@", "")}`, "_blank", "noopener"); });
$("#quick-lead").addEventListener("click", () => openLeadForm({ mode: "response" }));
$("#new-lead").addEventListener("click", () => openLeadForm({ mode: "response" }));
$("#lead-search").addEventListener("input", renderLeads);
$$("[data-status]").forEach(button => button.addEventListener("click", () => { $$("[data-status]").forEach(b => b.classList.remove("active")); button.classList.add("active"); state.leadFilter = button.dataset.status; renderLeads(); }));
$$("[data-followup-filter]").forEach(button => button.addEventListener("click", () => { $$("[data-followup-filter]").forEach(b => b.classList.remove("active")); button.classList.add("active"); state.followupFilter = button.dataset.followupFilter; renderFollowups(); }));
$("#sheet-close").addEventListener("click", closeSheet);
$("#sheet-backdrop").addEventListener("click", event => { if (event.target === $("#sheet-backdrop")) closeSheet(); });
$$("[data-sheet]").forEach(button => button.addEventListener("click", () => button.dataset.sheet === "messages" ? openMessages() : openSettings()));
$("#add-clinic").addEventListener("click", () => openClinicForm());
$("#export-report").addEventListener("click", () => exportReport(false));
$("#share-report").addEventListener("click", () => exportReport(true));
document.addEventListener("keydown", event => { if (event.key === "Escape") closeSheet(); });

async function initializeAuth() {
  if (!isSupabaseConfigured) return;
  await authGateway.onAuthStateChange(async (event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      showRecoveryForm();
      return;
    }
    if (event === "SIGNED_IN" && session && !recoveryMode) {
      await openWorkspace("Bem-vindo de volta");
    }
  });
  const session = await authGateway.getSession();
  if (recoveryMode) {
    showRecoveryForm();
    return;
  }
  if (session) await openWorkspace("Bem-vindo de volta");
}

initializeAuth().catch(error => {
  console.warn("Não foi possível restaurar a sessão.", error);
  showToast("Não foi possível restaurar seu acesso.");
});

if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js");
