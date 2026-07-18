import fs from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const root = path.resolve("dist");
const outDir = path.resolve("tmp/mechanics-proof");
const profileKey = "chopline-rush-v2-profile";
const proofViewport = { width: 390, height: 844 };

const mimeTypes = new Map([
  [".html", "text/html"],
  [".js", "text/javascript"],
  [".css", "text/css"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".mp3", "audio/mpeg"],
  [".glb", "model/gltf-binary"],
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createProfile() {
  return {
    coins: 0,
    ownedKnives: ["cooking"],
    equippedKnife: "cooking",
    highestLevel: 1,
    highestLevelCompleted: 0,
    endlessBest: 0,
    totalRuns: 0,
    totalSlices: 0,
    totalCoinsEarned: 0,
    achievements: [],
  };
}

function startServer() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
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
      response.writeHead(200, {
        "Content-Type": mimeTypes.get(path.extname(filePath)) ?? "application/octet-stream",
      });
      response.end(data);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Failed to bind proof server");
      resolve({ server, origin: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function installFakePlaydrop(page) {
  await page.route("https://assets.playdrop.ai/sdk/playdrop.js", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/javascript", body: "" });
  });
  await page.addInitScript(() => {
    const calls = [];
    const record = (type, payload = null) => calls.push({ type, payload });
    const sdk = {
      init: async () => {
        record("init");
        return sdk;
      },
      host: {
        audioEnabled: true,
        ready: () => record("ready"),
        setLoadingState: (state) => record("loading", state),
        onAudioPolicyChange: () => record("audio-policy-listener"),
      },
      app: { authMode: "OPTIONAL", type: "GAME" },
      me: {
        isLoggedIn: true,
        username: "proof-tester",
        appData: {
          data: {},
          get: async () => null,
          set: async (key, value) => record("appData.set", { key, value }),
        },
        promptLogin: async () => record("promptLogin"),
      },
      ads: {
        interstitial: {
          load: async () => ({ status: "ready" }),
          show: async () => ({ status: "dismissed" }),
        },
        rewarded: {
          load: async () => ({ status: "ready" }),
          show: async () => ({ status: "completed" }),
        },
      },
      shop: {
        listProducts: async () => [{ key: "coins_500" }, { key: "coins_1500" }, { key: "coins_4000" }],
        purchase: async (payload) => ({ id: 1001, status: "GRANTED", sku: typeof payload === "string" ? payload : payload.sku }),
        grant: async (receiptId) => ({ id: receiptId, status: "GRANTED" }),
        consume: async () => undefined,
      },
      achievements: {
        unlock: async (key) => record("achievement.unlock", key),
        setProgressAtLeast: async (key, progress) => record("achievement.progress", { key, progress }),
      },
      leaderboards: {
        submitScore: async (key, score) => record("leaderboard.submit", { key, score }),
      },
    };
    window.__pdCalls = calls;
    window.playdrop = sdk;
  });
}

async function openProofPage(browser, origin) {
  const page = await browser.newPage({
    viewport: proofViewport,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await installFakePlaydrop(page);
  await page.addInitScript(({ key, profile }) => {
    localStorage.setItem(key, JSON.stringify(profile));
  }, { key: profileKey, profile: createProfile() });
  await page.goto(`${origin}/index.html?playdrop_channel=prod&chopline_test=1`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => typeof window.__choplineTest?.state === "function", null, { timeout: 10000 });
  await page.waitForFunction(() => window.__choplineTest.state().screen === "playing", null, { timeout: 10000 });
  return { page, errors };
}

async function setOverlay(page, title, lines) {
  await page.evaluate(({ title, lines }) => {
    let overlay = document.querySelector("#proof-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "proof-overlay";
      overlay.style.position = "fixed";
      overlay.style.left = "18px";
      overlay.style.top = "12px";
      overlay.style.zIndex = "99999";
      overlay.style.maxWidth = "330px";
      overlay.style.padding = "9px 10px";
      overlay.style.borderRadius = "8px";
      overlay.style.background = "rgba(10, 14, 24, 0.78)";
      overlay.style.color = "white";
      overlay.style.font = "600 13px/1.22 system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
      overlay.style.boxShadow = "0 12px 34px rgba(0,0,0,.32)";
      document.body.append(overlay);
    }
    overlay.innerHTML = `
      <div style="font-size:15px;margin-bottom:5px;">${title}</div>
      ${lines.map((line) => `<div style="font-size:10px;font-weight:500;opacity:.94;">${line}</div>`).join("")}
    `;
  }, { title, lines });
}

async function capture(page, fileName, title, lines, evidence) {
  await page.evaluate(() => window.__choplineTest.setProofFrozen(true));
  await setOverlay(page, title, lines);
  await page.waitForTimeout(120);
  const filePath = path.join(outDir, fileName);
  await page.screenshot({ path: filePath, fullPage: false });
  return { title, filePath, evidence };
}

function stateLine(state) {
  return `knife=${state.knife.state}/${state.knife.stuckFace} score=${state.run?.score ?? 0} slices=${state.sliceables.sliced} pieces=${state.slicePieces.count}`;
}

async function buildComposite(browser, captures) {
  const cards = captures.map((item) => {
    const b64 = fs.readFileSync(item.filePath, "base64");
    const evidence = Object.entries(item.evidence)
      .map(([key, value]) => `<span><b>${key}</b>: ${String(value)}</span>`)
      .join("");
    return `
      <figure>
        <img src="data:image/png;base64,${b64}" alt="${item.title}">
        <figcaption>
          <strong>${item.title}</strong>
          <div>${evidence}</div>
        </figcaption>
      </figure>
    `;
  }).join("");
  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #10141f;
            color: white;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
          }
          main {
            width: 1160px;
            padding: 24px;
          }
          h1 {
            margin: 0 0 18px;
            font-size: 32px;
            font-weight: 800;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 18px;
          }
          figure {
            margin: 0;
            background: #1a2130;
            border: 1px solid rgba(255,255,255,.14);
            border-radius: 8px;
            overflow: hidden;
          }
          img {
            display: block;
            width: 100%;
          }
          figcaption {
            padding: 12px 14px 14px;
            font-size: 15px;
          }
          figcaption strong {
            display: block;
            font-size: 20px;
            margin-bottom: 7px;
          }
          figcaption div {
            display: flex;
            flex-wrap: wrap;
            gap: 8px 16px;
            color: #dbe7ff;
          }
        </style>
      </head>
      <body>
        <main>
          <h1>Chopline Rush Mechanics Proof</h1>
          <section class="grid">${cards}</section>
        </main>
      </body>
    </html>
  `;
  const compositePage = await browser.newPage({ viewport: { width: 1160, height: 1800 }, deviceScaleFactor: 1 });
  await compositePage.setContent(html, { waitUntil: "load" });
  const compositePath = path.join(outDir, "mechanics-composite.png");
  await compositePage.screenshot({ path: compositePath, fullPage: true });
  await compositePage.close();
  return compositePath;
}

async function main() {
  assert(fs.existsSync(path.join(root, "index.html")), "dist/index.html missing; run npm run build first");
  await mkdir(outDir, { recursive: true });
  const { server, origin } = await startServer();
  const browser = await chromium.launch({ headless: true, channel: "chromium" });
  const captures = [];
  const evidenceLog = {};
  try {
    const { page, errors } = await openProofPage(browser, origin);
    await page.waitForTimeout(700);

    await page.evaluate(() => window.__choplineTest.startEndless());
    await page.waitForFunction(() => window.__choplineTest.state().screen === "playing", null, { timeout: 10000 });
    const beforeJump = await page.evaluate(() => window.__choplineTest.state().knife);
    await page.mouse.click(360, 900);
    await page.waitForTimeout(450);
    const beforeSecondTap = await page.evaluate(() => window.__choplineTest.state().knife);
    await page.mouse.click(360, 900);
    await page.waitForTimeout(20);
    await page.evaluate(() => window.__choplineTest.setProofFrozen(true));
    const afterSecondTap = await page.evaluate(() => window.__choplineTest.state());
    assert(beforeJump.state === "stuck", `Expected initial stuck knife, got ${beforeJump.state}`);
    assert(beforeSecondTap.state === "flying", `Expected airborne knife before second tap, got ${beforeSecondTap.state}`);
    assert(afterSecondTap.knife.state === "flying", `Expected flying knife after second tap, got ${afterSecondTap.knife.state}`);
    assert(afterSecondTap.knife.velocityY > beforeSecondTap.velocityY + 0.2, "Second airborne tap did not add upward impulse");
    assert(afterSecondTap.knife.velocityZ >= 7.5, "Second airborne tap did not restore forward speed");
    captures.push(await capture(
      page,
      "01-multiple-jump.png",
      "1. Multiple Jump Timing (Mobile Portrait)",
      [
        `before 2nd tap: vy=${beforeSecondTap.velocityY.toFixed(2)}`,
        `after 2nd tap: vy=${afterSecondTap.knife.velocityY.toFixed(2)} vz=${afterSecondTap.knife.velocityZ.toFixed(2)}`,
        stateLine(afterSecondTap),
      ],
      {
        beforeVy: beforeSecondTap.velocityY.toFixed(2),
        afterVy: afterSecondTap.knife.velocityY.toFixed(2),
        afterVz: afterSecondTap.knife.velocityZ.toFixed(2),
      },
    ));

    await page.evaluate(() => {
      window.__choplineTest.stageInvalidSliceProof();
      window.__choplineTest.advance(0.04);
      window.__choplineTest.setProofFrozen(true);
    });
    const permissiveCut = await page.evaluate(() => window.__choplineTest.state());
    assert(permissiveCut.sliceables.sliced > 0, "Blade contact failed to slice a target");
    assert(permissiveCut.run.score > 0, "Blade contact failed to award score");
    assert(permissiveCut.knife.state !== "bouncing", `Blade contact incorrectly bounced, got ${permissiveCut.knife.state}`);
    captures.push(await capture(
      page,
      "02-permissive-blade-cut.png",
      "2. Blade Contact Always Cuts (Mobile Portrait)",
      [
        `state=${permissiveCut.knife.state} score=${permissiveCut.run.score}`,
        `sliced=${permissiveCut.sliceables.sliced} pieces=${permissiveCut.slicePieces.count}`,
      ],
      {
        state: permissiveCut.knife.state,
        score: permissiveCut.run.score,
        sliced: permissiveCut.sliceables.sliced,
      },
    ));

    await page.evaluate(() => window.__choplineTest.stageLandingProof());
    await page.waitForFunction(() => {
      const state = window.__choplineTest.state();
      return state.knife.state === "stuck" && state.knife.stuckFace === "top" && state.knife.stuckPlatformId;
    }, null, { timeout: 10000 });
    await page.waitForTimeout(120);
    await page.evaluate(() => window.__choplineTest.setProofFrozen(true));
    const landing = await page.evaluate(() => window.__choplineTest.state());
    assert(landing.knife.velocityY === 0 && landing.knife.velocityZ === 0, "Stuck landing retained velocity");
    captures.push(await capture(
      page,
      "03-blade-landing-stick.png",
      "3. Blade Landing / Stick (Mobile Portrait)",
      [
        `state=${landing.knife.state} face=${landing.knife.stuckFace}`,
        `platform=${landing.knife.stuckPlatformId}`,
        `velocity=${landing.knife.velocityY.toFixed(1)}/${landing.knife.velocityZ.toFixed(1)}`,
      ],
      {
        state: landing.knife.state,
        face: landing.knife.stuckFace,
        platform: landing.knife.stuckPlatformId,
      },
    ));

    await page.evaluate(() => window.__choplineTest.stageHandleLandingProof());
    await page.waitForFunction(() => ["rotating-stick", "stuck"].includes(window.__choplineTest.state().knife.state), null, { timeout: 10000 });
    await page.evaluate(() => window.__choplineTest.setProofFrozen(true));
    const rejectedLanding = await page.evaluate(() => window.__choplineTest.state());
    assert(rejectedLanding.run.outcome === null, "Recoverable handle landing ended the run");
    assert(["rotating-stick", "stuck"].includes(rejectedLanding.knife.state), `Handle landing should rotate into recovery, got ${rejectedLanding.knife.state}`);
    captures.push(await capture(
      page,
      "04-rejected-handle-landing.png",
      "4. Handle Landing Recovery (Mobile Portrait)",
      [
        `state=${rejectedLanding.knife.state} outcome=${rejectedLanding.run.outcome}`,
        `score=${rejectedLanding.run.score}`,
      ],
      {
        state: rejectedLanding.knife.state,
        outcome: rejectedLanding.run.outcome,
      },
    ));

    await page.evaluate(() => {
      window.__choplineTest.stageHandleSliceProof();
      window.__choplineTest.advance(0.2);
      window.__choplineTest.setProofFrozen(true);
    });
    const handleTarget = await page.evaluate(() => window.__choplineTest.state());
    assert(handleTarget.run.score === 1, `Handle-first contact with an imminent blade sweep must cut once, got ${handleTarget.run.score}`);
    assert(handleTarget.sliceables.sliced === 1, `Handle-first look-ahead must split exactly one target, got ${handleTarget.sliceables.sliced}`);
    assert(handleTarget.knife.state !== "bouncing", `Forgiven handle-first contact must not bounce, got ${handleTarget.knife.state}`);
    captures.push(await capture(
      page,
      "04b-handle-target-bounce.png",
      "4b. Handle Contact Forgiven by Blade Look-Ahead (Mobile Portrait)",
      [
        `state=${handleTarget.knife.state} score=${handleTarget.run.score}`,
        `sliced=${handleTarget.sliceables.sliced}`,
        `velocity=${handleTarget.knife.velocityY.toFixed(2)}/${handleTarget.knife.velocityZ.toFixed(2)}`,
      ],
      {
        state: handleTarget.knife.state,
        score: handleTarget.run.score,
        sliced: handleTarget.sliceables.sliced,
      },
    ));

    await page.evaluate(() => window.__choplineTest.stageSliceProof());
    await page.waitForFunction(() => {
      const state = window.__choplineTest.state();
      return state.knife.slicing && state.sliceables.sliced >= 1 && state.slicePieces.count >= 2 && state.run?.score > 0;
    }, null, { timeout: 10000 });
    await page.waitForTimeout(120);
    await page.evaluate(() => window.__choplineTest.setProofFrozen(true));
    const cutting = await page.evaluate(() => window.__choplineTest.state());
    assert(cutting.slicePieces.count >= cutting.sliceables.sliced * 2, "Cutting did not create physical halves and stack rubble");
    assert(cutting.slicePieces.maxSourceSpawnSpreadX <= 0.001, `Slice halves spawned with X offset ${cutting.slicePieces.maxSourceSpawnSpreadX}`);
    assert(cutting.slicePieces.maxSourceSpawnSpreadY <= 0.001, `Slice halves spawned with Y offset ${cutting.slicePieces.maxSourceSpawnSpreadY}`);
    captures.push(await capture(
      page,
      "05-cutting-collision.png",
      "5. Cutting Collision Physics (Mobile Portrait)",
      [
        `slicing=${cutting.knife.slicing} score=${cutting.run.score} combo=${cutting.run.combo}`,
        `sliced=${cutting.sliceables.sliced} pieces=${cutting.slicePieces.count}`,
        `sourceSpawnSpread=${cutting.slicePieces.maxSourceSpawnSpreadX.toFixed(3)}/${cutting.slicePieces.maxSourceSpawnSpreadY.toFixed(3)}`,
        `types=${cutting.slicePieces.objectTypes.join(", ")}`,
      ],
      {
        slicing: cutting.knife.slicing,
        score: cutting.run.score,
        combo: cutting.run.combo,
        pieces: cutting.slicePieces.count,
        sourceSpawnSpread: `${cutting.slicePieces.maxSourceSpawnSpreadX.toFixed(3)}/${cutting.slicePieces.maxSourceSpawnSpreadY.toFixed(3)}`,
      },
    ));

    await page.evaluate(() => window.__choplineTest.stageSplitVisualProof());
    await page.evaluate(() => {
      window.__choplineTest.advance(0.35);
      window.__choplineTest.setProofFrozen(true);
    });
    const split = await page.evaluate(() => window.__choplineTest.state());
    assert(split.slicePieces.count === split.sliceables.sliced * 2, "Each split target must produce exactly two physical halves");
    assert(split.slicePieces.spreadX > 0.5, "Split halves did not visibly separate");
    assert(split.slicePieces.sliding + split.slicePieces.falling + split.slicePieces.grounded === split.slicePieces.count, "Split halves lack physics phases");
    captures.push(await capture(
      page,
      "06-split-halves-visual.png",
      "6. Visual Split-Halves (Mobile Portrait)",
      [
        `pieces=${split.slicePieces.count} spreadX=${split.slicePieces.spreadX.toFixed(2)}`,
        `phases: sliding=${split.slicePieces.sliding} falling=${split.slicePieces.falling} grounded=${split.slicePieces.grounded}`,
        stateLine(split),
      ],
      {
        pieces: split.slicePieces.count,
        spreadX: split.slicePieces.spreadX.toFixed(2),
        phases: `${split.slicePieces.sliding}/${split.slicePieces.falling}/${split.slicePieces.grounded}`,
      },
    ));

    assert(errors.length === 0, `Proof browser console/page errors: ${errors.join("\n")}`);
    await page.close();
    const compositePath = await buildComposite(browser, captures);
    evidenceLog.captures = captures.map((item) => ({ title: item.title, filePath: item.filePath, evidence: item.evidence }));
    evidenceLog.compositePath = compositePath;
    await writeFile(path.join(outDir, "evidence.json"), JSON.stringify(evidenceLog, null, 2));
    console.log(`[mechanics-proof] composite ${compositePath}`);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

await main();
