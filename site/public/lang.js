// ?lang=python (or ts, py, dart, cs, csharp, dotnet, php) chooses the language
// of every code tab on the site, and is remembered like a tab click.
(function () {
  try {
    var key = new URLSearchParams(location.search).get('lang');
    if (!key) return;
    var labels = {
      ts: 'TypeScript',
      typescript: 'TypeScript',
      js: 'TypeScript',
      py: 'Python',
      python: 'Python',
      dart: 'Dart',
      cs: 'C#',
      csharp: 'C#',
      dotnet: 'C#',
      php: 'PHP',
    };
    var label = labels[key.toLowerCase()];
    if (label) localStorage.setItem('starlight-synced-tabs__lang', label);
  } catch (e) {
    // Storage blocked: the tabs keep their default.
  }
})();

// ?q=iban opens the site search with that query (the SearchAction in the
// site's structured data points here).
(function () {
  var q;
  try {
    q = new URLSearchParams(location.search).get('q');
  } catch (e) {
    return;
  }
  if (!q) return;
  document.addEventListener('DOMContentLoaded', function () {
    var open = document.querySelector('button[data-open-modal]');
    if (!open) return;
    var tries = 0;
    (function start() {
      // The button is enabled once Starlight's search script has loaded.
      if (open.disabled && tries++ < 50) return setTimeout(start, 100);
      open.click();
      (function fill() {
        var input = document.querySelector('site-search dialog input');
        if (!input && tries++ < 100) return setTimeout(fill, 100);
        if (!input) return;
        input.value = q;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      })();
    })();
  });
})();
