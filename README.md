# DECA Roleplay Practice Studio

A student-built practice room for DECA roleplays. Paste your own case, choose Individual Series or Team Decision Making, present, and receive an evidence-backed content scorecard.

**[Open the app](https://zenerplayz.github.io/ftdm-practice-studio/)** · **[View an example scorecard](https://zenerplayz.github.io/ftdm-practice-studio/example.html)** · **[DECA competitive events](https://www.deca.org/compete)**

Project by Sebastian Schuermeyer. Independent practice tool; not affiliated with DECA. The score is a practice estimate, not an official competition score.

## Practice a roleplay

1. Paste the situation, five performance indicators, and any judge questions you have permission to use. That is the main path.
2. Choose **Individual Series** (1 participant, 10 minutes to prepare, up to 10 minutes to present) or **Team Decision Making** (2 participants, 30 minutes to prepare, 15 minutes for the presentation and questions).
3. Optionally choose an event or cluster for context: finance, marketing, hospitality, business management, entrepreneurship, or Financial Services Team Decision Making (FTDM).
4. Present or type a transcript, answer the judge questions if you included any, and evaluate.

FTDM sample cases remain available when that event is selected. Official 2026–27 Individual Series and Team Decision Making forms both use five performance indicators. The practice rubric follows those forms: five indicators at 10 points, three solution rows at 8, three career competencies at 6, and overall impression at 8. Finance individual-series events score the first solution row as Accurate instead of Unique. Career competencies replaced the former 21st Century Skills rows. [DECA’s 2026–27 updates](https://www.decadirect.org/articles/13-things-every-advisor-should-know-for-2026-2027) describe the change. Timers, the number of speakers, the rubric, and the grading prompt follow the format you pick.

Live delivery, poise, and confidence are unassessed from a transcript. Live teamwork is unassessed for team events. Your event’s official judge form takes precedence.

## Grade with Gemini

1. [Create an API key in Google AI Studio](https://aistudio.google.com/apikey).
2. Open **Judge settings**, keep **Google Gemini** selected and paste your key.
3. Use **Check available models** to confirm model-list access. The initial model is `gemini-3.8-flash`; the app never replaces it automatically.
4. Present or load the synthetic sample, review the transcript, and evaluate.

Your key stays in tab memory and goes directly to Google in the `x-goog-api-key` header. It is excluded from device drafts and exports. Reloading, switching providers, or **Clear API key** removes it. No Google sign-in is required. The key is sent only to Google.

Google receives the submitted transcript, answers, and visuals when grading. Audio transcription runs locally after downloading an English Whisper model. Free-tier access depends on your model, project, and region; billing-enabled projects can incur API charges. Check [Google's quota and billing guidance](https://ai.google.dev/gemini-api/docs/billing). Model listing does not prove remaining grading quota.

OpenRouter is available as an optional alternative. Choose an available model explicitly; no retired model is preselected. Owner-managed services are covered in [advanced setup](docs/architecture.md).

## Run locally

Use Node.js 22 or newer:

```sh
node serve.cjs
```

Open [localhost:4174](http://localhost:4174). The static app has no runtime package dependencies. Microphone access requires HTTPS or localhost.

## Deploy

`dist/` is the static site. GitHub Actions publishes that directory to GitHub Pages when `main` is updated.

Vercel serves the same directory with no build step. [`vercel.json`](vercel.json) sets:

- `outputDirectory`: `dist`
- `buildCommand`: `null`
- `framework`: `null`

## Development checks

```sh
npm ci --ignore-scripts
npm run check
npm test
npx playwright install chromium
npm run test:browser
```

Automated provider tests use synthetic responses and never spend API credits. GitHub Actions validates pull requests; merging `main` publishes `dist/` through GitHub Pages. Live model quality, real microphone accuracy, and phone-specific behavior require separate evaluation.

## Repository map

| Path | Purpose |
| --- | --- |
| `dist/` | Browser source and the static files published to GitHub Pages and Vercel |
| `vercel.json` | Static Vercel deployment; output directory is `dist` |
| `backend/` | Optional owner-managed judging service |
| `scripts/` | Configuration, syntax checks and optional benchmarking |
| `tests/` | Rubric, provider, HTTP and browser regression checks |
| `docs/architecture.md` | Scoring contract, case provenance and advanced setup |

## Practice limits

The content score totals 100. Live delivery, poise, and confidence are unassessed from transcripts and photos. Teamwork is unassessed for team events. Quotation validation checks that cited text exists; it cannot prove that an AI interpretation is correct. Official event guidelines and the actual judge form take precedence.

Enable **Save drafts on this device** or download a session to preserve work across refreshes. Device drafts can include transcripts, visuals, and feedback; clear them on shared devices. API keys and audio are never saved in those drafts.

Case adaptations are labeled, original source PDFs are linked rather than republished, and their publishers retain their rights. See [case sources and architecture](docs/architecture.md).
