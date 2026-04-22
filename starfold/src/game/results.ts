import type { PlatformSnapshot } from "../platform";

export interface FrozenHudSnapshot {
  rank: number | null;
  bestScore: number | null;
}

export type GameOverResult = "normal" | "new_best" | "first_recorded";

export function freezeHudSnapshot(snapshot: PlatformSnapshot): FrozenHudSnapshot {
  if (!snapshot.isLoggedIn) {
    return {
      rank: null,
      bestScore: null,
    };
  }

  return {
    rank: snapshot.playerRank,
    bestScore: snapshot.playerBestScore,
  };
}

export function classifyGameOverResult(options: {
  previous: FrozenHudSnapshot;
  current: FrozenHudSnapshot;
  finalScore: number;
}): GameOverResult {
  const { previous, current, finalScore } = options;
  if (current.bestScore !== finalScore) {
    return "normal";
  }
  if (previous.bestScore === null) {
    return "first_recorded";
  }
  if (finalScore > previous.bestScore) {
    return "new_best";
  }
  return "normal";
}

export function formatScore(score: number): string {
  return new Intl.NumberFormat("en-US").format(score);
}

export function formatNewHighScoreSubtitle(options: {
  finalScore: number;
  previousRank: number | null;
  nextRank: number | null;
}): string {
  void options;
  return "new high score";
}
