# FTDM Practice Studio

A student-built practice room for DECA Financial Services Team Decision Making: choose a case, present with a teammate and receive an evidence-backed content scorecard.

**[Open the app](https://zenerplayz.github.io/ftdm-practice-studio/)** · **[View an example scorecard](https://zenerplayz.github.io/ftdm-practice-studio/example.html)** · **[Official FTDM resources](https://www.deca.org/compete/financial-services-team-decision-making)**

Project by Sebastian Schuermeyer. Independent practice tool; not affiliated with DECA. AI feedback is a practice estimate, not an official competition score.

## Features

- Eight sourced/adapted practice cases and independently saved custom cases.
- Preparation and interview timers, uploaded visuals and local audio transcription.
- Google Gemini API-key grading with validated rubric rows and evidence quotations.
- Optional device drafts, session import/export and feedback tied to the evaluated submission.
- A no-key example scorecard for exploring the feedback format.

## Grade with Gemini

1. [Create an API key in Google AI Studio](https://aistudio.google.com/apikey).
2. Open **Judge settings**, keep **Google Gemini** selected and paste your key.
3. Use **Check available models** to confirm model-list access. The initial model is `gemini-3.8-flash`; the app never replaces it automatically.
4. Present or load the synthetic sample, answer both questions, review the transcript and evaluate.

Your key stays in tab memory and goes directly to Google in the `x-goog-api-key` header. It is excluded from device drafts and exports. Reloading, switching providers or **Clear API key** removes it. No Google sign-in is required.

Google receives the submitted transcript, answers and visuals when grading. Audio transcription runs locally after downloading an English Whisper model. Free-tier access depends on your model, project and region; billing-enabled projects can incur API charges. Check [Google's quota and billing guidance](https://ai.google.dev/gemini-api/docs/billing). Model listing does not prove remaining grading quota.

OpenRouter is available as an optional alternative. Choose an available model explicitly; no retired model is preselected. Owner-managed services are covered in [advanced setup](docs/architecture.md).

## Run locally

Use Node.js 22 or newer:

```sh
node serve.cjs
```

Open [localhost:4174](http://localhost:4174). The static app has no runtime package dependencies. Microphone access requires HTTPS or localhost.

## Development checks

```sh
npm ci --ignore-scripts
npm run check
npm test
npx playwright install chromium
npm run test:browser
```

Automated provider tests use synthetic responses and never spend API credits. GitHub Actions validates pull requests; merging `main` publishes `dist/` through GitHub Pages. Live model quality, real microphone accuracy and phone-specific behavior require separate evaluation.

## Repository map

| Path | Purpose |
| --- | --- |
| `dist/` | Browser source and the exact static files published to Pages |
| `backend/` | Optional owner-managed judging service |
| `scripts/` | Configuration, syntax checks and optional benchmarking |
| `tests/` | Rubric, provider, HTTP and browser regression checks |
| `docs/architecture.md` | Scoring contract, case provenance and advanced setup |

## Practice limits

The content score totals 100. Live delivery, teamwork, poise and confidence are unassessed from transcripts and photos. Quotation validation checks that cited text exists; it cannot prove that an AI interpretation is correct. Official event guidelines and the actual judge form take precedence.

Enable **Save drafts on this device** or download a session to preserve work across refreshes. Device drafts can include transcripts, visuals and feedback; clear them on shared devices. API keys and audio are never saved in those drafts.

Case adaptations are labeled, original source PDFs are linked rather than republished, and their publishers retain their rights. See [case sources and architecture](docs/architecture.md).
