/* تفاعلات الهوية التحريرية — خفيفة، متاحة، وتعمل مع المحتوى الديناميكي. */
(() => {
  "use strict";

  const root = document.documentElement;
  const interactiveSelector = [
    ".book", ".news-card", ".issue", ".know-card", ".essay-card",
    ".article-card", ".field", ".src-card", ".setting", ".panel",
    ".review-item", ".auth-card", ".profile-card"
  ].join(",");

  const progress = document.createElement("div");
  progress.className = "editorial-progress";
  progress.setAttribute("aria-hidden", "true");
  document.body.prepend(progress);

  let ticking = false;
  function updateProgress() {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.setProperty("--read", `${max > 0 ? Math.min(100, scrollY / max * 100) : 0}%`);
    ticking = false;
  }
  addEventListener("scroll", () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateProgress);
    }
  }, { passive: true });
  addEventListener("resize", updateProgress, { passive: true });
  updateProgress();

  const canHover = matchMedia("(hover:hover) and (pointer:fine)");
  function enhanceCard(card) {
    if (card.dataset.editorialReady) return;
    card.dataset.editorialReady = "true";
    if (!canHover.matches) return;
    card.addEventListener("pointermove", (event) => {
      if (root.dataset.motion === "reduce") return;
      const box = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${event.clientX - box.left}px`);
      card.style.setProperty("--my", `${event.clientY - box.top}px`);
    }, { passive: true });
  }

  function enhance(scope = document) {
    if (scope.matches?.(interactiveSelector)) enhanceCard(scope);
    scope.querySelectorAll?.(interactiveSelector).forEach(enhanceCard);
  }
  enhance();

  const mutationObserver = new MutationObserver((entries) => {
    entries.forEach((entry) => entry.addedNodes.forEach((node) => {
      if (node.nodeType === 1) enhance(node);
    }));
  });
  mutationObserver.observe(document.body, { childList: true, subtree: true });

  document.addEventListener("click", (event) => {
    const filter = event.target.closest(".filter, .seg button, .tabs button");
    if (!filter || root.dataset.motion === "reduce") return;
    filter.animate(
      [{ transform: "scale(.96)" }, { transform: "scale(1)" }],
      { duration: 180, easing: "cubic-bezier(.2,.8,.2,1)" }
    );
  });
})();
