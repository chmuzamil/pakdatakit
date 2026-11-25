// Error reports to the owner's self-hosted GlitchTip (logs.chaudhery.com), sent to this
// site's own /api/errors (Nginx adds the project key and forwards it, so the CSP stays
// connect-src 'self' and GlitchTip never sees a visitor's IP). Only on pakdatakit.dev.
//
// A report holds the error's type, its stack (file, line, column, function) and the bare page
// path, never the error's message: the tools take CNICs, IBANs and phone numbers, and a message
// can quote one. Only errors from this site's own scripts are sent; browser extensions and
// in-app browsers inject scripts whose errors are not ours. At most 5 reports per page load.
(function () {
  if (location.hostname !== 'pakdatakit.dev') return;
  var origin = location.origin;
  var release = (document.currentScript && document.currentScript.getAttribute('data-release')) || undefined;
  var sent = {};
  var count = 0;

  // One of this site's own script files: on this origin (not just a URL that starts with the
  // same text) and a .js file. The page itself is not one: an in-app browser's injected script
  // reports its frames under the page's address (GlitchTip saw this on rasikh.ai).
  function own(url) {
    return typeof url === 'string' && url.indexOf(origin + '/') === 0 && /\.m?js$/.test(bare(url));
  }
  function bare(url) {
    return String(url).replace(/[?#].*$/, '');
  }

  // Chrome ("at fn (url:1:2)") and Firefox/Safari ("fn@url:1:2") stack lines, oldest call first.
  function parseStack(stack) {
    var frames = [];
    var lines = String(stack).split('\n');
    for (var i = 0; i < lines.length; i++) {
      var m =
        /^\s*at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?\s*$/.exec(lines[i]) ||
        /^\s*(.*?)@(.+?):(\d+):(\d+)\s*$/.exec(lines[i]);
      if (!m) continue;
      frames.push({
        function: m[1] || undefined,
        filename: bare(m[2]),
        lineno: Number(m[3]),
        colno: Number(m[4]),
        in_app: own(m[2]),
      });
    }
    return frames.reverse();
  }

  function hasOwnFrame(frames) {
    for (var i = 0; i < frames.length; i++) if (frames[i].in_app) return true;
    return false;
  }

  function eventId() {
    var id = '';
    for (var i = 0; i < 32; i++) id += ((Math.random() * 16) | 0).toString(16);
    return id;
  }

  function report(type, frames) {
    var last = frames[frames.length - 1] || {};
    var key = type + ':' + last.filename + ':' + last.lineno + ':' + last.colno;
    if (sent[key] || count >= 5) return;
    sent[key] = true;
    count++;
    var event = {
      event_id: eventId(),
      timestamp: Date.now() / 1000,
      platform: 'javascript',
      level: 'error',
      environment: 'production',
      release: release,
      exception: { values: [{ type: type, value: '[redacted]', stacktrace: { frames: frames } }] },
      request: { url: origin + location.pathname, headers: { 'User-Agent': navigator.userAgent } },
      tags: { host: location.hostname },
    };
    try {
      // text/plain keeps it a "simple" request: no CORS preflight.
      fetch('/api/errors', {
        method: 'POST',
        body: JSON.stringify(event),
        keepalive: true,
        credentials: 'omit',
      }).catch(function () {});
    } catch (e) {
      // Reporting must never break the page.
    }
  }

  addEventListener('error', function (e) {
    if (!e || /^Script error\.?$/i.test(e.message || '')) return;
    var err = e.error;
    var frames = err && err.stack ? parseStack(err.stack) : [];
    // No stack (a SyntaxError, or a truncated download of one of our files): the event's own
    // file/line/col is the one frame, so the report still shows which script failed.
    if (!frames.length && e.filename)
      frames = [{ filename: bare(e.filename), lineno: e.lineno || undefined, colno: e.colno || undefined, in_app: own(e.filename) }];
    if (!hasOwnFrame(frames)) return;
    report((err && err.name) || 'Error', frames);
  });

  addEventListener('unhandledrejection', function (e) {
    var reason = e && e.reason;
    var frames = reason && reason.stack ? parseStack(reason.stack) : [];
    if (!hasOwnFrame(frames)) return;
    report((reason && reason.name) || 'UnhandledRejection', frames);
  });
})();
