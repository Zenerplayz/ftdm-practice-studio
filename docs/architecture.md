# Judging architecture and advanced setup

`dist/judge-core.js` is shared by browser and optional backend. It supplies stable criterion IDs, practice scoring anchors, an output schema and validation. For each row, the judge supplies a score, evidence, band rationale, concrete next action and source references. IDs must be unique and complete; scores must be integers in their criterion range. Text quotations must match the evaluated transcript or named answer. Nonzero scores need evidence; absent evidence can receive zero with an explanation. Visual references must point to supplied attachments and describe a visible detail. The app recomputes totals.

Validation establishes quote existence and output integrity, **not** semantic relevance or factual correctness. A model can still misjudge evidence or describe an image inaccurately. Human calibration remains necessary. Anchors are independent practice guidance, not official DECA performance descriptors.

The current practice structure remains five performance indicators at 10 each, three solution dimensions at 8 each, three career competencies at 6 each, and overall content readiness at 8. Delivery, live teamwork, poise and confidence are **unassessed**. Communication and overall rows estimate observable content; the 100-point total is not a fully observed official competition score. No exam weighting is computed. Your actual case's judge form is authoritative.

Cases include the 2026 family-finance sample, a DECA customer-service adaptation, three 2018 adaptations and three original practice cases. Original source PDFs are linked rather than republished. Adapted cases are labeled and are not official current-season cases. Judge questions are hidden by practice step, not secured against source inspection.

## Optional owner-managed API

The static BYOK app works without a backend. To use the included Cloudflare Worker:

1. Configure `backend/wrangler.toml`: exact `ALLOWED_ORIGIN`, selected `JUDGE_MODEL`, and `JUDGE_STRUCTURED_OUTPUTS = "true"` only for a verified compatible model.
2. Set server-only `OPENROUTER_API_KEY` using Wrangler secrets. Never place it in frontend configuration.
3. Deploy the worker, then set `FTDM_API_BASE` to its HTTPS origin and run `node scripts/configure-api.cjs` before publishing static files.

The app loads `dist/config.js`. When an API base is present, keys/model settings are hidden and the owner service is used. The new API accepts only `{submission: ...}`. It rejects client-written `messages`, chooses canonical library cases on the server, builds its own prompt/rubric, validates provider evidence, and returns the evaluated snapshot plus provenance. Browser and worker must be updated together; the old arbitrary-message request contract is intentionally rejected. The worker enforces free-provider pricing.

For local worker-handler tests, run `node --env-file=.env serve.cjs` after filling `.env` from `.env.example`; the local server exposes `/api/judge`. The ordinary local frontend remains BYOK unless explicitly configured for an owner API.

Origin checks are not authentication. The worker's five-request/minute limiter is best-effort per isolate, not global protection. Configure platform/shared rate limits and appropriate access controls before exposing an owner-funded service publicly. The default GitHub Pages deployment uses visitors' Gemini API keys directly; no owner-managed service is required.

## Verification and optional live benchmarking

```sh
npm ci --ignore-scripts
npm run check
npm test
npx playwright install chromium
npm run test:browser
```

Unit/backend tests cover forged quotes, missing/duplicate IDs, score bounds, hostile client prompts, canonical cases and concurrent rate limiting. Browser scenarios cover timers, custom cases, autosave/key exclusion, exports, score invalidation, provider errors, request-time edit locking, model checks, imports and microphone-denial recovery. Browser tests intercept local assets and synthetic provider responses; they do not contact a real judging model. PR CI runs syntax, unit/backend and browser checks; Pages deployment also requires syntax and unit/backend checks.

To run the optional **real** model benchmark, set `OPENROUTER_API_KEY` and an explicitly chosen `JUDGE_MODEL` in the environment, then run `npm run benchmark`. Use `BENCHMARK_REPEATS` (1–10, default 3) and `BENCHMARK_OUTPUT` to customize the run. It submits fictional weak/adequate/strong/injection examples through free providers only, validates evidence, and reports repeated-run spread and ordering. No live benchmark was run for this update. Results are not a substitute for a blind, human-scored held-out set.

Model API/structured output references:
- https://openrouter.ai/docs/api/reference/overview
- https://openrouter.ai/docs/guides/features/structured-outputs
- https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties

DECA/source references:
- https://www.deca.org/compete/financial-services-team-decision-making
- https://www.decadirect.org/articles/case-study-of-the-week-the-customer-before-the-coin
- https://nilesnorthbusiness.weebly.com/uploads/3/7/2/1/37215033/2018_tdm_set.pdf

Independent practice tool; not affiliated with DECA. Source materials retain their publishers' rights.
