# Experiments

## Goal

Given one current study and a list of prior studies for each case, return `predicted_is_relevant` for **every** prior study. Missing prior predictions are counted as incorrect.

## Final Baseline

I implemented a deterministic rules-based scorer in Node.js with no network dependencies during inference. The design favors evaluator reliability (stable response shape, predictable runtime, no external API calls).

### Features used per prior

1. Lowercased token normalization from `study_description`
2. Stopword filtering (small hand-curated list)
3. Modality extraction (CT, MRI, mammography, PET, NM, ultrasound, XR, fallback `other`)
4. Description overlap between current and prior studies
5. Year delta from `study_date` when both sides parse as `YYYY-MM-DD`

### Relevance rules

A prior is marked relevant if any condition is true:

1. same modality and token overlap >= 1
2. token overlap >= 2 and absolute year delta <= 2
3. same modality in `{CT, MRI, mammography, PET, NM, ultrasound, XR}` and absolute year delta <= 5

## Evaluation

On `relevant_priors_public.json` (`truth_count = 27,614`):

- Metric: `correct / (correct + incorrect)` with missing predictions counted as incorrect
- No tuning on hidden/private split (to avoid leakage)
- Repro command: `npm run eval:ablations`

### Ablation results (exact)

| Variant | Correct | Incorrect | Total | Accuracy |
|---|---:|---:|---:|---:|
| modality-only | 21,411 | 6,203 | 27,614 | 0.775368 |
| overlap-only | 22,975 | 4,639 | 27,614 | 0.832006 |
| date-only | 21,425 | 6,189 | 27,614 | 0.775875 |
| combined (final API) | 21,599 | 6,015 | 27,614 | 0.782176 |

Interpretation: overlap signal is strongest in isolation on the public split, while the combined rule set was selected for broader behavior stability and modality/date robustness.

## Operational Notes

- Batch-friendly single-pass inference over all cases and priors
- Deterministic output for identical inputs
- Endpoint compatibility for both `POST /predict` and `POST /` to reduce deployment/evaluator path mismatch risk
- Lightweight logs for run traceability (`request_id`, case counts, per-case prior counts)
- Strict request validation for malformed case structures, missing ids, and invalid date formats

## What Worked Well

- Deterministic output and reproducible behavior
- Linear-time processing in total number of priors
- Contract-safe response shape for every request
- Handles large request bodies in a single pass
- Basic regression coverage for health, valid inference, and invalid payload

## Limitations Observed

- Clinical relevance is not always captured by lexical overlap
- Abbreviations and site-specific terminology remain weak spots
- Laterality and follow-up intent are under-modeled
- Short descriptions reduce signal and can over-weight recency

## Next Improvements

1. Add anatomy and synonym normalization maps
2. Calibrate thresholds on public data via grid search
3. Add stronger request schema validation and fixed fixture tests
4. Add memoization/cache for repeated `(current, prior)` comparisons
5. If rule ceiling is reached, train a lightweight supervised ranker on current hand-crafted features

## Reproducibility

- Runtime: Node.js 18+
- Local run: `npm install && npm start`
- Regression check: `npm run test:api`
