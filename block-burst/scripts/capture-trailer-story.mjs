import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appUrl = new URL("../dist/index.html", import.meta.url).href;
const campaignDir = resolve(appDir, "assets/marketing/video-campaign");
const portrait = process.argv.includes("--portrait");
const captureName = portrait ? "portrait-story" : "landscape-story";
const captureWidth = portrait ? 1080 : 1920;
const captureHeight = portrait ? 1920 : 1080;
const rawDir = resolve(campaignDir, `project/capture-work/${captureName}`);
const outputDir = resolve(campaignDir, `source-captures/${captureName}`);
const seed = Number(process.argv.find((arg) => arg.startsWith("--seed="))?.split("=")[1] ?? 24681357);
const fast = process.argv.includes("--fast");
const searchOnly = process.argv.includes("--search-only");
const bigClear = process.argv.includes("--big-clear");
const maxMoves = Number(process.argv.find((arg) => arg.startsWith("--moves="))?.split("=")[1] ?? 12);
const slowFromMove = Number(process.argv.find((arg) => arg.startsWith("--slow-from="))?.split("=")[1] ?? 0);
const targetLines = Number(process.argv.find((arg) => arg.startsWith("--target-lines="))?.split("=")[1] ?? 0);
const targetBombs = Number(process.argv.find((arg) => arg.startsWith("--target-bombs="))?.split("=")[1] ?? 0);
const squareFinale = process.argv.includes("--square-finale");

mkdirSync(rawDir, { recursive: true });
mkdirSync(outputDir, { recursive: true });
const recorderDir = mkdtempSync(resolve(rawDir, "recorder-"));

function boardFromState(state) {
  return state.board.map((row) => row.map(Boolean));
}

function specialsFromState(state) {
  return state.specials.map((row) => row.map((cell) => cell ?? null));
}

function canPlace(board, cells, c0, r0) {
  for (const [dx, dy] of cells) {
    const c = c0 + dx;
    const r = r0 + dy;
    if (c < 0 || c >= 8 || r < 0 || r >= 8 || board[r][c]) return false;
  }
  return true;
}

function simulate(board, specials, piece, c0, r0, combo, comboGrace) {
  const next = board.map((row) => [...row]);
  const nextSpecials = specials.map((row) => [...row]);
  for (const [dx, dy] of piece.cells) next[r0 + dy][c0 + dx] = true;
  const rows = [];
  const cols = [];
  for (let r = 0; r < 8; r += 1) if (next[r].every(Boolean)) rows.push(r);
  for (let c = 0; c < 8; c += 1) if (next.every((row) => row[c])) cols.push(c);
  const lines = rows.length + cols.length;
  const clear = new Set();
  for (const r of rows) for (let c = 0; c < 8; c += 1) clear.add(r * 8 + c);
  for (const c of cols) for (let r = 0; r < 8; r += 1) clear.add(r * 8 + c);
  const queue = [...clear];
  let bombs = 0;
  let detonated = 0;
  while (queue.length) {
    const index = queue.pop();
    const r = Math.floor(index / 8);
    const c = index % 8;
    const type = nextSpecials[r][c];
    if (!type) continue;
    nextSpecials[r][c] = null;
    detonated += 1;
    if (type === "bomb") bombs += 1;
    const expanded = [];
    if (type === "bomb") {
      for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) expanded.push([r + dr, c + dc]);
    } else if (type === "cross") {
      for (let i = 0; i < 8; i += 1) expanded.push([r, i], [i, c]);
    } else {
      for (let dr = -1; dr <= 1; dr += 1) for (let i = 0; i < 8; i += 1) expanded.push([r + dr, i]);
      for (let dc = -1; dc <= 1; dc += 1) for (let i = 0; i < 8; i += 1) expanded.push([i, c + dc]);
    }
    for (const [rr, cc] of expanded) {
      if (rr < 0 || rr >= 8 || cc < 0 || cc >= 8) continue;
      const expandedIndex = rr * 8 + cc;
      if (clear.has(expandedIndex)) continue;
      clear.add(expandedIndex);
      queue.push(expandedIndex);
    }
  }
  for (const index of clear) {
    const r = Math.floor(index / 8);
    const c = index % 8;
    next[r][c] = false;
    nextSpecials[r][c] = null;
  }
  let nextCombo = combo;
  let nextGrace = comboGrace;
  if (lines > 0) {
    nextCombo += 1;
    nextGrace = 1;
  } else if (nextCombo > 0) {
    nextGrace -= 1;
    if (nextGrace < 0) nextCombo = 0;
  }
  return { board: next, specials: nextSpecials, lines, bombs, detonated, combo: nextCombo, comboGrace: nextGrace };
}

function boardScore(board) {
  const rowCounts = board.map((row) => row.filter(Boolean).length);
  const colCounts = Array.from({ length: 8 }, (_, c) => board.filter((row) => row[c]).length);
  const potential = [...rowCounts, ...colCounts].reduce((sum, count) => sum + count ** 4, 0);
  let occupied = 0;
  let bottomWeight = 0;
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      if (!board[r][c]) continue;
      occupied += 1;
      bottomWeight += r;
    }
  }
  const dangerPenalty = occupied > 48 ? (occupied - 48) ** 2 * 120 : 0;
  return potential * 4 + bottomWeight * 5 - occupied * 18 - dangerPenalty;
}

const SIX_LINE_TARGETS = [];
{
  for (let c = 0; c < 8; c += 1) {
    for (let r0 = 0; r0 <= 3; r0 += 1) {
      const rows = Array.from({ length: 5 }, (_, offset) => r0 + offset);
      const windowCells = rows.map((r) => [r, c]);
      const requiredCells = [];
      for (const r of rows) for (let cc = 0; cc < 8; cc += 1) if (cc !== c) requiredCells.push([r, cc]);
      for (let r = 0; r < 8; r += 1) if (!rows.includes(r)) requiredCells.push([r, c]);
      SIX_LINE_TARGETS.push({ id: `vertical-${c}-${r0}`, windowCells, requiredCells, finalCols: 1, finalRows: 5, finalCells: 5 });
    }
  }
  for (let r = 0; r < 8; r += 1) {
    for (let c0 = 0; c0 <= 3; c0 += 1) {
      const cols = Array.from({ length: 5 }, (_, offset) => c0 + offset);
      const windowCells = cols.map((c) => [r, c]);
      const requiredCells = [];
      for (const c of cols) for (let rr = 0; rr < 8; rr += 1) if (rr !== r) requiredCells.push([rr, c]);
      for (let c = 0; c < 8; c += 1) if (!cols.includes(c)) requiredCells.push([r, c]);
      SIX_LINE_TARGETS.push({ id: `horizontal-${r}-${c0}`, windowCells, requiredCells, finalCols: 5, finalRows: 1, finalCells: 5 });
    }
  }
  // The shipped 3x3 piece can complete three rows and three columns in one
  // legal placement. It needs only 30 supporting cells, making it the most
  // plausible organic six-line finale while keeping its 3x3 landing zone open.
  for (let r0 = 0; r0 <= 5; r0 += 1) {
    for (let c0 = 0; c0 <= 5; c0 += 1) {
      const rows = [r0, r0 + 1, r0 + 2];
      const cols = [c0, c0 + 1, c0 + 2];
      const windowCells = [];
      const requiredCells = [];
      for (const r of rows) for (const c of cols) windowCells.push([r, c]);
      for (const r of rows) for (let c = 0; c < 8; c += 1) if (!cols.includes(c)) requiredCells.push([r, c]);
      for (const c of cols) for (let r = 0; r < 8; r += 1) if (!rows.includes(r)) requiredCells.push([r, c]);
      SIX_LINE_TARGETS.push({ id: `square-${r0}-${c0}`, windowCells, requiredCells, finalCols: 3, finalRows: 3, finalCells: 9 });
    }
  }
}

function scoreSixLineTarget(board, specials, availablePieces, target) {
  if (target.windowCells.some(([r, c]) => board[r][c])) return -Infinity;
  let filled = 0;
  for (const [r, c] of target.requiredCells) {
    if (board[r][c]) filled += 1;
  }
  const bombsOnClear = targetBombCount(specials, target);
  const finalPieceReady = filled === target.requiredCells.length;
  const finalPieceAvailable = availablePieces.some((piece) => (
    piece.cols === target.finalCols
      && piece.rows === target.finalRows
      && piece.cells.length === target.finalCells
  ));
  const stagedLimit = finalPieceAvailable ? target.requiredCells.length : target.requiredCells.length - 3;
  const stagedProgress = Math.min(filled, stagedLimit) / target.requiredCells.length;
  const prematureFillPenalty = finalPieceAvailable ? 0 : Math.max(0, filled - stagedLimit) * 260_000_000;
  return stagedProgress ** 5 * 800_000_000
    + Math.min(bombsOnClear, 2) * 180_000_000
    + (finalPieceReady && finalPieceAvailable ? 1_500_000_000 : 0)
    + (target.finalCells === 9 ? 100_000_000 : 0)
    - prematureFillPenalty;
}

function targetBombCount(specials, target) {
  const clear = new Set([...target.requiredCells, ...target.windowCells].map(([r, c]) => r * 8 + c));
  const queue = [...clear];
  const consumed = new Set();
  let bombs = 0;
  while (queue.length) {
    const index = queue.pop();
    if (consumed.has(index)) continue;
    const r = Math.floor(index / 8);
    const c = index % 8;
    const type = specials[r][c];
    if (!type) continue;
    consumed.add(index);
    if (type === "bomb") bombs += 1;
    const expanded = [];
    if (type === "bomb") {
      for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) expanded.push([r + dr, c + dc]);
    } else if (type === "cross") {
      for (let i = 0; i < 8; i += 1) expanded.push([r, i], [i, c]);
    } else {
      for (let dr = -1; dr <= 1; dr += 1) for (let i = 0; i < 8; i += 1) expanded.push([r + dr, i]);
      for (let dc = -1; dc <= 1; dc += 1) for (let i = 0; i < 8; i += 1) expanded.push([i, c + dc]);
    }
    for (const [rr, cc] of expanded) {
      if (rr < 0 || rr >= 8 || cc < 0 || cc >= 8) continue;
      const next = rr * 8 + cc;
      if (!clear.has(next)) {
        clear.add(next);
        queue.push(next);
      }
    }
  }
  return bombs;
}

function bestSixLineTargets(board, specials, availablePieces, limit = 8, minBombs = 0) {
  return SIX_LINE_TARGETS
    .filter((target) => !squareFinale || target.finalCells === 9)
    .filter((target) => targetBombCount(specials, target) >= minBombs)
    .map((target) => ({ target, score: scoreSixLineTarget(board, specials, availablePieces, target) }))
    .filter(({ score }) => Number.isFinite(score))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ target }) => target);
}

function sixLineSetupScore(board, specials, availablePieces, targets) {
  let best = -Infinity;
  for (const target of targets) {
    best = Math.max(best, scoreSixLineTarget(board, specials, availablePieces, target));
  }
  return best;
}

let lockedSixLineTarget = null;

function planSet(state) {
  const pieces = state.pieces.filter(Boolean);
  const earnedBombs = state.specials.flat().filter((special) => special === "bomb").length;
  const liveBoard = boardFromState(state);
  const liveSpecials = specialsFromState(state);
  let sixLineTargets = [];
  if (targetLines >= 6 && earnedBombs >= targetBombs) {
    const lockIsValid = lockedSixLineTarget
      && !lockedSixLineTarget.windowCells.some(([r, c]) => liveBoard[r][c])
      && targetBombCount(liveSpecials, lockedSixLineTarget) >= targetBombs;
    const alternatives = bestSixLineTargets(liveBoard, liveSpecials, pieces, searchOnly ? 8 : 16, targetBombs);
    sixLineTargets = lockIsValid
      ? [lockedSixLineTarget, ...alternatives.filter((target) => target.id !== lockedSixLineTarget.id)]
      : alternatives;
  } else if (targetLines >= 6 && squareFinale && earnedBombs < targetBombs) {
    const prebuildIsValid = lockedSixLineTarget
      && !lockedSixLineTarget.windowCells.some(([r, c]) => liveBoard[r][c]);
    if (!prebuildIsValid) {
      lockedSixLineTarget = lockedSixLineTarget === null && state.linesRun === 0
        ? SIX_LINE_TARGETS.find((target) => target.id === "square-2-2") ?? null
        : bestSixLineTargets(liveBoard, liveSpecials, pieces, 1, 0)[0] ?? null;
    }
    sixLineTargets = lockedSixLineTarget ? [lockedSixLineTarget] : [];
  } else if (earnedBombs < targetBombs) {
    lockedSixLineTarget = null;
  }
  let beam = [{
    board: liveBoard,
    specials: liveSpecials,
    remaining: pieces,
    sequence: [],
    combo: state.combo,
    comboGrace: state.comboGrace,
    value: 0,
  }];

  for (let depth = 0; depth < pieces.length; depth += 1) {
    const nextBeam = [];
    for (const node of beam) {
      for (let index = 0; index < node.remaining.length; index += 1) {
        const piece = node.remaining[index];
        for (let r0 = 0; r0 <= 8 - piece.rows; r0 += 1) {
          for (let c0 = 0; c0 <= 8 - piece.cols; c0 += 1) {
            if (!canPlace(node.board, piece.cells, c0, r0)) continue;
            const result = simulate(node.board, node.specials, piece, c0, r0, node.combo, node.comboGrace);
            const targetHit = targetLines > 0 && result.lines >= targetLines && result.bombs >= targetBombs;
            const clearValue = targetLines > 0
              ? targetHit
                ? 2_000_000_000 + result.lines * 20_000_000 + result.bombs * 10_000_000
                : earnedBombs < targetBombs
                  ? result.lines === 2 && result.bombs === 0
                    ? 1_000_000_000 + result.lines * 2_000_000
                    : result.lines > 0 ? -10_000_000 * result.lines - 5_000_000_000 * result.bombs : 0
                  : result.lines > 0 ? -25_000_000 * result.lines - 5_000_000_000 * result.bombs : 0
              : bigClear
                ? result.lines >= 2
                  ? result.lines ** 3 * 1_000_000
                  : result.lines === 1 ? -500_000 : 0
                : result.lines * 120_000 + (result.lines >= 2 ? result.lines ** 3 * 350_000 : 0);
            const comboValue = !bigClear && result.lines > 0 && result.combo >= 2 ? result.combo * 48_000 : 0;
            const move = { slot: piece.slot, c0, r0, lines: result.lines, bombs: result.bombs, detonated: result.detonated, combo: result.combo };
            nextBeam.push({
              board: result.board,
              specials: result.specials,
              remaining: node.remaining.filter((_, pieceIndex) => pieceIndex !== index),
              sequence: [...node.sequence, move],
              combo: result.combo,
              comboGrace: result.comboGrace,
              value: node.value + clearValue + comboValue + boardScore(result.board)
                + (sixLineTargets.length > 0
                  ? sixLineSetupScore(
                    result.board,
                    result.specials,
                    node.remaining.filter((_, pieceIndex) => pieceIndex !== index),
                    sixLineTargets,
                  )
                  : 0),
            });
          }
        }
      }
    }
    if (nextBeam.length === 0) break;
    nextBeam.sort((a, b) => b.value - a.value);
    beam = nextBeam.slice(0, searchOnly ? 48 : 160);
  }

  beam.sort((a, b) => b.value - a.value);
  const best = beam[0];
  if (!best?.sequence.length) throw new Error("[block-burst] No legal trailer move found");
  if (sixLineTargets.length > 0) {
    const nextLock = [...sixLineTargets]
      .map((target) => ({ target, score: scoreSixLineTarget(best.board, best.specials, best.remaining, target) }))
      .filter(({ score }) => Number.isFinite(score))
      .sort((a, b) => b.score - a.score)[0]?.target ?? null;
    if (nextLock?.id !== lockedSixLineTarget?.id) {
      lockedSixLineTarget = nextLock;
      if (nextLock) console.log(`[block-burst] Locked six-line target ${nextLock.id}`);
    }
  }
  return best.sequence;
}

async function readState(page) {
  return JSON.parse(await page.evaluate(() => window.render_game_to_text?.() ?? "{}"));
}

async function dragMove(page, state, move, useFast) {
  const piece = state.pieces.find((candidate) => candidate?.slot === move.slot);
  if (!piece) throw new Error(`[block-burst] Missing slot ${move.slot}`);
  const canvas = await page.locator("canvas").boundingBox();
  if (!canvas) throw new Error("[block-burst] Canvas bounds unavailable");
  const layout = state.layout;
  const scaleX = canvas.width / layout.dw;
  const scaleY = canvas.height / layout.dh;
  const origin = layout.slotPos[move.slot];
  const targetX = layout.boardLeft + (move.c0 + piece.cols / 2) * layout.cell;
  const targetY = layout.boardTop + (move.r0 + piece.rows / 2) * layout.cell + 6;
  const toCss = (point) => ({ x: canvas.x + point.x * scaleX, y: canvas.y + point.y * scaleY });
  const start = toCss(origin);
  const end = toCss({ x: targetX, y: targetY });

  await page.waitForTimeout(searchOnly ? 10 : useFast ? 40 : 520);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.waitForTimeout(searchOnly ? 5 : useFast ? 20 : 130);
  const steps = searchOnly ? 1 : useFast ? 3 : 10;
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    const eased = 1 - (1 - t) ** 2;
    await page.mouse.move(start.x + (end.x - start.x) * eased, start.y + (end.y - start.y) * eased);
    await page.waitForTimeout(searchOnly ? 5 : useFast ? 16 : 68);
  }
  await page.mouse.up();
  await page.waitForTimeout(searchOnly ? move.lines > 0 ? 360 : 60 : useFast ? 220 : move.lines > 0 ? 1080 : 720);
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: captureWidth, height: captureHeight },
    deviceScaleFactor: 1,
    ...(searchOnly ? {} : { recordVideo: { dir: recorderDir, size: { width: captureWidth, height: captureHeight } } }),
  });
  await context.addInitScript((captureSeed) => {
    let value = captureSeed >>> 0;
    Math.random = () => {
      value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
      return value / 4294967296;
    };
    try {
      localStorage.setItem("block_burst_tutorial_complete", "1");
    } catch {
      // localStorage becomes available when the file-origin document loads.
    }
  }, seed);
  const pageCreatedAt = Date.now();
  const page = await context.newPage();
  const video = searchOnly ? null : page.video();
  if (!searchOnly && !video) throw new Error("[block-burst] Trailer video recorder unavailable");

  await page.goto(appUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("canvas");
  await page.waitForFunction(() => Boolean(window.__listingCapture?.startAudioCapture && window.render_game_to_text));
  await page.waitForFunction(() => {
    const state = JSON.parse(window.render_game_to_text?.() ?? "{}");
    return state.previewMode === false && state.pieces?.some(Boolean);
  });
  await page.waitForTimeout(400);

  const captureStartedAt = Date.now();
  if (!searchOnly) await page.evaluate(async () => window.__listingCapture?.startAudioCapture?.());
  const moveLog = [];
  for (let moveIndex = 0; moveIndex < maxMoves; moveIndex += 1) {
    const planningStartedMs = Date.now() - captureStartedAt;
    const state = await readState(page);
    if (state.overlayVisible) break;
    const plan = planSet(state);
    const move = plan[0];
    const dragStartedMs = Date.now() - captureStartedAt;
    const useFast = fast && (slowFromMove === 0 || moveIndex + 1 < slowFromMove);
    await dragMove(page, state, move, useFast);
    const dragEndedMs = Date.now() - captureStartedAt;
    const after = await readState(page);
    const lockedTargetFilled = lockedSixLineTarget
      ? lockedSixLineTarget.requiredCells.filter(([r, c]) => Boolean(after.board[r][c])).length
      : null;
    moveLog.push({
      move: moveIndex + 1,
      planningStartedMs,
      dragStartedMs,
      dragEndedMs,
      slot: move.slot,
      target: [move.c0, move.r0],
      lines: after.linesRun - state.linesRun,
      plannedLines: move.lines,
      plannedBombs: move.bombs,
      plannedSpecials: move.detonated,
      combo: after.combo,
      score: after.score,
      occupied: after.boardOccupied,
      bombsOnBoard: after.specials.flat().filter((special) => special === "bomb").length,
      lockedSixLineTarget: lockedSixLineTarget?.id ?? null,
      lockedTargetFilled,
      lockedTargetNeeded: lockedSixLineTarget?.requiredCells.length ?? null,
      lockedTargetBombs: lockedSixLineTarget ? targetBombCount(after.specials, lockedSixLineTarget) : null,
      squarePieceAvailable: after.pieces.filter(Boolean).some((piece) => piece.cols === 3 && piece.rows === 3 && piece.cells.length === 9),
      captureSpeed: useFast ? "search" : "readable",
    });
    if (targetLines > 0 && move.lines >= targetLines && move.bombs >= targetBombs) break;
  }
  await page.waitForTimeout(fast && slowFromMove === 0 ? 250 : 1200);
  const finalState = await readState(page);
  const audio = searchOnly ? null : await page.evaluate(async () => window.__listingCapture?.stopAudioCapture?.());
  if (!searchOnly && !audio?.base64) throw new Error("[block-burst] Trailer audio capture unavailable");
  const captureStoppedAt = Date.now();

  await page.close();
  await context.close();
  const durationSeconds = (captureStoppedAt - captureStartedAt) / 1000;
  let output = null;
  if (!searchOnly) {
    const recordedVideo = await video.path();
    const rawVideo = resolve(rawDir, `${captureName}-page.webm`);
    const rawAudio = resolve(rawDir, `${captureName}-audio.webm`);
    copyFileSync(recordedVideo, rawVideo);
    writeFileSync(rawAudio, Buffer.from(audio.base64, "base64"));
    rmSync(recorderDir, { recursive: true, force: true });

    const trimSeconds = Math.max(0, (captureStartedAt - pageCreatedAt) / 1000);
    output = resolve(outputDir, `${captureName}-gameplay.mp4`);
    execFileSync("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      "-ss", trimSeconds.toFixed(3), "-i", rawVideo,
      "-i", rawAudio,
      "-map", "0:v:0", "-map", "1:a:0",
      "-t", durationSeconds.toFixed(3),
      "-vf", `fps=30,scale=${captureWidth}:${captureHeight}:flags=lanczos,setsar=1`,
      "-af", "apad=pad_dur=40",
      "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
      "-movflags", "+faststart", output,
    ], { stdio: "inherit" });
  } else {
    rmSync(recorderDir, { recursive: true, force: true });
  }

  const report = {
    seed,
    fast,
    searchOnly,
    bigClear,
    slowFromMove,
    targetLines,
    targetBombs,
    orientation: portrait ? "portrait" : "landscape",
    durationSeconds,
    maxLinesClearedByMove: moveLog.reduce((max, move) => Math.max(max, move.lines), 0),
    moveLog,
    finalState,
    output,
  };
  const reportPath = resolve(outputDir, searchOnly ? `${captureName}-search-${seed}-report.json` : `${captureName}-report.json`);
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  if (searchOnly) {
    console.log(JSON.stringify({
      seed,
      moves: moveLog.length,
      maxLinesClearedByMove: report.maxLinesClearedByMove,
      maxBombsTriggeredByMove: moveLog.reduce((max, move) => Math.max(max, move.plannedBombs), 0),
      bombsOnBoard: finalState.specials.flat().filter((special) => special === "bomb").length,
      lockedSixLineTarget: lockedSixLineTarget?.id ?? null,
      found: moveLog.some((move) => move.plannedLines >= targetLines && move.plannedBombs >= targetBombs),
      reportPath,
    }, null, 2));
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
} finally {
  await browser.close();
}
