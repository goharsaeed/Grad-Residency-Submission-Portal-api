# Relevant Priors — Write-up

## Approach

Deterministic rules on study descriptions and dates: tokenize descriptions (with a small stopword list), infer coarse modality (CT, MRI, mammography, PET, NM, ultrasound, XR, other), then label a prior as relevant when:

- same modality and at least one overlapping token, or
- at least two overlapping tokens and the prior is within about two years, or
- same modality in a high-signal modality set and the prior is within about five years.

Every prior in the request receives exactly one prediction.

## Implementation

- **Stack:** Node.js, Express.
- **Endpoint:** `POST /predict` — single pass over all cases and priors, no outbound HTTP for scoring.
- **Ops:** request id plus case and prior counts in logs.

## Experiments (public split)

Using the challenge’s public labeled split, the above rules reach about **0.78** accuracy (exact value depends on the same metric as the challenge: missing priors count as wrong). The private split is not used here.

## Next steps

- Richer synonym / anatomy token lists and institution-specific aliases.
- Threshold tuning (overlap and year windows) using the public labeled split.
- In-memory memoization for repeated `(current_study, prior_study)` pairs.
- Stricter validation and automated contract tests on malformed payloads.
