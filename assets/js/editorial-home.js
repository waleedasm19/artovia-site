/* تُحمّل المجموعة الشمسية عند فتح المشهد للمرة الأولى. */
(() => {
  "use strict";

  const explorer = document.querySelector("#solar-explorer");
  const link = document.querySelector(".front-hero-explore");
  if (!explorer || !link) return;

  let started = false;
  async function openScene() {
    if (!explorer.open || started) return;
    started = true;
    await Promise.allSettled([import("./hero.js"), import("./hero-scenes.js")]);
    if (explorer.open) window.dispatchEvent(new Event("resize"));
  }

  link.addEventListener("click", () => {
    explorer.open = true;
  });
  explorer.addEventListener("toggle", () => {
    if (!explorer.open) return;
    if (started) window.dispatchEvent(new Event("resize"));
    else void openScene();
  });
  void openScene();
})();
