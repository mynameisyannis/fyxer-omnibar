(function () {
  const boot = window.__fyxerBoot;
  if (!boot || !boot.shouldRedirect) return;
  const promise = window.__fyxerCommandsPromise;
  if (!promise || typeof Omnibar === "undefined") return;

  promise
    .then((data) => {
      if (window.__fyxerDidRedirect) return;
      const catalog = Omnibar.parseCatalog(data);
      const result = Omnibar.dispatch(catalog, boot.q);
      if (
        (result.type === "redirect" || result.type === "fallback") &&
        result.urls &&
        result.urls.length === 1
      ) {
        window.__fyxerDidRedirect = true;
        location.replace(result.urls[0]);
      }
    })
    .catch(() => {});
})();
