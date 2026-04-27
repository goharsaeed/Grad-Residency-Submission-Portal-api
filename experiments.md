# Experiments

## Baseline

**Task:** Given one current study and a list of priors per patient case, output `predicted_is_relevant` (boolean) for **every** prior—same `case_id` and `study_id` as in the request. Skipped priors count as incorrect.

**Approach:** A single **deterministic** scorer (Node.js / Express) with **no** outbound calls during inference. Each prior is scored from `study_description` and `study_date` only:

1. Normalize text to lowercase tokens (drop single-character tokens); drop a small **stopword** set (e.g. *with*, *without*, *contrast*, *screening*, *view*).
2. Map **modality** from the start of the description (CT, MRI, mammography, PET, NM, ultrasound, XR; else *other*).
3. Compute **token overlap** between current and prior descriptions and **|Δyears|** between dates when both parse as `YYYY-MM-DD`.
4. Mark **relevant** if any holds:
   - same modality **and** overlap ≥ 1 token; or
   - overlap ≥ 2 tokens **and** |Δyears| ≤ **2**; or
   - same modality, modality in {CT, MRI, mammography, PET, NM, ultrasound, XR}, **and** |Δyears| ≤ **5**.

**Serving:** `POST /predict` processes all cases and priors in one pass (large JSON body supported). `GET /health` for readiness.

**Offline metric (public split only):** On `relevant_priors_public.json`, **accuracy ≈ 0.78** under the challenge definition: correct / (correct + incorrect), with missing predictions counted incorrect. The hidden private split was not used for tuning.

## What worked

- **Throughput:** O(total priors) in memory; suitable for bulk evaluator requests and the 360s window.
- **Contract:** Response is always `{ "predictions": [ ... ] }` with one object per input prior (`case_id`, `study_id`, `predicted_is_relevant` as boolean). Request envelope fields (`challenge_id`, `schema_version`, `generated_at`) are accepted alongside `cases`.
- **Traceability:** Each request logs an id, challenge metadata, and per-case prior counts.
- **Regression:** Automated checks exercise `GET /health`, a representative `POST /predict`, and a malformed body (expect 400).

## What failed

- **Accuracy vs. labels:** Heuristics approximate radiologist relevance; **~22%** of public prior-level labels are still wrong—common misses are cross-site follow-up, laterality, and priors that matter clinically but share few surface tokens.
- **Vocabulary:** Abbreviations and site-specific strings are only weakly normalized; generic overlaps (e.g. *chest*, *brain*) can add noise.
- **Cold text:** Very short descriptions produce few tokens, so modality + recency rules dominate and can drift from intent.

## How I would improve it

1. **Lexicon:** Hand-built synonym and anatomy maps (contrast variants, spine segments, breast side) to align tokens with body region.
2. **Calibration:** Grid-search overlap and year thresholds on the **public** labels only; freeze chosen constants before any private evaluation.
3. **Cache:** Key `(current description + date hash, prior description + date hash)` → boolean to cheaply absorb evaluator retries.
4. **Quality gate:** JSON schema validation plus regression tests on fixed request/response pairs from the public pack.
5. **If rules plateau:** Train a lightweight **supervised ranker** on the same hand-crafted features (modality flags, overlap counts, date deltas)—still batchable in one forward pass, no per-prior network round-trips.
