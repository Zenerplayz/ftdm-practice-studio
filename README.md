# FTDM Practice Studio

A static DECA Financial Services Team Decision Making practice app with eight selectable cases, camera/photo uploads, audio recording, automatic local Whisper transcription, judge questions and a 100-point AI practice scorecard.

## Run locally

Install Node.js, then run `node serve.cjs` and open http://localhost:4173.

## Deploy with GitHub Pages

Push this repository's main branch to GitHub. In Settings → Pages, choose **GitHub Actions** as the publishing source. The included workflow publishes `dist/` on every main-branch push or manual run. No build or package installation is required. Relative asset paths support project Pages URLs.

## Use

Each person enters their own OpenRouter API key in the setup screen. The key stays in that tab's memory and is sent directly to OpenRouter only when scoring; it is not saved to local storage or sent to this site. Record a presentation and press Stop: a free English Whisper model downloads on first use and transcribes locally. Keep the tab open during processing. Photos, transcript and answers go to OpenRouter when evaluation is requested. The model and runtime download from Hugging Face and jsDelivr. Allow microphone access and use HTTPS or localhost.

## OpenRouter setup

Each user needs an OpenRouter key and should choose a model available to that key. The default is `stealth/space-bunny-alpha`; availability, free-model limits and provider retention policies can change. Do not share API keys. GitHub Pages is static, so there is no server environment variable to configure for judging.

Space Bunny Alpha is the default judge model. OpenRouter lists its retirement on October 5, 2026; the owner can change `JUDGE_MODEL` in the backend environment when necessary. Paid providers are excluded by the backend's zero-price constraint.

Use **Load test visuals & transcript** for a synthetic submission with three example visuals, a two-person presentation and answers. Judge answers appear when the questions are revealed. Switching cases preserves each case's work in tab memory; refreshing loses the session. Download feedback before refreshing if needed.

## Cases and scoring

The case library includes the official 2026 family-finance sample, a DECA customer-service adaptation, three archived 2018 FTDM adaptations, and three original practice cases. Source links and adaptation notes are shown in the app. Archived seven-indicator cases use five condensed practice learning targets with the current rubric; they are not official 2026–27 cases. The source PDFs are linked rather than republished.

The verified 2026–27 presentation structure totals 100: five performance indicators at 10 each, three solution dimensions at 8 each, three career competencies at 6 each, and overall impression at 8. AI evaluation is a practice estimate. Transcripts and photos cannot establish voice delivery, confidence, or live teamwork. No exam weighting is computed.

Sources:
- https://www.deca.org/compete/financial-services-team-decision-making
- https://www.decadirect.org/articles/case-study-of-the-week-the-customer-before-the-coin
- https://nilesnorthbusiness.weebly.com/uploads/3/7/2/1/37215033/2018_tdm_set.pdf
- https://openrouter.ai/settings/keys
- https://openrouter.ai/stealth/space-bunny-alpha
- https://huggingface.co/Xenova/whisper-tiny.en

Independent practice tool; not affiliated with DECA. Case source materials retain their publishers' rights.
