(() => {
  "use strict";
  const button = document.querySelector("#android-download");
  const status = document.querySelector("#download-status");
  const share = document.querySelector("#share-app");
  const releases = "https://github.com/waleedasm19/artovia-site/releases";

  share?.addEventListener("click", async () => {
    const data = { title: document.title, text: "تطبيق مؤسسة إرتوفيا الخيرية", url: location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(location.href);
        status.textContent = "تم نسخ رابط التطبيق.";
      }
    } catch (error) {
      if (error?.name !== "AbortError") status.textContent = "تعذّرت المشاركة. يمكنك نسخ الرابط من المتصفح.";
    }
  });

  fetch("https://api.github.com/repos/waleedasm19/artovia-site/releases?per_page=15", {
    headers: { Accept: "application/vnd.github+json" },
  }).then((response) => {
    if (!response.ok) throw new Error("release lookup failed");
    return response.json();
  }).then((items) => {
    const release = items.find((item) => item?.prerelease && /^artovia-android-preview-/.test(item.tag_name));
    const asset = release?.assets?.find((item) => item?.name === "artovia-preview.apk");
    const url = asset?.browser_download_url;
    if (!/^https:\/\/github\.com\/waleedasm19\/artovia-site\/releases\/download\//.test(url || "")) throw new Error("no apk");
    button.href = url;
    button.removeAttribute("aria-disabled");
    button.textContent = "تنزيل تطبيق Android";
    button.setAttribute("download", "");
    status.textContent = `نسخة اختبارية · ${(asset.size / 1048576).toFixed(1)} ميغابايت`;
  }).catch(() => {
    button.href = releases;
    status.textContent = "ستظهر نسخة Android هنا بعد اكتمال البناء.";
  });
})();
