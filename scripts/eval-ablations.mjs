import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { predictRelevant, RULE_VARIANTS } from "../src/model.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function keyOf(caseId, studyId) {
  return `${String(caseId)}::${String(studyId)}`;
}

function asStudy(studyId) {
  return { study_id: String(studyId) };
}

const payloadPath = path.join(root, "relevant_priors_public.json");
const payload = JSON.parse(await fs.readFile(payloadPath, "utf8"));
const truth = payload.truth ?? [];
const cases = payload.cases ?? [];

const truthMap = new Map();
for (const row of truth) {
  truthMap.set(keyOf(row.case_id, row.study_id), Boolean(row.is_relevant_to_current));
}

const variants = [
  RULE_VARIANTS.modality_only,
  RULE_VARIANTS.overlap_only,
  RULE_VARIANTS.date_only,
  RULE_VARIANTS.combined,
];

const stats = new Map(variants.map((v) => [v, { correct: 0, incorrect: 0, total: 0 }]));

for (const c of cases) {
  const caseId = c.case_id;
  const current = c.current_study ?? {};
  for (const prior of c.prior_studies ?? []) {
    const priorStudy = asStudy(prior.study_id);
    const k = keyOf(caseId, priorStudy.study_id);
    const actual = truthMap.get(k);
    if (actual == null) {
      continue;
    }
    for (const v of variants) {
      const predicted = predictRelevant(
        String(current.study_description ?? ""),
        current.study_date,
        String(prior.study_description ?? ""),
        prior.study_date,
        v,
      );
      const s = stats.get(v);
      s.total += 1;
      if (predicted === actual) s.correct += 1;
      else s.incorrect += 1;
    }
  }
}

console.log("variant,correct,incorrect,total,accuracy");
for (const v of variants) {
  const s = stats.get(v);
  const accuracy = s.total === 0 ? 0 : s.correct / s.total;
  console.log(`${v},${s.correct},${s.incorrect},${s.total},${accuracy.toFixed(6)}`);
}
