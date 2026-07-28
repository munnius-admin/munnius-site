import { authGateway, dataGateway, isSupabaseConfigured } from "./supabase-client.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const state = {
  period: "day",
  session: null,
  timerId: null,
  lastAction: null,
  leadFilter: "all",
  clinics: [
    { id: "bella", name: "Clínica Bella", doctor: "Dra. Beatriz", hunter: "Ana", hunterPhone: "5541999990001", leads: 5, target: 8, color: "#75566f" },
    { id: "aura", name: "Instituto Aura", doctor: "Dra. Camila", hunter: "Marina", hunterPhone: "5541999990002", leads: 3, target: 6, color: "#df765f" },
    { id: "leve", name: "Clínica Leve", doctor: "Dra. Renata", hunter: "Clara", hunterPhone: "5541999990003", leads: 4, target: 5, color: "#1f6b57" },
    { id: "lumina", name: "Lumina Face", doctor: "Dra. Laura", hunter: "Bia", hunterPhone: "5541999990004", leads: 0, target: 5, color: "#dda94c" }
  ],
  leads: [
    { id: 1, name: "Mariana Costa", instagram: "@maricosta", clinic: "Clínica Bella", status: "talking", date: "Hoje, 14:32" },
    { id: 2, name: "Júlia Martins", instagram: "@jumartins", clinic: "Instituto Aura", status: "follow_up", date: "Ontem, 17:10" },
    { id: 3, name: "Fernanda Lima", instagram: "@fernandalima", clinic: "Clínica Leve", status: "new", date: "Hoje, 11:05" },
    { id: 4, name: "Carolina Alves", instagram: "@carol.alves", clinic: "Clínica Bella", status: "talking", date: "Hoje, 09:48" }
  ],
  followups: [
    { name: "Júlia Martins", instagram: "@jumartins", when: "Atrasado há 1 dia", step: "1º follow-up" },
    { name: "Paula Reis", instagram: "@paulareis", when: "Hoje, 15:30", step: "Pedir WhatsApp" },
    { name: "Débora Melo", instagram: "@debora.m", when: "Hoje, 17:00", step: "2º follow-up" }
  ]
};

const titles = { home: "Visão geral", session: "Sessão", leads: "Leads", followups: "Follow-ups", more: "Mais", clinics: "Clínicas" };
const statusNames = { new: "Novo", talking: "Conversando", follow_up: "Follow-up", no_response: "Sem resposta", sent_to_hunter: "Enviado à Hunter", finished: "Finalizado" };

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.add("hidden"), 2200);
}

function navigate(view) {
  $$(".view").forEach(panel => panel.classList.toggle("active", panel.dataset.viewPanel === view));
  $$(".bottom-nav button").forEach(button => button.classList.toggle("active", button.dataset.view === view));
  $("#page-title").textContent = titles[view];
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderClinics() {
  const markup = state.clinics.map(clinic => `
    <article class="clinic-card">
      <div class="clinic-avatar" style="background:${clinic.color}">${clinic.name.split(" ").slice(-1)[0][0]}</div>
      <div class="clinic-main"><strong>${clinic.name}</strong><span>${clinic.doctor} · Hunter ${clinic.hunter}</span><div class="progress"><i style="width:${Math.min(100, clinic.leads / clinic.target * 100)}%"></i></div></div>
      <div class="clinic-score"><strong>${clinic.leads}/${clinic.target}</strong><span>leads hoje</span></div>
    </article>`).join("");
  $("#clinic-list").innerHTML = markup;
  $("#clinics-page-list").innerHTML = markup;
}

function renderLeads() {
  const query = $("#lead-search").value.toLowerCase();
  const filtered = state.leads.filter(lead => (state.leadFilter === "all" || lead.status === state.leadFilter) && `${lead.name} ${lead.instagram}`.toLowerCase().includes(query));
  $("#lead-list").innerHTML = filtered.map(lead => `
    <article class="lead-card" data-lead="${lead.id}">
      <div class="lead-top"><div class="lead-avatar">${lead.name.split(" ").map(part => part[0]).slice(0,2).join("")}</div>
      <div class="lead-info"><strong>${lead.name}</strong><span>${lead.instagram}</span></div><span class="status ${lead.status}">${statusNames[lead.status]}</span></div>
      <div class="lead-meta"><span>${lead.clinic}</span><span>${lead.date}</span></div>
    </article>`).join("") || `<div class="session-empty"><p>Nenhum lead encontrado.</p></div>`;
}

function renderFollowups() {
  $("#followup-list").innerHTML = state.followups.map((item, index) => `
    <article class="followup-card"><div class="lead-avatar">${item.name.split(" ").map(p=>p[0]).slice(0,2).join("")}</div>
    <div class="lead-info"><strong>${item.name}</strong><span>${item.instagram} · ${item.when}</span></div>
    <button data-followup="${index}">${item.step}</button></article>`).join("");
}

function openSheet(content) {
  $("#sheet-content").innerHTML = content;
  $("#sheet-backdrop").classList.remove("hidden");
}

function closeSheet() { $("#sheet-backdrop").classList.add("hidden"); }

function clinicPicker() {
  openSheet(`<h2 class="sheet-title">Escolha a clínica</h2><p class="sheet-subtitle">Os registros desta sessão ficarão associados a ela.</p>
    <div class="clinic-options">${state.clinics.map(c => `<button class="clinic-option" data-clinic="${c.id}"><strong>${c.name}</strong><span>›</span></button>`).join("")}</div>`);
  $$("[data-clinic]", $("#sheet-content")).forEach(button => button.addEventListener("click", () => startSession(button.dataset.clinic)));
}

function startSession(clinicId) {
  const clinic = state.clinics.find(item => item.id === clinicId);
  state.session = { clinicId, startedAt: Date.now(), counts: { profiles: 0, likes: 0, comments: 0, directs: 0, responses: 0, phones: 0 } };
  $("#session-clinic").textContent = clinic.name;
  $("#session-empty").classList.add("hidden");
  $("#session-active").classList.remove("hidden");
  closeSheet();
  clearInterval(state.timerId);
  state.timerId = setInterval(updateTimer, 1000);
  updateTimer();
  navigate("session");
  showToast(`Sessão iniciada · ${clinic.name}`);
}

function updateTimer() {
  if (!state.session) return;
  const elapsed = Math.floor((Date.now() - state.session.startedAt) / 1000);
  const parts = [Math.floor(elapsed / 3600), Math.floor(elapsed % 3600 / 60), elapsed % 60].map(v => String(v).padStart(2, "0"));
  $("#timer").textContent = parts.join(":");
}

function updateAction(action, delta = 1) {
  if (!state.session) return;
  state.session.counts[action] = Math.max(0, state.session.counts[action] + delta);
  $(`[data-action="${action}"] strong`).textContent = state.session.counts[action];
  state.lastAction = delta > 0 ? action : null;
  if (action === "phones" && delta > 0) openLeadForm(true);
}

function finishSession() {
  if (!state.session) return;
  const summary = Object.values(state.session.counts).reduce((sum, n) => sum + n, 0);
  dataGateway.saveSession?.(state.session);
  clearInterval(state.timerId);
  state.session = null;
  $("#session-empty").classList.remove("hidden");
  $("#session-active").classList.add("hidden");
  $$("[data-action] strong").forEach(node => node.textContent = "0");
  showToast(`Sessão encerrada · ${summary} ações registradas`);
}

function openLeadForm(hasPhone = false) {
  openSheet(`<h2 class="sheet-title">${hasPhone ? "Telefone captado" : "Novo lead"}</h2><p class="sheet-subtitle">Só o essencial. Você completa depois, se precisar.</p>
    <form class="sheet-form" id="lead-form">
      <div class="field"><label for="lead-instagram">Instagram</label><input id="lead-instagram" placeholder="@usuario" required></div>
      <div class="field"><label for="lead-name">Nome</label><input id="lead-name" placeholder="Nome do lead"></div>
      ${hasPhone ? `<div class="field"><label for="lead-phone">WhatsApp</label><input id="lead-phone" inputmode="tel" placeholder="(00) 00000-0000" required></div>` : ""}
      <div class="field"><label for="lead-clinic">Clínica</label><select id="lead-clinic">${state.clinics.map(c=>`<option value="${c.id}" ${state.session?.clinicId===c.id?"selected":""}>${c.name}</option>`).join("")}</select></div>
      <button class="primary-button" type="submit">${hasPhone ? "Salvar e preparar para Hunter" : "Salvar lead"}</button>
    </form>`);
  $("#lead-form").addEventListener("submit", event => {
    event.preventDefault();
    const clinic = state.clinics.find(c => c.id === $("#lead-clinic").value);
    const instagram = $("#lead-instagram").value.replace(/^@?/, "@");
    const lead = { id: Date.now(), name: $("#lead-name").value || instagram.slice(1), instagram, clinic: clinic.name, status: hasPhone ? "sent_to_hunter" : "new", date: "Agora" };
    state.leads.unshift(lead);
    clinic.leads++;
    renderLeads(); renderClinics(); closeSheet();
    if (hasPhone) {
      const phone = $("#lead-phone")?.value || "";
      const message = encodeURIComponent(`Oi, ${clinic.hunter}! Novo lead da ${clinic.name}.\nNome: ${lead.name}\nInstagram: ${lead.instagram}\nWhatsApp: ${phone}`);
      showToast("Lead salvo e mensagem preparada");
      window.open(`https://wa.me/${clinic.hunterPhone}?text=${message}`, "_blank", "noopener");
    } else showToast("Lead salvo");
  });
}

function openStaticSheet(type) {
  const sheets = {
    messages: `<h2 class="sheet-title">Mensagens rápidas</h2><p class="sheet-subtitle">Copie, personalize e envie no Instagram.</p>${[
      ["1º contato","Oi, {{nome}}! Vi seu perfil e achei que talvez você gostasse de conhecer o trabalho da {{clinica}}. Posso te contar mais?"],
      ["1º follow-up","Oi, {{nome}}! Passando só para saber se você conseguiu ver minha mensagem 😊"],
      ["Pedir WhatsApp","Posso pedir para nossa equipe entrar em contato com você? Qual é o melhor WhatsApp?"]
    ].map(([t,m])=>`<div class="template-card"><strong>${t}</strong><p>${m}</p><button class="small-link copy-template" data-message="${m}">Copiar mensagem</button></div>`).join("")}`,
    reports: `<h2 class="sheet-title">Relatórios</h2><p class="sheet-subtitle">Resumo enxuto para compartilhar.</p><div class="hero-card"><div><p class="card-label">Esta semana</p><strong class="hero-number">38</strong><span class="trend">leads captados</span></div></div><button class="primary-button" style="margin-top:14px" id="export-report">Exportar imagem</button>`,
    settings: `<h2 class="sheet-title">Preferências</h2><p class="sheet-subtitle">Munnius Social · versão de fundação</p><div class="template-card"><strong>Conexão de dados</strong><p>${isSupabaseConfigured ? "Supabase configurado." : "Modo demonstração local. Conecte o Supabase seguindo a documentação."}</p></div>`
  };
  openSheet(sheets[type]);
  $$(".copy-template").forEach(button => button.addEventListener("click", async () => { await navigator.clipboard.writeText(button.dataset.message); showToast("Mensagem copiada"); }));
  $("#export-report")?.addEventListener("click", () => showToast("Exportação será ativada na próxima etapa"));
}

$("#login-form").addEventListener("submit", async event => {
  event.preventDefault();
  const email = $("#email").value;
  const password = $("#password").value;
  const result = await authGateway.signIn(email, password);
  if (!result.ok) return showToast(result.message);
  $("#auth-screen").classList.add("hidden");
  $("#app-shell").classList.remove("hidden");
  renderClinics(); renderLeads(); renderFollowups();
  showToast(isSupabaseConfigured ? "Bem-vinda de volta" : "Modo demonstração ativado");
});
$("#toggle-password").addEventListener("click", () => { const input = $("#password"); input.type = input.type === "password" ? "text" : "password"; });
$("#forgot-password").addEventListener("click", () => showToast("Recuperação disponível após conectar o Supabase"));
$("#signout").addEventListener("click", async () => { await authGateway.signOut(); location.reload(); });
$$("[data-view]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.view)));
$$("[data-period]").forEach(button => button.addEventListener("click", () => { $$("[data-period]").forEach(b=>b.classList.remove("active")); button.classList.add("active"); state.period=button.dataset.period; }));
$("#choose-clinic").addEventListener("click", clinicPicker);
$$("[data-action]").forEach(button => button.addEventListener("click", () => updateAction(button.dataset.action)));
$("#undo-action").addEventListener("click", () => state.lastAction ? (updateAction(state.lastAction, -1), showToast("Última ação desfeita")) : showToast("Nenhuma ação para desfazer"));
$("#finish-session").addEventListener("click", finishSession);
$("#quick-lead").addEventListener("click", () => openLeadForm(false));
$("#new-lead").addEventListener("click", () => openLeadForm(false));
$("#lead-search").addEventListener("input", renderLeads);
$$("[data-status]").forEach(button => button.addEventListener("click", () => { $$("[data-status]").forEach(b=>b.classList.remove("active")); button.classList.add("active"); state.leadFilter=button.dataset.status; renderLeads(); }));
$("#sheet-close").addEventListener("click", closeSheet);
$("#sheet-backdrop").addEventListener("click", event => { if (event.target === $("#sheet-backdrop")) closeSheet(); });
$$("[data-sheet]").forEach(button => button.addEventListener("click", () => openStaticSheet(button.dataset.sheet)));
$("#add-clinic").addEventListener("click", () => showToast("Cadastro de clínica entra na próxima entrega"));

if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js");
