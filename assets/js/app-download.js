/* صفحة التطبيق: زر التثبيت (تطبيق ويب يُثبَّت من المتصفح)، وتعليمات الآيفون والأندرويد، ومشاركة الرابط. */
(() => {
  "use strict";
  const button = document.querySelector("#install-app");
  const status = document.querySelector("#download-status");
  const share = document.querySelector("#share-app");
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /android/i.test(navigator.userAgent);
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
    steps("steps-android");
    status.textContent = android ? "اتبع الخطوات أدناه للتثبيت من متصفحك." : "في متصفح الحاسوب: اضغط أيقونة التثبيت في شريط العنوان.";
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

  // نسخة APK التجريبية تبقى رابطًا ثانويًا لمن يريدها
  if (android) fetch("https://api.github.com/repos/waleedasm19/artovia-site/releases?per_page=15", { headers: { Accept: "application/vnd.github+json" } })
    .then((r) => (r.ok ? r.json() : [])).then((items) => {
      const asset = items.find((i) => /^artovia-android-preview-/.test(i?.tag_name))?.assets?.find((a) => a?.name === "artovia-preview.apk");
      const link = document.getElementById("apk-link");
      if (asset && link && /^https:\/\/github\.com\/waleedasm19\/artovia-site\/releases\/download\//.test(asset.browser_download_url)) {
        link.href = asset.browser_download_url; link.hidden = false;
      }
    }).catch(() => {});
})();
