# FTDM Practice Studio

An independent DECA Financial Services Team Decision Making practice app: eight source/adapted cases, custom cases, visuals, local audio transcription, judge questions and an evidence-backed 100-point content practice estimate.

## Run

Use Node.js 20 or newer. Run `node serve.cjs`, then open http://localhost:4174. The static app has no runtime package dependencies. Microphone access needs HTTPS or localhost.

Choose a case and **Start practice** to begin the 15-minute interview timer. You can type, record or import audio. Finish the presentation, answer both questions, review transcription errors, then evaluate. Preparation has a separate 30-minute timer that pauses and resumes without resetting. Starting the interview pauses preparation.

Open **Judge settings**, leave **Google Gemini** selected, and [create an API key in Google AI Studio](https://aistudio.google.com/apikey). Paste the key and click **Check available models** to verify model-list access. The default is `gemini-3.8-flash`; the model is never replaced automatically. Review your transcript, answer both questions, then evaluate. Google receives the transcript, answers and attached visuals when grading. Audio transcription remains local.

The key stays in this tab's memory, is sent directly to Google in the `x-goog-api-key` header, and is excluded from device drafts and downloads. **Clear API key**, switching providers, or reloading clears it. Do not put personal keys in source or public configuration. FTDM does not require a Google sign-in or ChatGPT subscription.

Free-tier availability and quotas depend on the model, project and region. A billing-enabled Google project may incur API charges; this app cannot enforce a free-only Gemini billing tier. Check your [quota and billing](https://ai.google.dev/gemini-api/docs/billing) in AI Studio. Model listing does not prove remaining quota or grading access. On quota, key, blocked-output or incomplete-output errors, the draft remains available and retries are manual.

**OpenRouter** remains available in the provider selector with its existing model checks and free-provider routing. Switching providers clears the key so it cannot be sent to a different service. Configured owner-managed API deployments continue to use their owner's backend.

Gemini uses Google's [generateContent API](https://ai.google.dev/api/generate-content) with structured JSON output and the same rubric, exact-quotation checks and score validation as the existing grader. Automated checks use synthetic responses; live Gemini grading requires your key and has not been verified.

## Drafts, recordings and results

- Each case keeps its own transcript, visuals, answers, timers and feedback. Custom cases get independent IDs and show the exact instructions used for scoring.
- **Download session** saves all current drafts as a version 2 JSON file. **Import a saved session** merges the file, replacing matching cases. Import is validated before any drafts change.
- **Save drafts on this device** is optional local storage. It includes transcripts, visuals and feedback; API keys and audio are excluded. Refresh restores saved drafts. If storage is unavailable/full, download a session instead. Disabling autosave or **Clear saved device draft** removes stored data without clearing the open session.
- Without autosave or a downloaded session, refreshing loses work. On shared devices, clear stored drafts after practicing.
- **Save recording** retains an audio copy, including when transcription fails. You can cancel transcription, retry, or paste a corrected transcript. English Whisper runs locally after downloading its model/runtime from Hugging Face and jsDelivr. The automated tests do not measure real microphone or transcription accuracy.
- **Start a fresh attempt** asks before clearing a nonempty attempt. Loading the synthetic sample creates a separate sample case instead of overwriting your family-finance draft.
- Feedback records the evaluated submission, actual returned model, prompt/rubric versions and timestamp. Edits mark results **out of date** and disable feedback download until re-evaluation. Downloads describe the evaluated snapshot, not whatever happens to be in the editor later.

Visuals are resized before judging; use at most six images, 8 MB each. The aggregate judging payload is capped at 4 MB. Audio imports are limited to 100 MB and 30 minutes. Photos, transcript and answers go to the selected provider when evaluated; audio is transcribed locally. Provider retention policies may differ.

## Judging contract

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

Origin checks are not authentication. The worker's five-request/minute limiter is best-effort per isolate, not global protection. Configure platform/shared rate limits and appropriate access controls before exposing an owner-funded service publicly. No new hosting service, account, secret or Vercel deployment is configured by this update. The separate Vercel judging deployment was not identified during the audit.

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
