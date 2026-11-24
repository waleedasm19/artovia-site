/* صفحة التطبيق: زر التثبيت (تطبيق ويب يُثبَّت من المتصفح)، وتعليمات التثبيت لكل جهاز، ومشاركة الرابط. */
(() => {
  "use strict";
  const button = document.querySelector("#install-app");
  const status = document.querySelector("#download-status");
  const share = document.querySelector("#share-app");
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const mobile = /android|mobile/i.test(navigator.userAgent);
  const installed = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  const steps = (id) => document.getElementById(id)?.classList.add("on");
  let prompt = null;

  if (installed) {
    button.textContent = "التطبيق مثبّت عندك";
    button.setAttribute("aria-disabled", "true");
    status.textContent = "أنت تستخدم تطبيق إرتوفيا الآن.";
  } else if (ios) {
    button.textContent = "طريقة التثبيت";
    button.addEventListener("click", () => { steps("steps-ios"); document.getElementById("steps-ios").scrollIntoView({ behavior: "smooth", block: "center" }); });
    steps("steps-ios");
  }

  addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    prompt = event;
    status.textContent = "جاهز للتثبيت بضغطة واحدة.";
  });
  addEventListener("appinstalled", () => {
    prompt = null;
    button.textContent = "تم التثبيت";
    status.textContent = "تجد إرتوفيا الآن على شاشتك الرئيسية.";
  });
  if (!installed && !ios) button.addEventListener("click", async () => {
    if (prompt) {
      prompt.prompt();
      const choice = await prompt.userChoice.catch(() => null);
      if (choice?.outcome !== "accepted") status.textContent = "يمكنك التثبيت لاحقًا من الزر نفسه.";
      prompt = null;
      return;
    }
    steps("steps-chrome");
    status.textContent = mobile ? "اتبع الخطوات أدناه للتثبيت من متصفحك." : "في متصفح الحاسوب: اضغط أيقونة التثبيت في شريط العنوان، أو اتبع الخطوات أدناه.";
  });

  share?.addEventListener("click", async () => {
    const data = { title: document.title, text: "تطبيق مؤسسة إرتوفيا الخيرية: المعرفة حقٌّ للجميع", url: location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(location.href); status.textContent = "تم نسخ رابط التطبيق."; }
    } catch (error) {
      if (error?.name !== "AbortError") status.textContent = "تعذّرت المشاركة. يمكنك نسخ الرابط من المتصفح.";
    }
  });

})();
