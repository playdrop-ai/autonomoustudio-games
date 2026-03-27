export interface SongConfig {
  id: string;
  label: string;
  bpm: number;
  accent: string;
  ambient: string;
  rootMidi: number;
  kick: boolean[];
  hat: boolean[];
  bass: Array<number | null>;
  lead: Array<number | null>;
}

export const SONGS: SongConfig[] = [
  {
    id: "glass",
    label: "GLASS",
    bpm: 118,
    accent: "#63e6ff",
    ambient: "#0e2435",
    rootMidi: 57,
    kick: pattern("x---x---x---x---"),
    hat: pattern("x-x-xxxxx-x-xxxx"),
    bass: notes([0, null, null, 7, 0, null, null, 5, 0, null, null, 7, 0, null, null, 10]),
    lead: notes([12, null, 14, null, 15, null, 14, null, 12, null, 14, null, 19, null, 17, null]),
  },
  {
    id: "rush",
    label: "RUSH",
    bpm: 128,
    accent: "#ff88a5",
    ambient: "#261423",
    rootMidi: 52,
    kick: pattern("x---x---x---x-x-"),
    hat: pattern("xxxxxxxxx-xxxxxx"),
    bass: notes([0, null, 7, null, 0, null, 8, null, 0, null, 7, null, 3, null, 5, null]),
    lead: notes([12, 12, null, 15, 17, null, 15, null, 12, 12, null, 19, 17, null, 15, null]),
  },
  {
    id: "nova",
    label: "NOVA",
    bpm: 110,
    accent: "#ffd780",
    ambient: "#2b2413",
    rootMidi: 60,
    kick: pattern("x---x---x---x---"),
    hat: pattern("x-x-x-xxx-x-x-xx"),
    bass: notes([0, null, null, 5, 0, null, 7, null, 0, null, null, 8, 0, null, 5, null]),
    lead: notes([12, null, 19, null, 17, null, 15, null, 12, null, 19, null, 17, null, 15, null]),
  },
  {
    id: "echo",
    label: "ECHO",
    bpm: 138,
    accent: "#7ef0c0",
    ambient: "#10281f",
    rootMidi: 55,
    kick: pattern("x---x-x-x---x-x-"),
    hat: pattern("xxxxxxxxxxxxxxxx"),
    bass: notes([0, null, 3, null, 0, null, 7, null, 0, null, 3, null, 8, null, 10, null]),
    lead: notes([15, null, 17, 19, 22, null, 19, 17, 15, null, 17, 19, 24, null, 22, 19]),
  },
];

function pattern(value: string): boolean[] {
  return [...value].map((char) => char === "x");
}

function notes(values: Array<number | null>): Array<number | null> {
  return values;
}
