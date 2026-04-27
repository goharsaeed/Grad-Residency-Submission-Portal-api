# Relevant Priors API

Node.js API for the challenge evaluator. The prediction contract is:

- Input: cases with one current study + many prior studies
- Output: one boolean `predicted_is_relevant` per prior study

## Assessment Submission

Use the base deployment URL as the endpoint:

- `https://grad-residency-submission-portal.netlify.app`

Evaluator compatibility is built in:

- `POST /predict` (primary route)
- `POST /` (fallback alias for evaluators that post to root)
- trailing slash variants are accepted

## Requirements

- Node.js 18+
- npm

## Quick Start (Localhost)

```bash
npm install
npm start
```

Default server URL is `http://localhost:8000`.

If `PORT` is not set and `8000` is busy, the app automatically tries the next ports (`8001` ... `8049`).

Set a fixed port if needed:

```bash
PORT=3000 npm start
```

## Endpoints

- `GET /` - small API landing page with test links
- `GET /health` - readiness response: `{"status":"ok"}`
- `GET /predict` - help JSON with request format example
- `POST /predict` - main inference endpoint
- `POST /` - compatibility alias for evaluators that post to root

## Request Schema (POST)

The API accepts a top-level JSON object containing:

- `cases` (required)
- `challenge_id`, `schema_version`, `generated_at` (optional passthrough metadata)

Each case should include:

- `case_id`
- `current_study`
- `prior_studies` (array)
- optional identifiers such as `patient_id`, `patient_name`

Validation is strict and returns `400` with `details` when malformed input is provided. Common validation errors include:

- missing `case_id`
- missing `current_study.study_id` or `prior_studies[i].study_id`
- non-array `prior_studies`
- invalid date format (must be `YYYY-MM-DD` when supplied)

## Response Schema

The response always follows:

```json
{
  "predictions": [
    {
      "case_id": "string",
      "study_id": "string",
      "predicted_is_relevant": true
    }
  ]
}
```

Exactly one prediction is returned for each input prior study.

## Local Verification

Run the local regression checks:

```bash
npm run test:api
```

This test suite verifies:

- `GET /health`
- valid `POST /predict`
- invalid request shape returns `400`

## Deployment Notes

This repository is configured for Netlify Functions. For assessment submission:

- Submit the base site URL (do not append `/predict` unless explicitly required)
- Do not include `node_modules` in zipped materials
- Include source files and `package-lock.json`
- Express and Netlify paths share one prediction core (`src/predict-service.js`) to keep behavior identical across environments

### Final pre-submit checklist

- `GET /health` returns `200` and `{"status":"ok"}`
- `GET /predict` returns request help JSON
- `POST /predict` returns `{"predictions":[...]}`
- same `POST` request also works on `/` for evaluator compatibility

## Logging

For each inference request, logs include:

- generated request id
- `challenge_id` and `schema_version`
- total case count
- per-case prior count
