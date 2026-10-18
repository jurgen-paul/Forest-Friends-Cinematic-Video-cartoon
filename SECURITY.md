# Security Policy

## Supported Versions

The following table details which release versions of **Forest Friends Cinematic Video Scorer** receive security and vulnerability patches:

| Version | Supported          | Security Maintenance Tier |
| ------- | ------------------ | ------------------------- |
| 1.0.x   | :white_check_mark: | Active (High & Critical)   |
| < 1.0   | :x:                | End of Life (EOL)         |

---

## 1. Zero Client Secrets & Server-Side Proxy Isolation

- **Gemini & Lyria Credentials Protection**:
  All interactions with Google Gemini and Google Lyria models use server-side authentication (`@google/genai` on Node.js / Express). No API keys, service accounts, or private bearer tokens are ever exposed to the client-side JavaScript bundle, browser local storage, or network traffic inspectable by end-users.
- **Client Access Control**:
  The browser front-end invokes the `/api/score` endpoint via authenticated reverse proxy routes. Request payloads are strictly validated against schema bounds (duration between 5s and 180s, text length bounded to 2,048 characters).
- **Environment Isolation**:
  Secrets are loaded strictly at process initialization via encrypted container secret mounts and environment configurations (`process.env.GEMINI_API_KEY`).

---

## 2. Audio Engine Sandboxing & Memory Safety

- **Procedural WAV Synthesizer**:
  The fallback audio synthesis engine (`src/server/audioScoreGenerator.ts`) executes in pure Node.js memory buffers. All sample indices, buffer lengths, and PCM clamp calculations are checked against mathematical boundaries (`Math.max(-1, Math.min(1, sample))`) before writing 16-bit integer values to avoid heap buffer overruns.
- **Hermetic Media Processing**:
  Custom video and audio transcoding operations utilize client-side WebAssembly (FFmpeg Wasm) isolated within the browser's sandbox environment with no root filesystem permissions.

---

## 3. Web & Network Security Controls

- **Content Security Policy (CSP)**:
  ```http
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' blob: data:; connect-src 'self' https://generativelanguage.googleapis.com; object-src 'none'; frame-ancestors 'none';
  ```
- **Cross-Origin Resource Sharing (CORS)**:
  Cross-origin requests are restricted to validated AI Studio preview and development origins.
- **HTTP Security Headers**:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `Referrer-Policy: strict-origin-when-cross-origin`

---

## 4. Supply Chain Security & SSF Compliance

- **Reproducible Builds (SLSA Level 3)**:
  All production artifacts are compiled via automated, isolated GitHub Actions workflows generating signed in-toto provenance statements.
- **Dependency Pinning & Scanning**:
  Every npm package is pinned to exact versions in `package-lock.json` and verified with cryptographic SHA-512 subresource hashes. Automated daily scans run via Dependabot and OpenSSF Scorecards.
- **Static Application Security Testing (SAST)**:
  Continuous CodeQL workflows inspect every pull request for injection vulnerabilities, unsafe deserialization, and memory leaks.

---

## 5. Reporting a Vulnerability

We prioritize responsible disclosure and appreciate the security community's assistance in keeping our platform safe.

### Reporting Process:
1. **Email**: Send vulnerability reports directly to `oistarsentertainment@gmail.com` with the subject line `[SECURITY] Vulnerability Report: Forest Friends Scorer`.
2. **Details to Include**:
   - Vulnerability description and impact analysis.
   - Proof of Concept (PoC) code or step-by-step reproduction instructions.
   - Component affected (`/api/score`, frontend player, synthesizer, or dependencies).
   - Any proposed remediation or patches.
3. **Response Timelines**:
   - **Initial Acknowledgement**: Within 24 hours.
   - **Triage & Severity Assessment**: Within 72 hours.
   - **Fix Deployment & Advisory Release**: Critical vulnerabilities patched within 7 calendar days; non-critical within 30 days.

*Please do NOT create public GitHub issues or forum posts regarding suspected security flaws before coordinated disclosure has completed.*
