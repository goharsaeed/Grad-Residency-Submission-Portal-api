const STOPWORDS = new Set([
  "with",
  "without",
  "and",
  "the",
  "wo",
  "w",
  "con",
  "contrast",
  "cntrst",
  "screen",
  "screening",
  "view",
  "views",
  "min",
  "diag",
  "diagnostic",
]);

const HIGH_RELEVANCE_MODALITIES = new Set(["ct", "mri", "mam", "pet", "nm", "us", "xr"]);

function safeDate(raw) {
  if (raw == null || raw === "") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(raw).trim());
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function tokens(text) {
  const cleaned = String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ");
  const out = new Set();
  for (const token of cleaned.split(/\s+/)) {
    if (token.length > 1 && !STOPWORDS.has(token)) out.add(token);
  }
  return out;
}

function modality(text) {
  const lowered = String(text || "").toLowerCase().trim();
  if (lowered.startsWith("ct")) return "ct";
  if (lowered.startsWith("mri")) return "mri";
  if (lowered.startsWith("mam") || lowered.includes("mamm")) return "mam";
  if (lowered.startsWith("pet")) return "pet";
  if (lowered.startsWith("nm")) return "nm";
  if (lowered.startsWith("us") || lowered.includes("ultrasound")) return "us";
  if (lowered.startsWith("xr") || lowered.includes("xray") || lowered.includes("chest pa")) return "xr";
  return "other";
}

function yearDelta(currentDate, priorDate) {
  const current = safeDate(currentDate);
  const prior = safeDate(priorDate);
  if (current == null || prior == null) return null;
  const ms = Math.abs(current - prior);
  return ms / (365.25 * 24 * 3600 * 1000);
}

function setIntersectionSize(a, b) {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n;
}

export function predictRelevant(
  currentDescription,
  currentDate,
  priorDescription,
  priorDate,
) {
  const currentTokens = tokens(currentDescription);
  const priorTokens = tokens(priorDescription);
  const tokenOverlap = setIntersectionSize(currentTokens, priorTokens);
  const currentModality = modality(currentDescription);
  const priorModality = modality(priorDescription);
  const sameModality = currentModality === priorModality;
  const ageYears = yearDelta(currentDate, priorDate);

  if (sameModality && tokenOverlap >= 1) return true;
  if (tokenOverlap >= 2 && ageYears != null && ageYears <= 2.0) return true;
  if (
    sameModality &&
    HIGH_RELEVANCE_MODALITIES.has(currentModality) &&
    ageYears != null &&
    ageYears <= 5.0
  ) {
    return true;
  }
  return false;
}

export function scoreCase(currentStudy, priorStudies) {
  const out = [];
  for (const prior of priorStudies) {
    out.push({
      study_id: String(prior.study_id ?? ""),
      predicted_is_relevant: predictRelevant(
        String(currentStudy?.study_description ?? ""),
        currentStudy?.study_date,
        String(prior?.study_description ?? ""),
        prior?.study_date,
      ),
    });
  }
  return out;
}
