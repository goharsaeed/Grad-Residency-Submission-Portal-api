# Relevant Priors API

Node.js + Express service: `POST /predict` returns one `predicted_is_relevant` boolean per prior study.

## Run

Requires Node.js 18+.

```bash
npm install
npm start
```

Default: `http://localhost:8000`. **`GET /`** returns a short HTML page with links. **`GET /health`** returns JSON `{"status":"ok"}`. Fixed port: `PORT=3000 npm start`. If `PORT` is **not** set and 8000 is already in use, the server tries 8001, 8002, … up to 8049 and logs which port it took.

`/predict` expects **`POST`** with `Content-Type: application/json` and a body containing `cases` (see challenge spec). A `GET` to `/predict` returns **405** with a short message.

## Request / response

Top-level fields `challenge_id`, `schema_version`, `generated_at` are accepted; `cases` is required. Each case has `case_id`, `current_study`, `prior_studies` (and optional `patient_id`, `patient_name`).

Response: `{ "predictions": [ { "case_id", "study_id", "predicted_is_relevant" } ] }` — one entry per prior, any order.

JSON body limit is raised for large batches.

## Logs

Each request logs a request id, `challenge_id`, `schema_version`, case count, and per-case prior count.

## Browser console (Chrome)

Optional requests (`/favicon.ico`, `/.well-known/.../com.chrome.devtools.json`) are answered so you do not get 404s from this server. Any remaining **CSP** line in DevTools usually comes from **Chrome’s UI**, not this app.

## Verify API locally

```bash
npm run test:api
```

Starts the server on port **19287** (override with `TEST_PORT=19999 npm run test:api`), checks `GET /health`, `POST /predict` with two priors, and `POST /predict` with an invalid body (expects **400**).

## Zip / deploy

After `npm install`, ship **source + `package-lock.json`**; omit **`node_modules`**. Include `relevant_priors_public.json` only if you want offline evaluation in the archive.
