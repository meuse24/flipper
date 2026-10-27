// Hosted PWA UI. Native installation always starts with an explicit user click.
(() => {
  "use strict";
  if (!isSecureContext || !/^https?:$/.test(location.protocol)) return;
  let deferredPrompt = null,
    installedHere = false,
    ui = null;
  const standalone = matchMedia("(display-mode: standalone)");
  const fullscreen = matchMedia("(display-mode: fullscreen)");
  const asApp = () =>
    standalone.matches || fullscreen.matches || navigator.standalone === true;
  addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    ui?.sync();
  });
  addEventListener("appinstalled", () => {
    installedHere = true;
    deferredPrompt = null;
    ui?.installed();
  });

  // Prompt limits belong to this app, independent of the reused Slotmachine media.
  const INSTALL_POLICY = Object.freeze({
    minRounds: 2,
    maxDismissals: 2,
    snoozeMs: 14 * 864e5,
  });
  const UPDATE_POLICY = Object.freeze({
    checkThrottleMs: 60000,
    pollMs: 5 * 60000,
    activationTimeoutMs: 12000,
  });

  function init() {
    const $ = (id) => document.getElementById(id);
    const home = $("overlay"),
      button = $("install-app"),
      help = $("install-help");
    const nudge = $("install-nudge"),
      notice = $("update-notice");
    const apple =
      /iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const key = "badboy.install-nudge";
    let state = {};
    try {
      state = JSON.parse(localStorage.getItem(key)) || {};
    } catch {}
    state = {
      rounds: Math.max(0, Number(state.rounds) || 0),
      dismissed: Math.max(0, Number(state.dismissed) || 0),
      until: Number(state.until) || 0,
    };
    const save = () => {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch {}
    };
    let shown = false,
      suggestion = false,
      knownInstalled = false,
      checkingInstalled = false;
    let registration = null,
      waiting = null,
      ready = false,
      later = false,
      applying = false;
    let updateTimer = null,
      lastCheck = 0;
    // Only ready/game-over menus may offer activation; paused games are still active runs.
    const safe = () =>
      !home.hidden &&
      home.dataset.mode !== "paused" &&
      !document.hidden &&
      !document.querySelector("dialog[open]");
    const installedRelated = async () => {
      try {
        const apps = await Promise.race([
          navigator.getInstalledRelatedApps?.() || Promise.resolve([]),
          new Promise((resolve) => setTimeout(() => resolve([]), 1500)),
        ]);
        const manifest = new URL("manifest.webmanifest", location.href).href;
        const id = new URL("index.html", location.href).href;
        return apps.some(
          (app) =>
            app.platform === "webapp" &&
            (app.url === manifest || app.id === id),
        );
      } catch {
        return false;
      }
    };
    function sync() {
      button.hidden =
        installedHere || asApp() || home.dataset.mode === "paused";
      const update = !!(waiting || ready) && !later && safe();
      notice.hidden = !update;
      if (
        safe() &&
        !button.hidden &&
        !knownInstalled &&
        !update &&
        !shown &&
        state.rounds >= INSTALL_POLICY.minRounds &&
        state.dismissed < INSTALL_POLICY.maxDismissals &&
        Date.now() >= state.until &&
        (deferredPrompt || apple)
      ) {
        if (!checkingInstalled) {
          checkingInstalled = true;
          installedRelated().then((value) => {
            knownInstalled = value;
            // Recheck eligibility after the asynchronous installed-app query.
            if (
              !value &&
              safe() &&
              !installedHere &&
              !asApp() &&
              !(waiting || ready) &&
              state.dismissed < INSTALL_POLICY.maxDismissals &&
              Date.now() >= state.until
            ) {
              shown = true;
              suggestion = true;
            }
            sync();
          });
        }
      }
      nudge.hidden =
        !suggestion || !safe() || button.hidden || update || knownInstalled;
      const hasNotice = !nudge.hidden || !notice.hidden;
      if (home.classList.contains("pwa-notice") !== hasNotice)
        home.classList.toggle("pwa-notice", hasNotice);
      $("start-btn").disabled = applying;
      $("update-yes").disabled = applying;
      $("update-later").disabled = applying;
    }
    function snooze() {
      state.dismissed++;
      state.until = Date.now() + INSTALL_POLICY.snoozeMs;
      save();
      suggestion = false;
      sync();
    }
    async function instructions() {
      const installed = await installedRelated();
      $("install-instructions").textContent = installed
        ? "BADBOY Pinball is already installed. Open it from your apps or Home Screen. To reinstall, remove the existing app first."
        : apple
          ? "Open this page in Safari. Tap Share → Add to Home Screen, then Add. Enable Open as Web App if shown."
          : /Android/.test(navigator.userAgent)
            ? "Open the browser menu (⋮), then choose Install app or Add to Home screen."
            : /Macintosh/.test(navigator.userAgent) &&
                /Safari/.test(navigator.userAgent) &&
                !/Chrome|Chromium|Edg|OPR|Firefox/.test(navigator.userAgent)
              ? "In Safari, choose Share → Add to Dock."
              : "Use the install icon in the address bar or the browser menu → Install page as app. If the option is missing, try Chrome or Edge; on Mac, try Safari.";
      if (!safe() || installedHere || asApp()) return;
      help.showModal();
      sync();
    }
    async function install() {
      suggestion = false;
      sync();
      if (!safe() || installedHere || asApp()) return;
      if (!deferredPrompt) {
        await instructions();
        return;
      }
      const prompt = deferredPrompt;
      deferredPrompt = null;
      button.disabled = true;
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice?.outcome === "accepted") {
          installedHere = true;
          if (help.open) help.close();
        } else snooze();
      } catch {
        await instructions();
      } finally {
        button.disabled = false;
        sync();
      }
    }
    button.addEventListener("click", install);
    $("install-yes").addEventListener("click", install);
    $("install-later").addEventListener("click", snooze);
    $("install-close").addEventListener("click", () => help.close());
    help.addEventListener("close", sync);
    addEventListener("badboy:round-finished", () => {
      state.rounds++;
      save();
      suggestion = false;
      sync();
    });
    // Entering play hides the suggestion for the remainder of this visit.
    new MutationObserver(() => {
      if (home.hidden) suggestion = false;
      sync();
    }).observe(home, {
      attributes: true,
      attributeFilter: ["hidden", "data-mode"],
    });
    for (const dialog of document.querySelectorAll("dialog"))
      new MutationObserver(sync).observe(dialog, {
        attributes: true,
        attributeFilter: ["open"],
      });
    for (const query of [standalone, fullscreen])
      query.addEventListener("change", sync);
    document.addEventListener("visibilitychange", () => {
      sync();
      check();
    });
    addEventListener("pageshow", () => {
      sync();
      check();
    });
    addEventListener("online", check);
    ui = {
      sync,
      installed() {
        suggestion = false;
        if (help.open) help.close();
        sync();
      },
    };

    function offer(worker) {
      if (
        !worker ||
        worker === navigator.serviceWorker.controller ||
        worker === waiting
      )
        return;
      waiting = worker;
      ready = false;
      later = false;
      $("update-message").textContent =
        "A new version is ready. Updating reloads the game.";
      sync();
    }
    async function check() {
      if (
        !registration ||
        document.hidden ||
        !navigator.onLine ||
        Date.now() - lastCheck < UPDATE_POLICY.checkThrottleMs
      )
        return;
      lastCheck = Date.now();
      try {
        await registration.update();
      } catch {
        /* Keep the offline game usable. */
      }
    }
    $("update-later").addEventListener("click", () => {
      later = true;
      sync();
    });
    $("update-yes").addEventListener("click", () => {
      if (!safe() || applying || !(waiting || ready)) return;
      applying = true;
      sync();
      if (ready || waiting === navigator.serviceWorker.controller) {
        location.reload();
        return;
      }
      $("update-message").textContent = "Updating…";
      const failed = () => {
        applying = false;
        $("update-message").textContent =
          "Update could not finish. Try again, or keep playing.";
        sync();
      };
      updateTimer = setTimeout(failed, UPDATE_POLICY.activationTimeoutMs);
      try {
        waiting.postMessage({ type: "SKIP_WAITING" });
      } catch {
        clearTimeout(updateTimer);
        failed();
      }
    });
    sync();
    if (!("serviceWorker" in navigator)) return;
    let controller = navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      const previous = controller;
      controller = navigator.serviceWorker.controller;
      if (!controller || controller === previous) return;
      if (applying) {
        clearTimeout(updateTimer);
        location.reload();
        return;
      }
      if (!previous) return; // Initial offline installation is not a game update.
      waiting = null;
      ready = true;
      later = false;
      $("update-message").textContent =
        "The app was updated in another window. Reload when you are ready.";
      sync();
    });
    navigator.serviceWorker
      .register("./sw.js", { updateViaCache: "none" })
      .then((reg) => {
        registration = reg;
        navigator.serviceWorker.ready.then(() => {
          $("offline").textContent = "OFFLINE PLAY READY ↗";
        });
        const watch = (worker) => {
          if (!worker) return;
          const changed = () => {
            if (
              worker.state === "installed" &&
              navigator.serviceWorker.controller
            )
              offer(worker);
            if (worker.state === "redundant" && worker === waiting) {
              waiting = null;
              sync();
            }
          };
          worker.addEventListener("statechange", changed);
          changed();
        };
        reg.addEventListener("updatefound", () => watch(reg.installing));
        watch(reg.installing);
        offer(reg.waiting);
        lastCheck = Date.now();
        setInterval(check, UPDATE_POLICY.pollMs);
      })
      .catch(() => {
        /* Hosting or storage failures must not block play. */
      });
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
