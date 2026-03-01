// Live Synth — in-app help panel
import { HELP_HTML } from "./help-content.js";

export interface HelpPanel {
  toggle: () => void;
  destroy: () => void;
}

export function createHelpPanel(container: HTMLElement): HelpPanel {
  // --- Overlay backdrop ---
  const backdrop = document.createElement("div");
  backdrop.className = "help-backdrop";
  backdrop.setAttribute("aria-hidden", "true");

  // --- Content panel ---
  const panel = document.createElement("div");
  panel.className = "help-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Usage manual");

  // --- Header row ---
  const panelHeader = document.createElement("div");
  panelHeader.className = "help-panel-header";

  const panelTitle = document.createElement("div");
  panelTitle.className = "help-panel-title";
  panelTitle.textContent = "LIVE SYNTH — QUICK REFERENCE";

  const closeBtn = document.createElement("button");
  closeBtn.className = "help-close-btn";
  closeBtn.textContent = "×";
  closeBtn.setAttribute("aria-label", "Close help");

  panelHeader.append(panelTitle, closeBtn);

  // --- Scrollable body ---
  const body = document.createElement("div");
  body.className = "help-panel-body";
  body.innerHTML = HELP_HTML;

  panel.append(panelHeader, body);
  backdrop.append(panel);

  let isOpen = false;

  function open(): void {
    isOpen = true;
    backdrop.classList.add("help-visible");
    container.append(backdrop);
    // Prevent backdrop clicks from propagating to editor
    backdrop.addEventListener("click", onBackdropClick);
    closeBtn.addEventListener("click", close);
  }

  function close(): void {
    isOpen = false;
    backdrop.classList.remove("help-visible");
    backdrop.removeEventListener("click", onBackdropClick);
    closeBtn.removeEventListener("click", close);
    // Remove from DOM after transition
    setTimeout(() => {
      if (!isOpen && backdrop.parentNode) backdrop.remove();
    }, 250);
  }

  function toggle(): void {
    if (isOpen) close();
    else open();
  }

  function onBackdropClick(e: MouseEvent): void {
    if (e.target === backdrop) close();
  }

  function onKeyDown(e: KeyboardEvent): void {
    // Skip when any input/editor is focused
    const active = document.activeElement;
    if (
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      (active instanceof HTMLElement && active.isContentEditable)
    ) {
      return;
    }
    // CodeMirror editor check — it uses a div[contenteditable=true]
    const cmEditor = document.querySelector(".cm-editor");
    if (cmEditor?.contains(active)) return;

    if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      toggle();
    } else if (e.key === "F1") {
      e.preventDefault();
      toggle();
    } else if (e.key === "Escape" && isOpen) {
      close();
    }
  }

  document.addEventListener("keydown", onKeyDown);

  function destroy(): void {
    document.removeEventListener("keydown", onKeyDown);
    backdrop.remove();
  }

  return { toggle, destroy };
}
