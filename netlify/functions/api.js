import { randomBytes } from "crypto";
import { scoreCase } from "../../src/model.js";

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

function html(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "text/html; charset=utf-8" },
    body,
  };
}

function parseBody(rawBody) {
  if (!rawBody) return {};
  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}

function apiHomePage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Relevant Priors API</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 42rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; color: #222; }
    code { background: #f0f0f0; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.95em; }
    a { color: #0b57d0; }
    ul { padding-left: 1.25rem; }
  </style>
</head>
<body>
  <h1>Relevant Priors API</h1>
  <p>This server is running. Use the routes below.</p>
  <ul>
    <li><a href="/health"><code>GET /health</code></a> - JSON liveness check</li>
    <li><code>POST /predict</code> - JSON body with <code>cases</code>.</li>
  </ul>
</body>
</html>`;
}

function routePath(event) {
  const path = event.path || "/";
  const prefix = "/.netlify/functions/api";
  if (path.startsWith(prefix)) {
    const stripped = path.slice(prefix.length);
    return stripped || "/";
  }
  return path;
}

export const handler = async (event) => {
  const method = event.httpMethod || "GET";
  const path = routePath(event);

  if (method === "GET" && path === "/favicon.ico") {
    return { statusCode: 204, body: "" };
  }

  if (method === "GET" && path === "/.well-known/appspecific/com.chrome.devtools.json") {
    return json(200, {});
  }

  if (method === "GET" && path === "/") {
    return html(200, apiHomePage());
  }

  if (method === "GET" && path === "/health") {
    return json(200, { status: "ok" });
  }

  if (method === "GET" && path === "/predict") {
    return json(
      405,
      {
        error: "Method not allowed",
        detail:
          "Use POST with Content-Type: application/json and a JSON body including \"cases\".",
      },
      { Allow: "POST" },
    );
  }

  if (method === "POST" && path === "/predict") {
    const body = parseBody(event.body);
    if (!body) {
      return json(400, { error: "Invalid JSON body" });
    }

    const requestId = randomBytes(6).toString("hex");
    const challengeId = body.challenge_id ?? "relevant-priors-v1";
    const schemaVersion = body.schema_version ?? 1;
    const cases = body.cases;

    if (!Array.isArray(cases)) {
      return json(400, { error: "cases must be an array" });
    }

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

    return json(200, { predictions });
  }

  return json(404, { error: "Not found" });
};
