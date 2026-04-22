import type { GameApi } from "./ui/hud";

declare global {
  interface Window {
    __pocketBastion__?: GameApi;
    render_game_to_text?: () => string;
  }
}

export {};
