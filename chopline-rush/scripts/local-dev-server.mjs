import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const root = path.resolve("dist");
const port = Number.parseInt(process.env.PORT ?? "4174", 10);
const mimeTypes = new Map([
  [".html", "text/html"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".mp3", "audio/mpeg"],
  [".glb", "model/gltf-binary"],
]);

const sdkSource = `
(() => {
  const calls = [];
  const record = (type, payload = null) => calls.push({ type, payload });
  const sdk = {
    init: async () => { record("init"); return sdk; },
    host: {
      audioEnabled: true,
      setLoadingState: (state) => record("loading", state),
      ready: () => record("ready"),
      onAudioPolicyChange: () => record("audio-policy-listener"),
    },
    app: { authMode: "OPTIONAL", type: "GAME" },
    me: {
      isLoggedIn: true,
      username: "local-player",
      appData: {
        data: {},
        get: async (key) => { record("appData.get", key); return null; },
        set: async (key, value) => { record("appData.set", { key, value }); sdk.me.appData.data[key] = value; },
      },
      promptLogin: async () => record("promptLogin"),
    },
    leaderboards: {
      submitScore: async (key, score) => record("leaderboard.submit", { key, score }),
    },
  };
  window.__pdCalls = calls;
  window.playdrop = sdk;
})();
`;

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  if (url.pathname === "/playdrop-dev-sdk.js") {
    response.writeHead(200, { "Content-Type": "text/javascript", "Cache-Control": "no-store" });
    response.end(sdkSource);
    return;
  }

  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.resolve(root, `.${requested}`);
  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    const body = path.extname(filePath) === ".html"
      ? data.toString("utf8").replace("https://assets.playdrop.ai/sdk/playdrop.js", "/playdrop-dev-sdk.js")
      : data;
    response.writeHead(200, {
      "Content-Type": mimeTypes.get(path.extname(filePath)) ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(body);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[chopline-rush] Local dev URL: http://127.0.0.1:${port}/`);
});
