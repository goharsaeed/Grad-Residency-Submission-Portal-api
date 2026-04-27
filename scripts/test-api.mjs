/**
 * Spins up the server briefly and checks GET /health and POST /predict.
 * Run: npm run test:api
 */
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const PORT = Number(process.env.TEST_PORT) || 19287;

const sampleBody = {
  challenge_id: "relevant-priors-v1",
  schema_version: 1,
  cases: [
    {
      case_id: "1001016",
      patient_id: "606707",
      patient_name: "Andrews, Micheal",
      current_study: {
        study_id: "3100042",
        study_description: "MRI BRAIN STROKE LIMITED WITHOUT CONTRAST",
        study_date: "2026-03-08",
      },
      prior_studies: [
        {
          study_id: "2453245",
          study_description: "MRI BRAIN STROKE LIMITED WITHOUT CONTRAST",
          study_date: "2020-03-08",
        },
        {
          study_id: "992654",
          study_description: "CT HEAD WITHOUT CNTRST",
          study_date: "2021-03-08",
        },
      ],
    },
  ],
};

function waitForListen(child, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Server did not start in time"));
    }, timeoutMs);
    const onData = (buf) => {
      if (String(buf).includes("listening")) {
        clearTimeout(timer);
        child.stdout.off("data", onData);
        resolve();
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", (d) => process.stderr.write(d));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("exit", (code, sig) => {
      if (code && code !== 0 && sig !== "SIGTERM") {
        clearTimeout(timer);
        reject(new Error(`Server exited early: ${code}`));
      }
    });
  });
}

const child = spawn("node", ["src/server.js"], {
  cwd: root,
  env: { ...process.env, PORT: String(PORT) },
  stdio: ["ignore", "pipe", "pipe"],
});

let failed = true;
try {
  await waitForListen(child);

  const health = await fetch(`http://127.0.0.1:${PORT}/health`);
  if (!health.ok) throw new Error(`GET /health expected 200, got ${health.status}`);
  const healthJson = await health.json();
  if (healthJson.status !== "ok") throw new Error(`GET /health bad body: ${JSON.stringify(healthJson)}`);

  const pred = await fetch(`http://127.0.0.1:${PORT}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sampleBody),
  });
  if (!pred.ok) throw new Error(`POST /predict expected 200, got ${pred.status} ${await pred.text()}`);
  const predJson = await pred.json();
  if (!Array.isArray(predJson.predictions) || predJson.predictions.length !== 2) {
    throw new Error(`Expected 2 predictions, got ${JSON.stringify(predJson)}`);
  }
  for (const p of predJson.predictions) {
    if (!("case_id" in p) || !("study_id" in p) || !("predicted_is_relevant" in p)) {
      throw new Error(`Bad prediction shape: ${JSON.stringify(p)}`);
    }
    if (typeof p.predicted_is_relevant !== "boolean") {
      throw new Error(`predicted_is_relevant must be boolean: ${JSON.stringify(p)}`);
    }
  }

  const bad = await fetch(`http://127.0.0.1:${PORT}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (bad.status !== 400) throw new Error(`POST /predict with missing cases expected 400, got ${bad.status}`);

  console.log("test:api OK — GET /health, POST /predict (2 priors), invalid body -> 400");
  failed = false;
} finally {
  child.kill("SIGTERM");
  await new Promise((r) => setTimeout(r, 300));
}
process.exit(failed ? 1 : 0);
