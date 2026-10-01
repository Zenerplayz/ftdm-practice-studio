# FTDM Practice Studio

A static DECA Financial Services Team Decision Making practice app with eight selectable cases, camera/photo uploads, audio recording, automatic local Whisper transcription, judge questions and a 100-point AI practice scorecard.

## Run locally

Install Node.js, then run `node serve.cjs` and open http://localhost:4173.

## Deploy with GitHub Pages

Push this repository's main branch to GitHub. In Settings → Pages, choose **GitHub Actions** as the publishing source. The included workflow publishes `dist/` on every main-branch push or manual run. No build or package installation is required. Relative asset paths support project Pages URLs.

## Use

Visitors do not enter an API key. The browser calls a judging backend, which uses the owner's `OPENROUTER_API_KEY` environment secret. Record a presentation and press Stop: a free English Whisper model downloads on first use and transcribes locally. Keep the tab open during processing. Photos, transcript and answers go through the judging backend to OpenRouter when evaluation is requested. The model and runtime download from Hugging Face and jsDelivr. Allow microphone access and use HTTPS or localhost.

## Configure the shared judging backend

GitHub Pages cannot run server code or protect a secret embedded in its JavaScript. Deploy `backend/worker.mjs` as a Cloudflare Worker:

1. Set `ALLOWED_ORIGIN` in `backend/wrangler.toml` to the exact GitHub Pages origin (for example, `https://yourname.github.io`, without the repository path).
2. From `backend/`, run `npx wrangler secret put OPENROUTER_API_KEY` and enter a fresh key at the hidden prompt. Do not paste it into source files or GitHub repository variables.
3. Run `npx wrangler deploy`.
4. Set the GitHub repository Actions variable `FTDM_API_BASE` to the Worker HTTPS origin. The Pages workflow writes this public address to `dist/config.js`.
5. Push or manually run the Pages workflow.

For local shared-key mode, copy `.env.example` to a private `.env` file and set its key. Run `node --env-file=.env serve.cjs` and open http://localhost:4174. The file is ignored by Git. No key is returned to the browser.

The backend enforces a fixed model, output limit, no provider fallbacks, and zero prompt/completion prices. It limits request size and has a best-effort in-memory request limit. Origin checks are not user authentication and do not prevent non-browser clients from invoking a public service. Keep the owner's provider limits in place.

Space Bunny Alpha is the default judge model. OpenRouter lists its retirement on October 5, 2026; the owner can change `JUDGE_MODEL` in the backend environment when necessary. Paid providers are excluded by the backend's zero-price constraint.

Use **Load test visuals & transcript** for a synthetic submission with three example visuals, a two-person presentation and answers. Judge answers appear when the questions are revealed. Switching cases preserves each case's work in tab memory; refreshing loses the session. Download feedback before refreshing if needed.

## Cases and scoring

The case library includes the official 2026 family-finance sample, a DECA customer-service adaptation, three archived 2018 FTDM adaptations, and three original practice cases. Source links and adaptation notes are shown in the app. Archived seven-indicator cases use five condensed practice learning targets with the current rubric; they are not official 2026–27 cases. The source PDFs are linked rather than republished.

The verified 2026–27 presentation structure totals 100: five performance indicators at 10 each, three solution dimensions at 8 each, three career competencies at 6 each, and overall impression at 8. AI evaluation is a practice estimate. Transcripts and photos cannot establish voice delivery, confidence, or live teamwork. No exam weighting is computed.

Sources:
- https://www.deca.org/compete/financial-services-team-decision-making
- https://www.decadirect.org/articles/case-study-of-the-week-the-customer-before-the-coin
- https://nilesnorthbusiness.weebly.com/uploads/3/7/2/1/37215033/2018_tdm_set.pdf
- https://openrouter.ai/stealth/space-bunny-alpha
- https://huggingface.co/Xenova/whisper-tiny.en

Independent practice tool; not affiliated with DECA. Case source materials retain their publishers' rights.
