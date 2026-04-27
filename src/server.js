import express from "express";
import http from "http";
import { randomBytes } from "crypto";
import { scoreCase } from "./model.js";

const HOST = "0.0.0.0";
const explicitPort =
  Object.hasOwn(process.env, "PORT") && String(process.env.PORT).trim() !== "";
const parsed = explicitPort ? Number(process.env.PORT) : 8000;
const BASE_PORT = Number.isFinite(parsed) && parsed > 0 ? parsed : 8000;
/** Only when PORT is not set in the environment: try next ports if busy. */
const AUTO_ADVANCE = !explicitPort;

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
  <p>This server is running. Use the routes below.</p>
  <ul>
    <li><a href="/health"><code>GET /health</code></a> — JSON liveness check</li>
    <li><code>POST /predict</code> — JSON body with <code>cases</code> (evaluator / curl / Postman). Not available from the address bar.</li>
  </ul>
  <p>If you opened this page by mistake: bookmark <a href="/health">/health</a> for a quick check.</p>
</body>
</html>`);
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/predict", (_req, res) => {
  res.set("Allow", "POST");
  res.status(405).json({
    error: "Method not allowed",
    detail: "Use POST with Content-Type: application/json and a JSON body including \"cases\".",
  });
});

app.post("/predict", (req, res) => {
  const requestId = randomBytes(6).toString("hex");
  const body = req.body ?? {};
  const challengeId = body.challenge_id ?? "relevant-priors-v1";
  const schemaVersion = body.schema_version ?? 1;
  const cases = body.cases;

  if (!Array.isArray(cases)) {
    return res.status(400).json({ error: "cases must be an array" });
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

  res.json({ predictions });
});

function listen(port) {
  const server = http.createServer(app);
  server.listen(port, HOST, () => {
    console.log(`Relevant Priors API listening on http://127.0.0.1:${port}`);
  });
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE" && AUTO_ADVANCE && port < BASE_PORT + 50) {
      console.warn(`Port ${port} is in use, trying ${port + 1}...`);
      listen(port + 1);
      return;
    }
    console.error(err);
    process.exit(1);
  });
}

listen(BASE_PORT);
