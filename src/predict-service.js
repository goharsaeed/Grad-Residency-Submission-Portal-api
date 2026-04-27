import { randomBytes } from "crypto";
import { scoreCase } from "./model.js";

export const PREDICT_HELP_RESPONSE = {
  endpoint: "/predict",
  method: "POST",
  content_type: "application/json",
  detail: "Send a JSON body including a top-level \"cases\" array.",
  example: {
    cases: [
      {
        case_id: "case-1",
        current_study: {
          study_id: "current-1",
          study_description: "MRI BRAIN WITHOUT CONTRAST",
          study_date: "2026-03-08",
        },
        prior_studies: [
          {
            study_id: "prior-1",
            study_description: "MRI BRAIN WITHOUT CONTRAST",
            study_date: "2025-01-02",
          },
        ],
      },
    ],
  },
};

function isValidDate(raw) {
  if (raw == null || raw === "") return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(String(raw).trim());
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function hasNonEmptyId(value) {
  return value != null && String(value).trim() !== "";
}

export function validatePredictBody(body) {
  const errors = [];

  if (!isPlainObject(body)) {
    return { ok: false, errors: ["Request body must be a JSON object."] };
  }

  if (!Array.isArray(body.cases)) {
    return { ok: false, errors: ["`cases` must be an array."] };
  }

  for (let i = 0; i < body.cases.length; i++) {
    const c = body.cases[i];
    const casePath = `cases[${i}]`;
    if (!isPlainObject(c)) {
      errors.push(`${casePath} must be an object.`);
      continue;
    }
    if (!hasNonEmptyId(c.case_id)) {
      errors.push(`${casePath}.case_id is required and must be non-empty.`);
    }
    if (!isPlainObject(c.current_study)) {
      errors.push(`${casePath}.current_study must be an object.`);
    } else {
      const current = c.current_study;
      if (!hasNonEmptyId(current.study_id)) {
        errors.push(`${casePath}.current_study.study_id is required and must be non-empty.`);
      }
      if (!isValidDate(current.study_date)) {
        errors.push(`${casePath}.current_study.study_date must be YYYY-MM-DD when provided.`);
      }
    }

    if (!Array.isArray(c.prior_studies)) {
      errors.push(`${casePath}.prior_studies must be an array.`);
      continue;
    }
    for (let j = 0; j < c.prior_studies.length; j++) {
      const prior = c.prior_studies[j];
      const priorPath = `${casePath}.prior_studies[${j}]`;
      if (!isPlainObject(prior)) {
        errors.push(`${priorPath} must be an object.`);
        continue;
      }
      if (!hasNonEmptyId(prior.study_id)) {
        errors.push(`${priorPath}.study_id is required and must be non-empty.`);
      }
      if (!isValidDate(prior.study_date)) {
        errors.push(`${priorPath}.study_date must be YYYY-MM-DD when provided.`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

export function predictFromBody(body) {
  const requestId = randomBytes(6).toString("hex");
  const challengeId = body.challenge_id ?? "relevant-priors-v1";
  const schemaVersion = body.schema_version ?? 1;
  const cases = body.cases;

  console.log(
    `[predict] request_id=${requestId} challenge_id=${challengeId} schema_version=${schemaVersion} case_count=${cases.length}`,
  );

  const predictions = [];
  for (const c of cases) {
    const priors = Array.isArray(c.prior_studies) ? c.prior_studies : [];
    console.log(
      `[predict] request_id=${requestId} case_id=${c.case_id} prior_count=${priors.length}`,
    );
    const casePreds = scoreCase(c.current_study, priors);
    for (const item of casePreds) {
      predictions.push({
        case_id: String(c.case_id),
        study_id: String(item.study_id),
        predicted_is_relevant: Boolean(item.predicted_is_relevant),
      });
    }
  }
  return { predictions };
}

