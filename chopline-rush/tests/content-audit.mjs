import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.join(root, filePath), "utf8"));
}

function assertFile(filePath) {
  assert(fs.existsSync(path.join(root, filePath)), `Missing file: ${filePath}`);
}

function extractArraySection(source, declaration) {
  const match = source.match(new RegExp(`const ${declaration}[^=]*= \\[(.*?)\\n\\];`, "s"));
  assert(match, `Could not find ${declaration}`);
  return match[1];
}

function auditWorkspace() {
  const parentCataloguePath = path.join(root, "..", "catalogue.json");
  if (!fs.existsSync(parentCataloguePath)) return;
  const parentCatalogue = JSON.parse(fs.readFileSync(parentCataloguePath, "utf8"));
  assert(Object.keys(parentCatalogue).length === 0, "Workspace root catalogue.json must stay empty");
}

function auditCatalogue() {
  const pkg = readJson("package.json");
  const catalogue = readJson("catalogue.json");
  assert(Array.isArray(catalogue.apps) && catalogue.apps.length === 1, "Catalogue must contain one app");
  const app = catalogue.apps[0];

  assert(app.name === "chopline-rush", "Catalogue app name mismatch");
  assert(app.version === pkg.version && app.version === "1.2.0", "Production progression release version must be 1.2.0");
  assert(app.type === "GAME", "Catalogue type must be GAME");
  assert(app.file === "dist/index.html", "Catalogue must point at dist/index.html");
  assert(app.visibility === "PUBLIC", "Catalogue visibility must be PUBLIC");
  assert(app.authMode === "OPTIONAL", "Catalogue auth mode must be OPTIONAL");
  assert(app.previewable === true, "Game must remain previewable");
  assert(app.surfaceTargets?.mobilePortrait === true, "Mobile portrait must be the primary supported surface");
  assert(app.surfaceTargets?.mobileLandscape === false, "Mobile landscape must stay disabled");
  assert(app.surfaceTargets?.desktop === true, "Desktop compatibility must remain available");
  assert(app.primarySurface === "MOBILE_PORTRAIT", "Mobile portrait must be declared as the primary surface");
  assert(app.playtestTapes?.MOBILE_PORTRAIT?.events?.length >= 3, "Portrait must have a multi-tap gameplay tape");
  assert(app.playtestTapes?.DESKTOP?.events?.length >= 3, "Desktop compatibility must have a gameplay tape");

  const leaderboards = app.leaderboards ?? [];
  assert(JSON.stringify(leaderboards.map((entry) => entry.key)) === JSON.stringify(["max_level", "endless_score"]), "Level progress and endless score leaderboards must both be configured");
  assert(leaderboards.every((entry) => entry.scoreType === "INTEGER" && entry.sort === "DESC"), "Leaderboards must rank integer scores descending");
  const legacyAchievementKeys = [
    "first_slice", "combo_twelve", "combo_twentyfive", "first_revive", "first_upgrade",
    "all_knives", "level_five", "level_fifteen", "level_thirty", "endless_1000",
    "endless_2500", "ten_runs", "thousand_slices", "coin_bank",
  ];
  assert(JSON.stringify((app.achievements ?? []).map((entry) => entry.key)) === JSON.stringify(legacyAchievementKeys), "Published achievement definitions must remain compatible with existing player metadata");
  assert(JSON.stringify(app.design) === JSON.stringify({
    genre: "game-genre/arcade",
    coreGameplay: "core-gameplay/rhythm",
    perspective: "perspective/3d-third-person",
    controls: "game-controls/tap",
    visualStyle: "visual-style/stylized",
    progression: "game-progression/levels",
    feel: "game-feel/snappy",
  }), "Catalogue design tags must describe the portrait level-based knife runner");

  assertFile(app.listing.icon);
  assertFile(app.listing.heroLandscape);
  assertFile(app.listing.heroPortrait);
  for (const media of [...(app.listing.screenshotsLandscape ?? []), ...(app.listing.screenshotsPortrait ?? [])]) assertFile(media);
}

function auditOwnedAssets(source) {
  const knifeSection = extractArraySection(source, "KNIVES");
  const modelPaths = Array.from(knifeSection.matchAll(/model: "([^"]+)"/g), (match) => match[1]);
  const imagePaths = Array.from(knifeSection.matchAll(/image: "([^"]+)"/g), (match) => match[1]);
  const sourceRefs = Array.from(knifeSection.matchAll(/sourceRef: "([^"]+)"/g), (match) => match[1]);
  assert(modelPaths.length === 6 && imagePaths.length === 6 && sourceRefs.length === 6, "Every knife must have a model, preview, and PlayDrop source ref");
  for (const filePath of [...modelPaths, ...imagePaths]) assertFile(filePath);
  assert(source.includes('const STARTER_KNIFE_ID = "cooking";'), "The two-tone cooking knife must be the starter model for silhouette readability");
  assert(source.includes('sourceAxis: "x"') && source.includes("bladeDirection: -1"), "Knife models must declare explicit visual axes and blade direction");
}

function auditProductContract(source, levelsSource) {
  assert(source.includes('let selectedMode: Mode = "level";'), "The app must boot into authored level progression");
  assert(source.includes('type Mode = "level" | "endless";'), "Levels must be primary while endless remains available");
  assert((levelsSource.match(/^\s+\["/gm) ?? []).length === 60, "The release must contain exactly 60 named level seeds");
  assert(source.includes("function buildLevelWorld(level: LevelBlueprint): void"), "Authored levels need a finite world builder");
  assert(source.includes("function buildReferenceOpeningLevel(level: LevelBlueprint): void"), "Level 1 must copy the captured reference opening");
  assert(source.includes('id: "tutorial_runway", y: 0, z: 4.4, depth: 27.6') && source.includes('type: "apple_green", y: 0.5, z: 11.3'), "The reference pedestal, narrow gap, runway, and first green apple composition is missing");
  assert(source.includes('"TAP ANYWHERE"') && source.includes('"TO JUMP AND FLIP!"') && source.includes("function createTutorialInstruction()"), "The exact in-world Slice Master instruction is missing");
  assert(source.includes('type: "apple_red"') && source.includes('type: "apple_yellow"'), "The green/red/yellow tutorial apple cadence is missing");
  assert(!source.includes("tutorialCues") && !source.includes('"TAP IN AIR"') && !source.includes('"HIT THE GLOWING RING"'), "Invented multi-step tutorial choreography must not return");
  assert(source.includes('currentRun.tutorialStep = "land";') && source.includes('platformEntity.id === "tutorial_runway"'), "The first tap must advance into a physically verified runway landing");
  assert(source.includes('slice.id === tutorialTargetId') && source.includes('currentRun.tutorialStep = "complete";'), "The tutorial must complete only after the first green apple is sliced");
  assert(source.includes("function buildFinalChopStation("), "Every level needs a physical final-chop station");
  assert(source.includes('platformEntity.id === "level_finish"'), "Level completion must require a blade plant on the final board");
  assert(source.includes("finaleTargetsCleared()"), "The final marked stack must be cut before completion");
  assert(!source.includes("function spawnFinishGate("), "The rejected decorative finish gate must not return");
  assert(source.includes("function completeLevel(): void"), "Authored levels need a dedicated completion path");
  assert(source.includes('profile.ftueCompleted = true;'), "The FTUE must persist after the first reference apple cut");
  assert(source.includes('const openingSequence = [0, 1, 2, 3];'), "The curated opening sequence must remain deterministic");
  assert(source.includes("const openingGaps = [1.55, 1.1, 1.4, 1.6];"), "The learned opening cadence must remain deterministic");
  assert(source.includes("zone.gap[0] + Math.random() * (zone.gap[1] - zone.gap[0])"), "Post-opening gaps must come from the authored zone ranges");
  assert(source.includes("return zones;"), "Endless must use the reviewed authored zone pool");
  assert(source.includes('sliceables: [{ type: "brick", y: 0.5, z: 1.4, count: 13 }]'), "The close opening brick wall is missing");
  assert(source.includes('{ type: "emoji", y: 0.5, z: 5.5 }') && source.includes('{ type: "camera", y: 0.5, z: 2.2 }'), "The observed orange, emoji, and camera opening beats are missing");
  assert(/function scoreForSlice\([^)]*\): number \{[\s\S]*?return 1;\s*\}/.test(source), "Every cut must be worth exactly one point");
  assert(source.includes("currentRun.coinsAwarded += 1;"), "Every cut must collect one coin");
  assert(source.includes("profile.coins += 1;"), "Collected coins must immediately update the persistent wallet");
  assert(source.includes('await platform.submitLeaderboard(LEADERBOARD_ENDLESS, profile.endlessBest);'), "Best endless score must submit to PlayDrop");
  assert(source.includes("await platform.submitLeaderboard(LEADERBOARD_LEVEL, profile.highestLevel);"), "Level progress must submit to PlayDrop");
  assert(source.includes('run?.mode === "endless" && run.endlessTimerActive ? "flex" : "none"'), "Endless survival timer must be visible whenever active");
  assert(source.includes("window.render_game_to_text ="), "The production build must expose deterministic textual game state");
  assert(source.includes("window.advanceTime = advanceSimulation;"), "The production build must expose deterministic time advancement");
}

function auditGameplayParity(source) {
  assert(source.includes("const FLIP_COOLDOWN = 0.4;") && source.includes("const TUTORIAL_FLIP_COOLDOWN = 0.15;"), "The tutorial must use the captured 0.15s cooldown without destabilizing later authored levels");
  assert(source.includes("const BASE_FLIP_Y = 10;") && source.includes("const TUTORIAL_BASE_FLIP_Y = 11.7;") && source.includes("const BASE_FLIP_Z = 8;"), "The tutorial must use the captured 11.7 vertical feel while preserving the tuned later-level model");
  assert(source.includes("const TUTORIAL_GRAVITY = -23;") && source.includes("const TUTORIAL_ROTATION_SPEED = THREE.MathUtils.degToRad(560);"), "Tutorial gravity and rotation must match the shipped Slice Master values");
  assert(source.includes("function usesReferenceTutorialMotion()"), "Reference motion must be isolated to Level 1 so the 60-level course remains playable");
  assert(source.includes("Math.min(launchY, knife.velocity.y + AIR_FLIP_IMPULSE_Y)"), "Air taps must add capped lift so cadence changes trajectory height without spam escalation");
  assert(source.includes("const minTarget = rotation + Math.PI;"), "Rotation targets must advance at least half a turn per tap");
  assert(source.includes("return n * Math.PI * 2 + ready;"), "Rotation targets must always land on the canonical blade-down angle");
  assert(source.includes("function nearestCanonicalAngle"), "Slice-lock must ease toward the nearest canonical angle");
  assert(source.includes("const SLICE_LOCK_MIN_ANGLE"), "Slice-lock entry must be gated by blade angle");
  assert(source.includes("knife.velocity.z = hasSiblingBelow ? 0 : knife.velocity.z * 0.3;"), "Slice-lock must stop forward travel and carve down through stacks");
  assert(source.includes("const SLICE_ROT_SPEED = 8;"), "Slice-lock rotation must ease at 8 rad/s");
  assert(source.includes("bladeWillHit"), "Handle-first contact must forgive cuts the blade would complete within a half turn");
  assert(source.includes("knife.velocity.z = -knife.velocity.z * 0.5;"), "Handle bounces must reverse and halve forward speed while preserving fall");
  assert(source.includes("function enterRotatingStick(platformEntity: PlatformEntity): void"), "Bad-angle blade landings must rotate into a stick");
  assert(source.includes("const MIN_STICK_ALIGNMENT = 0.3;"), "Stick alignment must reject blades pointing away from the face");
  assert(source.includes("const KNIFE_VISUAL_X = 0;"), "The knife must stay on the course centerline");
  assert(source.includes("readyAngle: (Math.PI * 2) / 3"), "Knife skins must use the blade-forward planted angle");
  assert(source.includes("knife.landingPunch = 0.75 + impactSpeed * 0.25;"), "Blade landings must have impact squash");
  assert(source.includes("spawnSlicePieces(slice);"), "A cut must spawn persistent physical halves");
  assert(source.includes("const FRAGMENT_GRAVITY = -15;"), "Cut halves must use the scripted slide/fall/settle fragment model");
  assert(source.includes('piece.phase = "falling";') && source.includes("lockPieceRestAngle(piece);"), "Fragments must slide off the edge, tumble, and settle");
  assert(source.includes('if (type === "brick") {'), "Brick walls need dedicated intact and split geometry");
  assert(source.includes("interiorColorForSlice(type, stackIndex)"), "Cut brick courses must expose authored interior colors");
  assert(source.includes("spawnScorePopup(position, points);"), "Cuts must show immediate +1 feedback");
  assert(source.includes("hitStopTime = Math.max(hitStopTime, 0.04);"), "Cut contact must hold a brief hit stop");
  assert(source.includes("startCameraShake("), "Cuts and landings must drive camera impact");
}

function auditShopContract(source) {
  const themeSection = extractArraySection(source, "THEMES");
  const themeIds = Array.from(themeSection.matchAll(/id: "([^"]+)"/g), (match) => match[1]);
  assert(JSON.stringify(themeIds) === JSON.stringify(["forest", "beach", "sunset"]), "Shop must contain exactly the three approved themes");
  assert(source.includes("profile.ownedThemes.push(theme.id);"), "Theme purchases must persist ownership");
  assert(source.includes("profile.equippedTheme = theme.id;"), "Theme selection must persist the active theme");
  assert(!source.includes('void platform.unlockAchievements(profile.ownedKnives.length'), "Knife upgrades must not call removed achievements");
}

function main() {
  auditWorkspace();
  auditCatalogue();
  const source = fs.readFileSync(path.join(root, "src/main.ts"), "utf8");
  const levelsSource = fs.readFileSync(path.join(root, "src/game/levels.ts"), "utf8");
  auditOwnedAssets(source);
  auditProductContract(source, levelsSource);
  auditGameplayParity(source);
  auditShopContract(source);
  assertFile("SPECS.md");
  assertFile("dist/index.html");
  console.log("[content-audit] passed");
}

main();
