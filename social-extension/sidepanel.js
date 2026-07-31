const $ = selector => document.querySelector(selector);
let state = null;
let timerId;
let qualificationDraft = null;
let activeTabId = null;

async function resolveActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTabId = tab?.id || null;
  return activeTabId;
}

async function message(type, payload = {}) {
  if (!activeTabId) await resolveActiveTab();
  return chrome.runtime.sendMessage({ type, tabId: activeTabId, ...payload }).then(response => {
    if (!response?.ok) throw new Error(response?.message || "Não foi possível concluir.");
    return response.state;
  });
}

function toast(text) {
  const node = $("#toast");
  node.textContent = text;
  node.classList.remove("hidden");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.add("hidden"), 2200);
}

function elapsedLabel(session) {
  if (!session?.startedAt) return "00:00";
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(session.startedAt)) / 1000));
  const remaining = Number(session.limitSeconds || 0) - elapsed;
  const absolute = Math.abs(remaining);
  return `${remaining < 0 ? "+" : ""}${[Math.floor(absolute / 60), absolute % 60]
    .map(value => String(value).padStart(2, "0")).join(":")}`;
}

function renderTimer() {
  $("#session-timer").textContent = elapsedLabel(state?.activeSession);
}

function renderMessages() {
  const fallback = [
    { id: "first", title: "1º contato", message: "Oi! Vi seu perfil e queria te contar um pouco sobre o trabalho da clínica 😊" },
    { id: "follow1", title: "1º follow-up", message: "Oi! Passando só para saber se você conseguiu ver minha mensagem 😊" },
    { id: "follow2", title: "2º follow-up", message: "Oi! Caso ainda tenha interesse, posso te passar as informações por aqui." },
    { id: "phone", title: "Pedir WhatsApp", message: "Posso pedir para nossa equipe entrar em contato com você? Qual é o melhor WhatsApp?" }
  ];
  const templates = state.templates?.length ? state.templates : fallback;
  $("#message-list").innerHTML = templates.slice(0, 8).map(template => `
    <article class="message-item">
      <div><strong>${escapeHtml(template.title)}</strong><small>${escapeHtml(template.message)}</small></div>
      <button data-copy="${template.id}">Copiar</button>
    </article>`).join("");
  document.querySelectorAll("[data-copy]").forEach(button => button.addEventListener("click", async () => {
    const template = templates.find(item => item.id === button.dataset.copy);
    await navigator.clipboard.writeText(template.message);
    toast("Mensagem copiada");
  }));
}

function escapeHtml(value = "") {
  const node = document.createElement("div");
  node.textContent = value;
  return node.innerHTML;
}

function renderHistory() {
  const container = $("#history-list");
  if (!container) return;
  container.innerHTML = (state.recentEvents || []).slice(0, 10).map(event => `
    <article class="history-item">
      <i></i><div><strong>${escapeHtml(event.label)}</strong><small>${escapeHtml(event.detail || "Instagram")}</small></div>
      <time>${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(event.at))}</time>
    </article>`).join("") || `<div class="empty">As ações detectadas aparecerão aqui.</div>`;
}

function renderOutreach() {
  const selectedClinicId = state.activeSession?.clinicId || state.selectedClinicId;
  const items = (state.outreach || [])
    .filter(item => !selectedClinicId || item.clinicId === selectedClinicId)
    .slice(0, 16);
  $("#outreach-list").innerHTML = items.map(item => {
    const status = item.status === "phone" ? "Telefone" : item.status === "responded" ? "Respondido" : "Aguardando";
    return `<article class="outreach-item ${item.status}">
      <span>${item.status === "phone" ? "☎" : item.status === "responded" ? "↩" : "➤"}</span>
      <div><strong>${escapeHtml(item.profileHandle)}</strong><small>${status}</small></div>
      <div class="outreach-actions">
        ${item.status === "sent" ? `<button data-outreach-response="${item.id}">Respondeu</button>` : ""}
        ${item.status === "responded" ? `<button data-outreach-qualify="${item.id}">Qualificar</button>` : ""}
        ${item.status === "phone" ? `<button data-outreach-review="${item.id}">Revisar</button>` : ""}
        ${item.status !== "phone" ? `<button class="phone" data-outreach-phone="${item.id}">Telefone</button>` : ""}
      </div>
    </article>`;
  }).join("") || `<div class="empty">Os @ detectados nos directs aparecerão aqui.</div>`;
  document.querySelectorAll("[data-outreach-response]").forEach(button => button.addEventListener("click", async () => {
    const item = state.outreach.find(record => record.id === button.dataset.outreachResponse);
    if (!item) return;
    openQualification({ ...item, stage: "response", instagramUrl: `https://www.instagram.com/${item.profileHandle.replace("@", "")}/` });
  }));
  document.querySelectorAll("[data-outreach-phone]").forEach(button => button.addEventListener("click", () => {
    const item = state.outreach.find(record => record.id === button.dataset.outreachPhone);
    if (item) openQualification({ ...item, stage: "phone", phone: item.phone || "" });
  }));
  document.querySelectorAll("[data-outreach-qualify]").forEach(button => button.addEventListener("click", () => {
    const item = state.outreach.find(record => record.id === button.dataset.outreachQualify);
    if (item) openQualification({ ...item, stage: "response" });
  }));
  document.querySelectorAll("[data-outreach-review]").forEach(button => button.addEventListener("click", () => {
    const item = state.outreach.find(record => record.id === button.dataset.outreachReview);
    if (item) openQualification({ ...item, stage: "phone" });
  }));
}

function openQualification(candidate = {}) {
  qualificationDraft = {
    stage: candidate.stage || (candidate.phone ? "phone" : "response"),
    name: candidate.name || "",
    phone: candidate.phone || "",
    profileHandle: candidate.profileHandle || state.currentContext?.profileHandle || "",
    instagramUrl: candidate.instagramUrl || state.currentContext?.instagramUrl || "",
    qualification: candidate.qualification || {},
    qualificationNotes: candidate.qualificationNotes || {},
    interest: candidate.interest || "",
    temperature: candidate.temperature || "warm"
  };
  const isPhone = qualificationDraft.stage === "phone";
  $("#qualification-eyebrow").textContent = isPhone ? "Entrega para a Hunter" : "Atualizar mini CRM";
  $("#qualification-title").textContent = isPhone ? "Telefone captado" : "Lead respondeu";
  $("#qualification-name").value = qualificationDraft.name;
  $("#qualification-profile").value = qualificationDraft.profileHandle;
  $("#qualification-phone").value = qualificationDraft.phone;
  $("#qualification-interest").value = qualificationDraft.interest;
  $("#qualification-temperature").value = qualificationDraft.temperature;
  document.querySelectorAll("[data-extension-qualification]").forEach(input => {
    input.checked = Boolean(qualificationDraft.qualification[input.dataset.extensionQualification]);
  });
  document.querySelectorAll("[data-extension-note]").forEach(input => {
    input.value = qualificationDraft.qualificationNotes[input.dataset.extensionNote] || "";
  });
  const syncHunterAction = () => $("#send-phone-hunter").classList.toggle("hidden", !isPhone && !$("#qualification-phone").value.trim());
  $("#qualification-phone").oninput = syncHunterAction;
  syncHunterAction();
  $("#qualification-card").classList.remove("hidden");
  (isPhone ? $("#qualification-phone") : $("#qualification-name")).focus();
}

function closeQualification() {
  qualificationDraft = null;
  $("#qualification-card").classList.add("hidden");
}

function readExtensionQualification() {
  return Object.fromEntries([...document.querySelectorAll("[data-extension-qualification]")]
    .map(input => [input.dataset.extensionQualification, input.checked]));
}

function readExtensionQualificationNotes() {
  return Object.fromEntries([...document.querySelectorAll("[data-extension-note]")]
    .map(input => [input.dataset.extensionNote, input.value.trim()]));
}

function hunterMessage(candidate, qualification) {
  const clinic = state.clinics.find(item => item.id === state.activeSession?.clinicId);
  const labels = {
    priorInvestment: "Pesquisou ou investiu antes",
    valueUnderstood: "Entendeu o valor",
    decisionAuthority: "Decide por conta própria",
    knowsDoctor: "Conhece a Dra.",
    procedureDiscussed: "Falou sobre o incômodo",
    fitConfirmed: "A solução faz sentido",
    interestedThisMonth: "Interesse ainda este mês",
    importantDate: "Tem uma data importante"
  };
  const icons = {
    person: "\u{1F464}", compass: "\u{1F9ED}", calendar: "\u{1F4C5}",
    check: "\u{2705}", dot: "\u{25AB}\u{FE0F}",
    hot: "\u{1F525}", warm: "\u{1F324}\u{FE0F}", cold: "\u{2744}\u{FE0F}", message: "\u{1F4AC}"
  };
  const notes = readExtensionQualificationNotes();
  const qualificationKeys = Object.keys(labels);
  const principal = qualificationKeys.map(key => {
    const noteKey = ({ priorInvestment: "B", valueUnderstood: "B", decisionAuthority: "A", knowsDoctor: "A", procedureDiscussed: "N", fitConfirmed: "N", interestedThisMonth: "T", importantDate: "T" })[key];
    const note = String(notes[noteKey] || "").trim();
    if (note) return note;
    return qualification[key] ? labels[key] : "";
  }).filter((value, index, items) => value && items.indexOf(value) === index);
  const temperature = { hot: `${icons.hot} Quente`, warm: `${icons.warm} Morno`, cold: `${icons.cold} Frio` }[$("#qualification-temperature").value];
  return {
    clinic,
    text: `\u{1F4F2} *${clinic?.name || "Clínica"}*\n*${[$("#qualification-name").value || "Nome não informado", candidate.profileHandle].filter(Boolean).join(" · ")}*\n${$("#qualification-phone").value || "WhatsApp não informado"}\n\nInteresse: ${$("#qualification-interest").value || "Não identificado"}\nTemperatura: ${temperature}\nJá alinhado: ${(principal.slice(0, 3).join("; ") || "Contexto mínimo; continuar a qualificação.").slice(0, 240)}`
  };
}

async function saveLeadContext(sendToHunter = false) {
  if (!state.activeSession) return toast("Inicie uma sessão primeiro");
  const candidate = qualificationDraft || {};
  const qualification = readExtensionQualification();
  candidate.profileHandle = normalizeHandle($("#qualification-profile").value);
  const phone = $("#qualification-phone").value.trim();
  const handoff = hunterMessage(candidate, qualification);
  render(await message("SAVE_LEAD_CONTEXT", {
    stage: phone ? "phone" : candidate.stage || "response",
    name: $("#qualification-name").value.trim(),
    phone,
    profileHandle: candidate.profileHandle || "",
    instagramUrl: candidate.instagramUrl || "",
    qualification,
    qualificationNotes: readExtensionQualificationNotes(),
    interest: $("#qualification-interest").value.trim(),
    temperature: $("#qualification-temperature").value,
    sendToHunter
  }));
  closeQualification();
  if (sendToHunter) {
    if (!phone) return toast("Telefone salvo. Preencha o número para abrir a Hunter.");
    if (!handoff.clinic?.hunterPhone) return toast("Telefone salvo. Cadastre o WhatsApp da Hunter.");
    chrome.tabs.create({ url: `https://wa.me/${handoff.clinic.hunterPhone}?text=${encodeURIComponent(handoff.text)}` });
    toast("Entrega preparada para a Hunter");
  } else {
    toast(candidate.stage === "phone" ? "Telefone salvo no CRM" : "Conversa salva no CRM");
  }
}

function normalizeHandle(value = "") {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/instagram\.com\/([^/?#]+)/i);
  return `@${(match?.[1] || trimmed).replace(/^@/, "").replace(/\/$/, "")}`;
}

function manualContext() {
  const profileHandle = normalizeHandle($("#manual-profile").value || state.currentContext?.profileHandle || "");
  return {
    profileHandle,
    instagramUrl: profileHandle ? `https://www.instagram.com/${profileHandle.replace("@", "")}/` : "",
    context: { profileHandle, instagramUrl: profileHandle ? `https://www.instagram.com/${profileHandle.replace("@", "")}/` : "", source: "manual_extension" }
  };
}

function render(nextState) {
  state = nextState;
  const authenticated = Boolean(state.auth);
  $("#login-view").classList.toggle("hidden", authenticated);
  $("#workspace-view").classList.toggle("hidden", !authenticated);
  if (!authenticated) return;
  const select = $("#clinic-select");
  const selected = state.activeSession?.clinicId || state.selectedClinicId || "";
  select.innerHTML = `<option value="">Selecionar clínica</option>${(state.clinics || []).map(clinic =>
    `<option value="${clinic.id}" ${clinic.id === selected ? "selected" : ""}>${escapeHtml(clinic.name)} · ${escapeHtml(clinic.instagram)}</option>`
  ).join("")}`;
  select.disabled = Boolean(state.activeSession);
  const selectedClinic = state.clinics.find(clinic => clinic.id === selected);
  const matchedClinic = state.clinics.find(clinic => clinic.id === state.matchedClinicId);
  $("#session-title").textContent = state.activeSession?.clinicName || selectedClinic?.name || "Escolha a clínica";
  $("#session-button").textContent = state.activeSession ? "Encerrar e sincronizar" : "Iniciar acompanhamento";
  $("#session-button").classList.toggle("finish", Boolean(state.activeSession));
  $("#session-button").disabled = !state.activeSession && !selected;
  const matchCard = $("#tab-match-card");
  matchCard.className = `tab-match-card ${state.matchStatus || "checking"}`;
  if (matchedClinic) {
    $("#welcome-title").textContent = "Bora trabalhar?";
    $("#welcome-copy").textContent = `Bem-vinda, Social Seller da ${matchedClinic.name}.`;
  } else if (state.matchStatus === "unmatched") {
    $("#welcome-title").textContent = "Conta não cadastrada";
    $("#welcome-copy").textContent = "Aba utilizada não corresponde a nenhuma clínica cadastrada.";
  } else {
    $("#welcome-title").textContent = "Bora trabalhar?";
    $("#welcome-copy").textContent = "Identificando a conta do Instagram desta aba...";
  }
  const automationButton = $("#automation-toggle");
  automationButton.classList.toggle("active", Boolean(state.automationEnabled));
  automationButton.setAttribute("aria-pressed", String(Boolean(state.automationEnabled)));
  automationButton.querySelector("span").textContent = state.automationEnabled ? "Ativada" : "Desativada";
  automationButton.disabled = state.matchStatus !== "matched";
  const counts = state.counters || {};
  Object.entries({ likes: "likes", comments: "comments", directs: "directs", responses: "responses", phones: "phones" })
    .forEach(([key, id]) => $(`#count-${id}`).textContent = counts[key] || 0);
  if (document.activeElement !== $("#manual-profile") && state.currentContext?.profileHandle) {
    $("#manual-profile").value = state.currentContext.profileHandle;
  }
  const candidate = state.phoneCandidate;
  $("#phone-card").classList.toggle("hidden", !candidate);
  if (candidate) {
    $("#phone-value").textContent = candidate.phone;
    $("#phone-profile").textContent = candidate.profileHandle || "Conversa atual";
  }
  $("#connection-status").innerHTML = `<i></i>${state.pendingUploads?.length ? `${state.pendingUploads.length} pendente(s)` : "Sincronizado"}`;
  renderTimer();
  renderMessages();
  renderOutreach();
}

$("#login-button").addEventListener("click", async () => {
  const button = $("#login-button");
  button.disabled = true;
  button.textContent = "Entrando...";
  try {
    render(await message("LOGIN", { email: $("#email").value.trim(), password: $("#password").value }));
    $("#password").value = "";
    toast("Extensão conectada");
  } catch (error) {
    toast(error.message);
  } finally {
    button.disabled = false;
    button.textContent = "Entrar";
  }
});

$("#session-button").addEventListener("click", async () => {
  try {
    render(state.activeSession
      ? await message("FINISH_SESSION")
      : await message("START_SESSION", { clinicId: $("#clinic-select").value }));
  } catch (error) { toast(error.message); }
});
$("#clinic-select").addEventListener("change", async event => {
  try { render(await message("SELECT_CLINIC", { clinicId: event.target.value })); }
  catch (error) { toast(error.message); }
});
$("#automation-toggle").addEventListener("click", async () => {
  try {
    const enabled = !state.automationEnabled;
    render(await message("SET_AUTOMATION", { enabled }));
    toast(enabled ? "Automação ativada nesta aba" : "Automação desativada; modo manual disponível");
  } catch (error) { toast(error.message); }
});
$("#confirm-phone").addEventListener("click", async () => {
  if (state.phoneCandidate) openQualification({ ...state.phoneCandidate, stage: "phone" });
});
$("#dismiss-phone").addEventListener("click", async () => render(await message("DISMISS_PHONE")));
$("#close-qualification").addEventListener("click", closeQualification);
$("#save-phone").addEventListener("click", () => saveLeadContext(false).catch(error => toast(error.message)));
$("#send-phone-hunter").addEventListener("click", () => saveLeadContext(true).catch(error => toast(error.message)));
document.querySelectorAll("[data-manual-event]").forEach(button => button.addEventListener("click", async () => {
  if (!state.activeSession) return toast("Inicie uma sessão primeiro");
  const type = button.dataset.manualEvent;
  const context = manualContext();
  if (type === "response_detected" || type === "phone_captured") {
    openQualification({ ...context, stage: type === "phone_captured" ? "phone" : "response" });
    return;
  }
  render(await message("TRACKED_EVENT", { event: { type, manual: true, ...context } }));
  toast("Ação adicionada manualmente");
}));
$("#refresh-workspace").addEventListener("click", async () => {
  try { render(await message("REFRESH_WORKSPACE")); toast("Clínicas atualizadas"); }
  catch (error) { toast(error.message); }
});
$("#open-app").addEventListener("click", () => chrome.tabs.create({ url: MUNNIUS_EXTENSION_CONFIG.appUrl }));
$("#logout-button").addEventListener("click", async () => render(await message("LOGOUT")));

chrome.runtime.onMessage.addListener(messageEvent => {
  if (messageEvent.type === "STATE_UPDATED" && (!messageEvent.tabId || messageEvent.tabId === activeTabId)) render(messageEvent.state);
});

chrome.tabs.onActivated.addListener(() => {
  resolveActiveTab().then(() => message("GET_STATE")).then(render).catch(error => toast(error.message));
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (tabId === activeTabId && changeInfo.status === "complete") message("GET_STATE").then(render).catch(() => {});
});
resolveActiveTab().then(() => message("GET_STATE")).then(render).catch(error => toast(error.message));
timerId = setInterval(renderTimer, 1000);
