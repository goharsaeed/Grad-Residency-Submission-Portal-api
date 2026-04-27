import express from "express";
import {
  PREDICT_HELP_RESPONSE,
  predictFromBody,
  validatePredictBody,
} from "./predict-service.js";

const app = express();
app.use(express.json({ limit: "100mb" }));

// Quiet harmless browser / DevTools probes (not part of the challenge API).
app.get("/favicon.ico", (_req, res) => res.status(204).end());
app.get("/.well-known/appspecific/com.chrome.devtools.json", (_req, res) =>
  res.type("application/json").send("{}"),
);

app.get("/", (_req, res) => {
  res.type("html").send(`<!DOCTYPE html>
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
    <li><a href="/health"><code>GET /health</code></a> — JSON liveness check</li>
    <li><a href="/predict"><code>GET /predict</code></a> — help JSON with request format</li>
    <li><code>POST /predict</code> — actual prediction endpoint for evaluator / curl / Postman</li>
  </ul>
  <p>Open <a href="/predict">/predict</a> in browser to see a sample payload, then send the same shape to <code>POST /predict</code>.</p>
</body>
</html>`);
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/predict", (_req, res) => {
  res.json(PREDICT_HELP_RESPONSE);
});

function handlePredict(req, res) {
  const body = req.body ?? {};
  const validation = validatePredictBody(body);
  if (!validation.ok) {
    return res.status(400).json({
      error: "Invalid request body",
      details: validation.errors,
    });
  }
  return res.json(predictFromBody(body));
}

// Support both /predict and / as POST targets for external evaluators.
app.post(["/predict", "/"], handlePredict);

export default app;
