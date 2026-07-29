import { authGateway, dataGateway, isSupabaseConfigured } from "./supabase-client.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const STORAGE_KEY = "munnius-social-v2";
const countLabels = { profiles: "Perfis", likes: "Curtidas", comments: "Comentários", directs: "Directs", responses: "Respostas", phones: "Telefones" };
const titles = { home: "Visão geral", session: "Sessão", leads: "Leads", followups: "Follow-ups", more: "Mais", clinics: "Clínicas", reports: "Relatórios" };
const statusNames = { new: "Novo", talking: "Conversando", no_response: "Sem resposta", follow_up: "Follow-up", sent_to_hunter: "Enviado à Hunter", finished: "Finalizado" };

const seed = {
  version: 2,
  profile: { name: "Hiara Munhoz", initials: "HM", role: "social_seller" },
  clinics: [
    { id: "bella", name: "Clínica Bella", doctor: "Dra. Beatriz", instagram: "@clinicabella", hunter: "Ana", hunterPhone: "5541999990001", protocol: "Glow", location: "Curitiba, PR", evaluationPrice: 300, target: 8, color: "#75566f", active: true },
    { id: "aura", name: "Instituto Aura", doctor: "Dra. Camila", instagram: "@institutoaura", hunter: "Marina", hunterPhone: "5541999990002", protocol: "Aura Natural", location: "São Paulo, SP", evaluationPrice: 250, target: 6, color: "#df765f", active: true },
    { id: "leve", name: "Clínica Leve", doctor: "Dra. Renata", instagram: "@clinicaleve", hunter: "Clara", hunterPhone: "5541999990003", protocol: "Leve Face", location: "Belo Horizonte, MG", evaluationPrice: 280, target: 5, color: "#1f6b57", active: true }
  ],
  leads: [
    { id: "lead-1", name: "Mariana Costa", instagram: "@maricosta", whatsapp: "", clinicId: "bella", status: "talking", prospectedAt: new Date().toISOString(), lastContactAt: new Date().toISOString(), sentToHunterAt: null, timeline: [{ at: new Date().toISOString(), label: "Primeiro contato realizado" }] },
    { id: "lead-2", name: "Júlia Martins", instagram: "@jumartins", whatsapp: "", clinicId: "aura", status: "follow_up", prospectedAt: new Date(Date.now() - 86400000).toISOString(), lastContactAt: new Date(Date.now() - 86400000).toISOString(), sentToHunterAt: null, timeline: [{ at: new Date(Date.now() - 86400000).toISOString(), label: "Primeiro contato realizado" }] },
    { id: "lead-3", name: "Fernanda Lima", instagram: "@fernandalima", whatsapp: "41999990010", clinicId: "leve", status: "sent_to_hunter", prospectedAt: new Date().toISOString(), lastContactAt: new Date().toISOString(), sentToHunterAt: new Date().toISOString(), timeline: [{ at: new Date().toISOString(), label: "Enviado para Hunter" }] }
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

function loadState() {
  const base = isSupabaseConfigured
    ? { ...structuredClone(seed), clinics: [], leads: [], followups: [], sessions: [] }
    : structuredClone(seed);
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored?.version === 2) return { ...base, ...stored, session: null, timerId: null, lastAction: null, leadFilter: "all", followupFilter: "today", reportPeriod: "day" };
  } catch (error) { console.warn("Não foi possível recuperar os dados locais.", error); }
  return { ...base, session: null, timerId: null, lastAction: null, leadFilter: "all", followupFilter: "today", reportPeriod: "day" };
}

let state = loadState();
let syncTimer;
function persist() {
  const { timerId, session, lastAction, leadFilter, followupFilter, reportPeriod, ...serializable } = state;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
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
  if (remote?.version !== 2) {
    state.profile = workspace.profile;
    persist();
    return;
  }
  const base = { ...structuredClone(seed), clinics: [], leads: [], followups: [], sessions: [] };
  state = { ...base, ...remote, profile: workspace.profile, session: null, timerId: null, lastAction: null, leadFilter: "all", followupFilter: "today", reportPeriod: "day" };
  const { timerId, session, lastAction, leadFilter, followupFilter, reportPeriod, ...serializable } = state;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
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
  $("#leads-total").textContent = stats.leads;
  $("#clinics-total").textContent = activeClinics.length;
  $("#hunters-total").textContent = stats.hunters;
  $("#followups-total").textContent = pending;
  const badge = $(".bottom-nav [data-view='followups'] i");
  badge.textContent = pending;
  badge.classList.toggle("hidden", pending === 0);
  renderClinics();
}

function clinicLeadCount(clinicId, period = "day") { return state.leads.filter(lead => lead.clinicId === clinicId && inPeriod(lead.prospectedAt, period)).length; }
function clinicMarkup(clinic, detailed = false) {
  const leads = clinicLeadCount(clinic.id);
  const pct = Math.min(100, clinic.target ? leads / clinic.target * 100 : 0);
  return `<article class="clinic-card ${detailed ? "clickable" : ""}" ${detailed ? `data-clinic-detail="${clinic.id}"` : ""}>
    <div class="clinic-avatar" style="background:${clinic.color}">${clinic.name.split(" ").slice(-1)[0][0]}</div>
    <div class="clinic-main"><strong>${clinic.name}</strong><span>${clinic.doctor} · Hunter ${clinic.hunter}</span><div class="progress"><i style="width:${pct}%"></i></div></div>
    <div class="clinic-score"><strong>${leads}/${clinic.target}</strong><span>leads hoje</span></div>
  </article>`;
}
function renderClinics() {
  const active = state.clinics.filter(clinic => clinic.active);
  $("#clinic-list").innerHTML = active.map(clinic => clinicMarkup(clinic)).join("") || emptyState("Nenhuma clínica ativa.");
  $("#clinics-page-list").innerHTML = active.map(clinic => clinicMarkup(clinic, true)).join("") || emptyState("Cadastre sua primeira clínica.");
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
      <div class="lead-info"><strong>${escapeHtml(lead.name || lead.instagram)}</strong><span>${escapeHtml(lead.instagram)}</span></div><span class="status ${lead.status}">${statusNames[lead.status]}</span></div>
      <div class="lead-meta"><span>${clinic?.name || "Clínica removida"}</span><span>${formatDate(lead.prospectedAt, true)}</span></div>
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
  const labels = { day: "Hoje", week: "Últimos 7 dias", month: "Últimos 30 dias" };
  $("#report-label").textContent = labels[state.reportPeriod];
  $("#report-date").textContent = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date());
  $("#report-leads").textContent = stats.leads;
  $("#report-hunters").textContent = stats.hunters;
  $("#report-directs").textContent = stats.directs;
  $("#report-hours").textContent = `${(stats.seconds / 3600).toFixed(1).replace(".", ",")}h`;
  $("#report-efficiency").textContent = stats.directs ? `1 lead a cada ${(stats.directs / Math.max(1, stats.leads)).toFixed(1).replace(".", ",")} directs` : "Comece uma sessão";
  const days = state.reportPeriod === "day" ? 1 : state.reportPeriod === "week" ? 7 : 10;
  const values = Array.from({ length: days }, (_, index) => {
    const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (days - 1 - index));
    return state.leads.filter(lead => isSameDay(lead.prospectedAt, date)).length;
  });
  const max = Math.max(1, ...values);
  $("#report-chart").innerHTML = values.map((value, index) => `<div><span style="height:${Math.max(8, value / max * 88)}%"></span><small>${state.reportPeriod === "day" ? "Hoje" : index === values.length - 1 ? "Hoje" : new Intl.DateTimeFormat("pt-BR", { weekday: "narrow" }).format(new Date(Date.now() - (values.length - 1 - index) * 86400000))}</small></div>`).join("");
}

function emptyState(message) { return `<div class="empty-inline"><span>◇</span><p>${message}</p></div>`; }
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
    <div class="clinic-options">${clinics.map(clinic => `<button class="clinic-option" data-clinic-pick="${clinic.id}"><span><strong>${clinic.name}</strong><small>${clinic.instagram}</small></span><b>›</b></button>`).join("")}</div>`, () => {
    $$("[data-clinic-pick]").forEach(button => button.addEventListener("click", () => startSession(button.dataset.clinicPick)));
  });
}

function startSession(clinicId) {
  const clinic = clinicById(clinicId);
  state.session = { id: uid("session"), clinicId, startedAt: new Date().toISOString(), counts: Object.fromEntries(Object.keys(countLabels).map(key => [key, 0])) };
  $("#session-clinic").textContent = clinic.name;
  $("#session-empty").classList.add("hidden");
  $("#session-active").classList.remove("hidden");
  $$("[data-action] strong").forEach(node => node.textContent = "0");
  closeSheet();
  clearInterval(state.timerId);
  state.timerId = setInterval(updateTimer, 1000);
  updateTimer(); navigate("session");
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
  $(`[data-action="${action}"] strong`).textContent = state.session.counts[action];
  if (delta > 0) state.lastAction = action;
  if (action === "phones" && delta > 0) openLeadForm({ hasPhone: true });
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
  renderDashboard(); showToast("Sessão salva no histórico");
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
  openSheet(`<h2 class="sheet-title">${edit ? "Editar clínica" : "Nova clínica"}</h2><p class="sheet-subtitle">A Hunter fica vinculada para agilizar cada entrega.</p>
    <form class="sheet-form" id="clinic-form">
      ${field("clinic-name", "Nome da clínica", clinic.name, true)}
      ${field("clinic-doctor", "Dra. responsável", clinic.doctor, true)}
      ${field("clinic-instagram", "Instagram", clinic.instagram, true, "text", "@clinica")}
      <div class="form-grid">${field("clinic-hunter", "Hunter responsável", clinic.hunter, true)}${field("clinic-hunter-phone", "WhatsApp da Hunter", clinic.hunterPhone, true, "tel", "(00) 00000-0000")}</div>
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

function openLeadForm({ leadId = null, hasPhone = false } = {}) {
  const lead = leadId ? leadById(leadId) : {};
  const edit = Boolean(leadId);
  openSheet(`<h2 class="sheet-title">${edit ? "Editar lead" : hasPhone ? "Telefone captado" : "Novo lead"}</h2><p class="sheet-subtitle">Cole o @ ou o link do Instagram. O restante é opcional.</p>
    <form class="sheet-form" id="lead-form">
      ${field("lead-instagram", "Instagram", lead.instagram, true, "text", "@usuario ou link")}
      ${field("lead-name", "Nome", lead.name, false, "text", "Nome do lead")}
      ${field("lead-phone", "WhatsApp", lead.whatsapp, hasPhone, "tel", "(00) 00000-0000")}
      <div class="field"><label for="lead-clinic">Clínica</label><select id="lead-clinic">${state.clinics.filter(c=>c.active).map(c => `<option value="${c.id}" ${(lead.clinicId || state.session?.clinicId) === c.id ? "selected" : ""}>${c.name}</option>`).join("")}</select></div>
      <div class="field"><label for="lead-status">Status</label><select id="lead-status">${Object.entries(statusNames).map(([key, label]) => `<option value="${key}" ${(lead.status || (hasPhone ? "sent_to_hunter" : "new")) === key ? "selected" : ""}>${label}</option>`).join("")}</select></div>
      <div class="field"><label for="lead-followup">Próximo follow-up <span class="optional">(opcional)</span></label><input id="lead-followup" type="datetime-local"></div>
      <button class="primary-button" type="submit">${hasPhone ? "Salvar e enviar para Hunter" : edit ? "Salvar alterações" : "Salvar lead"}</button>
    </form>`, () => {
    $("#lead-instagram").addEventListener("blur", event => { event.target.value = instagramHandle(event.target.value); });
    $("#lead-form").addEventListener("submit", async event => {
      event.preventDefault();
      const clinicId = $("#lead-clinic").value;
      const status = $("#lead-status").value;
      const now = new Date().toISOString();
      const record = edit ? lead : {
        id: uid("lead"), prospectedAt: now, timeline: [{ at: now, label: "Lead criado" }], sentToHunterAt: null
      };
      Object.assign(record, {
        name: $("#lead-name").value.trim(), instagram: instagramHandle($("#lead-instagram").value),
        whatsapp: phoneDigits($("#lead-phone").value), clinicId, status, lastContactAt: now
      });
      if (!edit) state.leads.unshift(record);
      record.timeline.push({ at: now, label: edit ? `Status alterado para ${statusNames[status]}` : "Primeiro contato registrado" });
      const followupAt = $("#lead-followup").value;
      if (followupAt) {
        state.followups.push({ id: uid("fu"), leadId: record.id, scheduledFor: new Date(followupAt).toISOString(), step: "Follow-up", status: "pending" });
        record.status = "follow_up"; record.timeline.push({ at: now, label: `Follow-up agendado para ${formatDate(followupAt, true)}` });
      }
      const shouldSend = hasPhone || status === "sent_to_hunter";
      if (shouldSend) record.sentToHunterAt = now;
      persist(); renderDashboard(); renderLeads(); renderFollowups(); closeSheet();
      if (shouldSend) openHunterWhatsApp(record); else showToast(edit ? "Lead atualizado" : "Lead salvo");
    });
  });
}

function openLeadDetail(leadId) {
  const lead = leadById(leadId); const clinic = clinicById(lead.clinicId);
  openSheet(`<div class="lead-detail-head"><div class="lead-avatar">${initials(lead.name || lead.instagram)}</div><div><h2 class="sheet-title">${escapeHtml(lead.name || lead.instagram)}</h2><p class="sheet-subtitle">${escapeHtml(lead.instagram)} · ${clinic?.name || ""}</p></div></div>
    <div class="detail-actions"><button class="secondary-button" id="edit-lead">Editar</button><button class="primary-button" id="contact-lead">Abrir Instagram</button></div>
    <h3 class="timeline-title">Histórico resumido</h3><div class="timeline">${[...(lead.timeline || [])].reverse().map(item => `<div><i></i><span><strong>${escapeHtml(item.label)}</strong><small>${formatDate(item.at, true)}</small></span></div>`).join("")}</div>
    ${lead.whatsapp && !lead.sentToHunterAt ? `<button class="primary-button" id="send-hunter">Enviar para Hunter</button>` : ""}`, () => {
    $("#edit-lead").addEventListener("click", () => openLeadForm({ leadId }));
    $("#contact-lead").addEventListener("click", () => window.open(`https://instagram.com/${lead.instagram.replace("@", "")}`, "_blank", "noopener"));
    $("#send-hunter")?.addEventListener("click", () => { lead.status = "sent_to_hunter"; lead.sentToHunterAt = new Date().toISOString(); lead.timeline.push({ at: lead.sentToHunterAt, label: `Enviado para ${clinic.hunter}` }); persist(); openHunterWhatsApp(lead); });
  });
}

function openHunterWhatsApp(lead) {
  const clinic = clinicById(lead.clinicId);
  const message = `Oi, ${clinic.hunter}! Novo lead da ${clinic.name}.\n\nNome: ${lead.name || "Não informado"}\nInstagram: ${lead.instagram}\nWhatsApp: ${lead.whatsapp || "Não informado"}\nData: ${formatDate(lead.prospectedAt, true)}`;
  showToast("Lead salvo e mensagem preparada");
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
  openSheet(`<h2 class="sheet-title">Preferências</h2><p class="sheet-subtitle">Munnius Social · MVP manual</p>
    <div class="template-card"><strong>Dados</strong><p>${isSupabaseConfigured ? "Sincronização segura com Supabase ativa." : "Modo local de validação. Os dados ficam somente neste navegador."}</p></div>
    <div class="template-card"><strong>Instalar no iPhone</strong><p>No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.</p></div>
    <button class="danger-link" id="reset-demo">Apagar dados locais de demonstração</button>`, () => {
    $("#reset-demo").addEventListener("click", () => {
      if (!confirm("Apagar os dados locais e voltar ao estado inicial?")) return;
      localStorage.removeItem(STORAGE_KEY); location.reload();
    });
  });
}

async function exportReport(share = false) {
  const stats = periodStats(state.reportPeriod);
  const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext("2d"); ctx.fillStyle = "#f7f5f0"; ctx.fillRect(0, 0, 1080, 1350);
  ctx.fillStyle = "#1f6b57"; ctx.fillRect(70, 70, 940, 18);
  ctx.fillStyle = "#172521"; ctx.font = "700 44px Arial"; ctx.fillText("Munnius Social", 70, 160);
  ctx.font = "700 76px Arial"; ctx.fillText($("#report-label").textContent, 70, 270);
  ctx.fillStyle = "#71807a"; ctx.font = "32px Arial"; ctx.fillText($("#report-date").textContent, 70, 325);
  const metrics = [[stats.leads, "Leads captados"], [stats.hunters, "Enviados à Hunter"], [stats.directs, "Directs enviados"], [`${(stats.seconds / 3600).toFixed(1)}h`, "Horas trabalhadas"]];
  metrics.forEach(([value, label], index) => {
    const x = 70 + (index % 2) * 480, y = 420 + Math.floor(index / 2) * 260;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(x, y, 430, 210);
    ctx.fillStyle = "#172521"; ctx.font = "700 70px Arial"; ctx.fillText(String(value), x + 35, y + 95);
    ctx.fillStyle = "#71807a"; ctx.font = "28px Arial"; ctx.fillText(label, x + 35, y + 150);
  });
  ctx.fillStyle = "#1f6b57"; ctx.fillRect(70, 1000, 940, 180);
  ctx.fillStyle = "#ffffff"; ctx.font = "700 38px Arial"; ctx.fillText(stats.directs ? `1 lead a cada ${(stats.directs / Math.max(1, stats.leads)).toFixed(1)} directs` : "Operação pronta para começar", 110, 1090);
  ctx.font = "26px Arial"; ctx.fillText("Relatório gerado pelo Munnius Social", 110, 1140);
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
  try {
    await hydrateRemoteState();
  } catch (error) {
    console.warn("Não foi possível carregar a nuvem.", error);
    showToast("Entrou, mas a sincronização será retomada");
  }
  $("#auth-screen").classList.add("hidden"); $("#app-shell").classList.remove("hidden");
  renderProfile();
  renderDashboard(); renderLeads(); renderFollowups(); renderReport();
  showToast(isSupabaseConfigured ? "Bem-vinda de volta" : "Ambiente local aberto");
});
$("#toggle-password").addEventListener("click", () => { const input = $("#password"); input.type = input.type === "password" ? "text" : "password"; $("#toggle-password").textContent = input.type === "password" ? "Ver" : "Ocultar"; });
$("#forgot-password").addEventListener("click", async () => {
  const email = $("#email").value;
  if (!email) return showToast("Digite seu e-mail primeiro");
  const result = await authGateway.resetPassword?.(email);
  showToast(result?.ok ? "Confira seu e-mail" : "Recuperação disponível após conectar o Supabase");
});
$("#signout").addEventListener("click", async () => { await authGateway.signOut(); location.reload(); });
$$("[data-view]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.view)));
$$("[data-period]").forEach(button => button.addEventListener("click", () => { $$("[data-period]").forEach(b => b.classList.remove("active")); button.classList.add("active"); state.period = button.dataset.period; renderDashboard(); }));
$$("[data-report-period]").forEach(button => button.addEventListener("click", () => { $$("[data-report-period]").forEach(b => b.classList.remove("active")); button.classList.add("active"); state.reportPeriod = button.dataset.reportPeriod; renderReport(); }));
$("#choose-clinic").addEventListener("click", clinicPicker);
$$("[data-action]").forEach(button => button.addEventListener("click", () => updateAction(button.dataset.action)));
$("#undo-action").addEventListener("click", () => state.lastAction ? (updateAction(state.lastAction, -1), state.lastAction = null, showToast("Última ação desfeita")) : showToast("Nenhuma ação para desfazer"));
$("#adjust-counts").addEventListener("click", openAdjustCounts);
$("#finish-session").addEventListener("click", finishSession);
$("#open-instagram").addEventListener("click", () => { const clinic = clinicById(state.session?.clinicId); if (clinic) window.open(`https://instagram.com/${clinic.instagram.replace("@", "")}`, "_blank", "noopener"); });
$("#quick-lead").addEventListener("click", () => openLeadForm());
$("#new-lead").addEventListener("click", () => openLeadForm());
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

if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js");
