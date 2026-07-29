(() => {
  const RESERVED_PATHS = new Set([
    "", "accounts", "direct", "explore", "reels", "reel", "p", "stories",
    "about", "developer", "legal", "privacy", "terms"
  ]);
  let previousUrl = "";
  let lastPhone = "";
  let scanTimer;
  const lastEmission = new Map();

  function normalizeText(value = "") {
    return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function singleHandleFromPath(pathname = location.pathname) {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length !== 1 || RESERVED_PATHS.has(parts[0].toLowerCase())) return "";
    return `@${parts[0]}`;
  }

  function handleFromContainer(container) {
    const anchors = [...(container || document).querySelectorAll('a[href^="/"]')];
    const candidate = anchors.find(anchor => {
      const path = anchor.getAttribute("href") || "";
      const parts = path.split("/").filter(Boolean);
      return parts.length === 1 && !RESERVED_PATHS.has(parts[0].toLowerCase());
    });
    return candidate ? singleHandleFromPath(candidate.getAttribute("href")) : "";
  }

  function contextFor(target = document) {
    const article = target?.closest?.("article");
    const main = document.querySelector('main, [role="main"]');
    const profileHandle = singleHandleFromPath(location.pathname)
      || handleFromContainer(article)
      || handleFromContainer(main?.querySelector("header"))
      || "";
    return {
      profileHandle,
      instagramUrl: profileHandle
        ? `https://www.instagram.com/${profileHandle.replace("@", "")}/`
        : location.href,
      pageUrl: location.href,
      route: location.pathname.startsWith("/direct/") ? "direct" : profileHandle ? "profile" : "feed"
    };
  }

  function emit(type, extra = {}, cooldown = 700) {
    const context = contextFor(extra.target);
    const key = `${type}:${context.profileHandle}:${extra.phone || ""}`;
    const lastAt = lastEmission.get(key) || 0;
    if (Date.now() - lastAt < cooldown) return;
    lastEmission.set(key, Date.now());
    chrome.runtime.sendMessage({
      type: "TRACKED_EVENT",
      event: {
        type,
        profileHandle: context.profileHandle,
        instagramUrl: context.instagramUrl,
        context,
        phone: extra.phone || null
      }
    }).catch(() => {});
  }

  function buttonText(button) {
    return normalizeText([
      button?.innerText,
      button?.getAttribute?.("aria-label"),
      button?.querySelector?.("svg")?.getAttribute?.("aria-label"),
      button?.querySelector?.("svg title")?.textContent
    ].filter(Boolean).join(" "));
  }

  function isCommentComposer(target) {
    const placeholder = normalizeText(target?.getAttribute?.("placeholder") || target?.getAttribute?.("aria-label") || "");
    return /coment|comment/.test(placeholder);
  }

  function isDirectComposer(target) {
    if (!location.pathname.startsWith("/direct/")) return false;
    return target?.matches?.('textarea, [contenteditable="true"], [role="textbox"]');
  }

  document.addEventListener("click", event => {
    const button = event.target.closest?.('button, [role="button"]');
    if (!button) return;
    const text = buttonText(button);
    if (/(^|\s)(seguir|follow)(\s|$)/.test(text) && !/(seguindo|following|deixar de seguir|unfollow)/.test(text)) {
      return emit("follow", { target: button }, 1200);
    }
    if (/(^| )(curtir|like)( |$)/.test(text) && !/(descurtir|unlike)/.test(text)) {
      return emit("like", { target: button }, 900);
    }
    if (/(^|\s)(publicar|post)(\s|$)/.test(text)) {
      const scope = button.closest("form, article, [role='dialog']") || document;
      if (scope.querySelector('textarea, [contenteditable="true"]')) emit("comment", { target: button }, 1200);
      return;
    }
    if (location.pathname.startsWith("/direct/") && /(^|\s)(enviar|send)(\s|$)/.test(text)) {
      emit("direct_sent", { target: button }, 1200);
    }
  }, true);

  document.addEventListener("keydown", event => {
    if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
    if (isDirectComposer(event.target)) emit("direct_sent", { target: event.target }, 1200);
    else if (isCommentComposer(event.target)) emit("comment", { target: event.target }, 1200);
  }, true);

  function inspectRoute() {
    if (location.href === previousUrl) return;
    previousUrl = location.href;
    const handle = singleHandleFromPath(location.pathname);
    if (handle) {
      emit("profile_viewed", {
        target: document,
        dedupeKey: `profile:${handle}`
      }, 0);
    }
    schedulePhoneScan();
  }

  function schedulePhoneScan() {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(() => {
      if (!location.pathname.startsWith("/direct/")) return;
      const main = document.querySelector('main, [role="main"]');
      const visibleText = (main?.innerText || "").slice(-24000);
      const matches = visibleText.match(/(?:\+?55\s*)?(?:\(?\d{2}\)?[\s.-]*)?(?:9\s*)?\d{4}[\s.-]*\d{4}/g) || [];
      const candidate = matches.map(value => value.trim()).find(value => value.replace(/\D/g, "").length >= 10);
      if (!candidate || candidate === lastPhone) return;
      lastPhone = candidate;
      emit("phone_candidate", { target: main, phone: candidate }, 0);
    }, 1100);
  }

  const observer = new MutationObserver(() => {
    inspectRoute();
    schedulePhoneScan();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setInterval(inspectRoute, 800);
  inspectRoute();
})();
