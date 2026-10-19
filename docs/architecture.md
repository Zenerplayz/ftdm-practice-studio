# Judging architecture and advanced setup

`dist/judge-core.js` is shared by the browser and the optional backend. It supplies stable criterion IDs, practice scoring anchors, an output schema, and validation. For each row, the judge supplies a score, evidence, band rationale, a concrete next action, and source references. IDs must be unique and complete; scores must be integers in their criterion range. Text quotations must match the evaluated transcript or named answer. Nonzero scores need evidence; absent evidence can receive zero with an explanation. Visual references must point to supplied attachments and describe a visible detail. The app recomputes totals.

Validation establishes quote existence and output integrity, **not** semantic relevance or factual correctness. A model can still misjudge evidence or describe an image inaccurately. Human calibration remains necessary. Anchors are independent practice guidance aligned to the official 2026–27 bands, not a reprint of DECA’s judge notes.

## Formats and the 2026–27 rubric

The practice score is the roleplay portion only. Exams are not scored or weighted.

Both formats use the same 12-row, 100-point judge form published for 2026–27 Individual Series and Team Decision Making events:

| Rows | Points each | Bands |
| --- | --- | --- |
| Five performance indicators | 10 | Novice 0–3, Developing 4–6, Proficient 7–9, Exemplary 10 |
| Solution: Unique or Accurate, Practical, Effective | 8 | Novice 0–2, Developing 3–5, Proficient 6–7, Exemplary 8 |
| Career competencies: Critical Thinking, Communication, Decision Making | 6 | Novice 0–1, Developing 2–3, Proficient 4–5, Exemplary 6 |
| Overall impression | 8 | Novice 0–2, Developing 3–5, Proficient 6–7, Exemplary 8 |

Career competencies replaced the former 21st Century Skills rows. Team Decision Making events now use five performance indicators. Finance individual-series events label the first solution row Accurate (finance acumen). The 2026 FTDM sample form still labels that row Unique. The graded prompt, timers, and speaker instructions follow the selected format:

- **Individual Series:** 1 participant, 10 minutes of preparation, up to 10 minutes with the judge. No second speaker is expected.
- **Team Decision Making:** 2 participants, 30 minutes of preparation, 15 minutes for the presentation and questions. Both participants should contribute. When questions are present, each participant should answer at least one. Live teamwork is unassessed from a transcript.

Judge questions are optional for a pasted case. Official samples include two. A pasted case may include zero to four. Delivery, live poise, and confidence are **unassessed**. Communication and overall impression estimate observable content. The 100-point total is not a fully observed official competition score. Your actual case’s judge form is authoritative.

The pasted situation is the main path. An optional cluster (finance, marketing, hospitality, business management, or entrepreneurship) is context for the prompt. FTDM remains one event option, and the eight existing FTDM sample cases still load as team/finance cases. Adapted and original cases are labeled. Original source PDFs are linked rather than republished. Judge questions are hidden by practice step, not secured against source inspection.

## Optional owner-managed API

The static BYOK app works without a backend. To use the included Cloudflare Worker:

1. Configure `backend/wrangler.toml`: exact `ALLOWED_ORIGIN`, selected `JUDGE_MODEL`, and `JUDGE_STRUCTURED_OUTPUTS = "true"` only for a verified compatible model.
2. Set server-only `OPENROUTER_API_KEY` using Wrangler secrets. Never place it in frontend configuration.
3. Deploy the worker, then set `FTDM_API_BASE` to its HTTPS origin and run `node scripts/configure-api.cjs` before publishing static files.

The app loads `dist/config.js`. When an API base is present, keys and model settings are hidden and the owner service is used. The API accepts only `{submission: ...}`. It rejects client-written `messages`, chooses canonical library cases on the server, builds its own prompt and rubric, validates provider evidence, and returns the evaluated snapshot plus provenance. The browser and worker must be updated together; the old arbitrary-message request contract is intentionally rejected. The worker enforces free-provider pricing.

For local worker-handler tests, run `node --env-file=.env serve.cjs` after filling `.env` from `.env.example`; the local server exposes `/api/judge`. The ordinary local frontend remains BYOK unless explicitly configured for an owner API.

Origin checks are not authentication. The worker's five-request/minute limiter is best-effort per isolate, not global protection. Configure platform or shared rate limits and appropriate access controls before exposing an owner-funded service publicly. The default GitHub Pages deployment uses visitors' Gemini API keys directly; no owner-managed service is required. Vercel publishes the same `dist/` directory as a static site.

## Verification and optional live benchmarking

```sh
npm ci --ignore-scripts
npm run check
npm test
npx playwright install chromium
npm run test:browser
```

Unit and backend tests cover forged quotes, missing or duplicate IDs, score bounds, hostile client prompts, canonical cases, individual and team formats, and concurrent rate limiting. Browser scenarios cover timers, pasted cases, both formats, autosave and key exclusion, exports, score invalidation, provider errors, request-time edit locking, model checks, imports, and microphone-denial recovery. Browser tests intercept local assets and synthetic provider responses; they do not contact a real judging model. PR CI runs syntax, unit and backend, and browser checks. Pages deployment also requires syntax and unit and backend checks.

To run the optional **real** model benchmark, set `OPENROUTER_API_KEY` and an explicitly chosen `JUDGE_MODEL` in the environment, then run `npm run benchmark`. Use `BENCHMARK_REPEATS` (1–10, default 3) and `BENCHMARK_OUTPUT` to customize the run. It submits fictional weak, adequate, strong, and injection examples through free providers only, validates evidence, and reports repeated-run spread and ordering. No live benchmark was run for this update. Results are not a substitute for a blind, human-scored held-out set.

Model API and structured output references:

- https://openrouter.ai/docs/api/reference/overview
- https://openrouter.ai/docs/guides/features/structured-outputs
- https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties

DECA and source references:

- https://www.deca.org/compete
- https://www.decadirect.org/articles/13-things-every-advisor-should-know-for-2026-2027
- https://www.deca.org/compete/financial-services-team-decision-making
- https://cdn.prod.website-files.com/635c470cc81318fc3e9c1e0e/6a8327464898284bb03962f4_HS_Series_Guidelines.pdf
- https://cdn.prod.website-files.com/635c470cc81318fc3e9c1e0e/6a8327f7f7f637d914a9fc71_HS_TDM_Guidelines.pdf
- https://www.decadirect.org/articles/case-study-of-the-week-the-customer-before-the-coin
- https://nilesnorthbusiness.weebly.com/uploads/3/7/2/1/37215033/2018_tdm_set.pdf

Independent practice tool; not affiliated with DECA. Source materials retain their publishers' rights.
