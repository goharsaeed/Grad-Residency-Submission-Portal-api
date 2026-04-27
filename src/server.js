import http from "http";
import app from "./app.js";

const HOST = "0.0.0.0";
const explicitPort =
  Object.hasOwn(process.env, "PORT") && String(process.env.PORT).trim() !== "";
const parsed = explicitPort ? Number(process.env.PORT) : 8000;
const BASE_PORT = Number.isFinite(parsed) && parsed > 0 ? parsed : 8000;
/** Only when PORT is not set in the environment: try next ports if busy. */
const AUTO_ADVANCE = !explicitPort;

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
