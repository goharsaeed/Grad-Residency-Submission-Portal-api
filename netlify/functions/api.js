import {
  PREDICT_HELP_RESPONSE,
  predictFromBody,
  validatePredictBody,
} from "../../src/predict-service.js";

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
  <p>This server is running. Test both endpoints below.</p>
  <ul>
    <li><a href="/health"><code>GET /health</code></a> - JSON liveness check</li>
    <li><a href="/predict"><code>GET /predict</code></a> - help JSON with request format</li>
    <li><code>POST /predict</code> - actual prediction endpoint for evaluator / curl / Postman</li>
  </ul>
  <p>Open <a href="/predict">/predict</a> in browser to see a sample payload, then send the same shape to <code>POST /predict</code>.</p>
</body>
</html>`;
}

function routePath(event) {
  const path = event.path || "/";
  const prefix = "/.netlify/functions/api";
  const normalize = (rawPath) => {
    if (!rawPath || rawPath === "/") return "/";
    return rawPath.endsWith("/") ? rawPath.slice(0, -1) : rawPath;
  };
  if (path.startsWith(prefix)) {
    const stripped = path.slice(prefix.length);
    return normalize(stripped || "/");
  }
  return normalize(path);
}

export const handler = async (event) => {
  const method = event.httpMethod || "GET";
  const path = routePath(event);
  const isPredictPath = path === "/predict" || path === "/";

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
    return json(200, PREDICT_HELP_RESPONSE);
  }

  // Accept both POST /predict and POST / for external evaluators.
  if (method === "POST" && isPredictPath) {
    const body = parseBody(event.body);
    if (!body) {
      return json(400, { error: "Invalid JSON body" });
    }
    const validation = validatePredictBody(body);
    if (!validation.ok) {
      return json(400, {
        error: "Invalid request body",
        details: validation.errors,
      });
    }
    return json(200, predictFromBody(body));
  }

  return json(404, { error: "Not found" });
};
