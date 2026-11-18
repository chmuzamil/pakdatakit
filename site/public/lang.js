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
