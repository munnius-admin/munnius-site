const $ = selector => document.querySelector(selector);
let state = null;
let timerId;

function message(type, payload = {}) {
  return chrome.runtime.sendMessage({ type, ...payload }).then(response => {
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

function elapsedLabel(startedAt) {
  if (!startedAt) return "00:00:00";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt)) / 1000));
  return [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60]
    .map(value => String(value).padStart(2, "0")).join(":");
}

function renderTimer() {
  $("#session-timer").textContent = elapsedLabel(state?.activeSession?.startedAt);
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
  $("#history-list").innerHTML = (state.recentEvents || []).slice(0, 10).map(event => `
    <article class="history-item">
      <i></i><div><strong>${escapeHtml(event.label)}</strong><small>${escapeHtml(event.detail || "Instagram")}</small></div>
      <time>${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(event.at))}</time>
    </article>`).join("") || `<div class="empty">As ações detectadas aparecerão aqui.</div>`;
}

function render(nextState) {
  state = nextState;
  const authenticated = Boolean(state.auth);
  $("#login-view").classList.toggle("hidden", authenticated);
  $("#workspace-view").classList.toggle("hidden", !authenticated);
  if (!authenticated) return;
  const select = $("#clinic-select");
  const selected = state.activeSession?.clinicId || select.value;
  select.innerHTML = `<option value="">Selecionar clínica</option>${(state.clinics || []).map(clinic =>
    `<option value="${clinic.id}" ${clinic.id === selected ? "selected" : ""}>${escapeHtml(clinic.name)} · ${escapeHtml(clinic.instagram)}</option>`
  ).join("")}`;
  select.disabled = Boolean(state.activeSession);
  $("#session-title").textContent = state.activeSession?.clinicName || "Escolha a clínica";
  $("#session-button").textContent = state.activeSession ? "Encerrar e sincronizar" : "Iniciar acompanhamento";
  $("#session-button").classList.toggle("finish", Boolean(state.activeSession));
  const counts = state.counters || {};
  Object.entries({ profiles: "profiles", likes: "likes", comments: "comments", directs: "directs", responses: "responses", phones: "phones" })
    .forEach(([key, id]) => $(`#count-${id}`).textContent = counts[key] || 0);
  $("#current-profile").textContent = state.currentContext?.profileHandle || "Abra um perfil no Instagram";
  const candidate = state.phoneCandidate;
  $("#phone-card").classList.toggle("hidden", !candidate);
  if (candidate) {
    $("#phone-value").textContent = candidate.phone;
    $("#phone-profile").textContent = candidate.profileHandle || "Conversa atual";
  }
  $("#connection-status").innerHTML = `<i></i>${state.pendingUploads?.length ? `${state.pendingUploads.length} pendente(s)` : "Sincronizado"}`;
  renderTimer();
  renderMessages();
  renderHistory();
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
$("#mark-response").addEventListener("click", async () => {
  if (!state.activeSession) return toast("Inicie uma sessão primeiro");
  render(await message("MARK_RESPONSE", { context: state.currentContext || {} }));
  toast("Resposta registrada");
});
$("#confirm-phone").addEventListener("click", async () => {
  render(await message("CONFIRM_PHONE"));
  toast("Telefone confirmado");
});
$("#dismiss-phone").addEventListener("click", async () => render(await message("DISMISS_PHONE")));
$("#refresh-workspace").addEventListener("click", async () => {
  try { render(await message("REFRESH_WORKSPACE")); toast("Clínicas atualizadas"); }
  catch (error) { toast(error.message); }
});
$("#open-app").addEventListener("click", () => chrome.tabs.create({ url: MUNNIUS_EXTENSION_CONFIG.appUrl }));
$("#logout-button").addEventListener("click", async () => render(await message("LOGOUT")));

chrome.runtime.onMessage.addListener(messageEvent => {
  if (messageEvent.type === "STATE_UPDATED") render(messageEvent.state);
});

message("GET_STATE").then(render).catch(error => toast(error.message));
timerId = setInterval(renderTimer, 1000);
