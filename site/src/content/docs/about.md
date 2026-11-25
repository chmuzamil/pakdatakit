---
title: About and privacy
description: Who makes PakDataKit, how the tools handle what you type, and what this site measures.
---

PakDataKit is an open-source (MIT) library of Pakistani data utilities, with the same behaviour in TypeScript, Python, Dart/Flutter, .NET and PHP/Laravel. It is made by [Muzamil Chaudhery](https://github.com/chmuzamil) and contributors; the source, issues and every dataset's sources are on [GitHub](https://github.com/chmuzamil/pakdatakit).

## What happens to what you type

Nothing leaves your device. Every tool and example on this site runs the library in your browser:

- No input is sent to a server, stored, or logged. The site's security policy (`connect-src 'self'`) stops the page from sending data anywhere except this site, and the tools don't send any.
- Tool state that you can share lives after the `#` in the address, which browsers never send to a server. On the CNIC and IBAN checkers the address changes only when you press **Copy share link**.
- The checks are format checks. A valid CNIC or IBAN is well formed; this site cannot and does not verify identities or accounts.

## What this site measures

We use [Umami](https://umami.is/), self-hosted, served from this site's own address (`/a.js`). It records:

- the page path (without the query string or the `#` part), the referring site, browser, device type, country and language;
- a `tool_run` event with the tool's name when you first use a tool, and `code_copy` when you copy example code.

It never records what you type, uses no cookies, and respects your browser's Do Not Track setting.

When one of this site's own scripts fails, a short error report goes to our self-hosted [GlitchTip](https://glitchtip.com/), again through this site's own address (`/api/errors`). It holds the error's type, where in our code it happened, the page path and your browser's user agent. It never includes the error's message, which could quote something you typed, and your IP address is not passed on. Errors from browser extensions and other scripts that aren't ours are not sent.

## Licence and attribution

The code, the datasets in `data/` and the shared test vectors are MIT licensed. If you copy or adapt a substantial part of PakDataKit, in any language, keep the copyright notice: Copyright (c) 2026 Muzamil Chaudhery and PakDataKit Contributors.
