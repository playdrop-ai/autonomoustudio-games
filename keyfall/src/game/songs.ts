export interface SongConfig {
  id: string;
  label: string;
  level: number;
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
    id: "bloom",
    label: "BLOOM",
    level: 0,
    bpm: 96,
    accent: "#89f0ff",
    ambient: "#102131",
    rootMidi: 60,
    kick: pattern("x---x---x---x---"),
    hat: pattern("----x-------x---"),
    bass: notes([null, null, null, null, 0, null, null, null, 0, null, null, null, 5, null, null, null]),
    lead: notes([null, null, null, null, 12, null, null, null, 14, null, null, null, 15, null, null, null]),
  },
  {
    id: "drift",
    label: "DRIFT",
    level: 1,
    bpm: 104,
    accent: "#b8ffcf",
    ambient: "#12261c",
    rootMidi: 57,
    kick: pattern("x---x---x---x---"),
    hat: pattern("--x---x---x---x-"),
    bass: notes([0, null, null, 3, 0, null, null, 3, 5, null, null, 5, 3, null, null, 3]),
    lead: notes([null, 12, null, 12, null, 14, null, 14, null, 15, null, 15, null, 14, null, 12]),
  },
  {
    id: "glass",
    label: "GLASS",
    level: 2,
    bpm: 112,
    accent: "#63e6ff",
    ambient: "#0e2435",
    rootMidi: 57,
    kick: pattern("x---x---x---x---"),
    hat: pattern("x---x-x-x---x-x-"),
    bass: notes([0, null, null, 7, 0, null, null, 5, 0, null, null, 7, 0, null, null, 10]),
    lead: notes([12, null, 14, null, 15, null, 14, null, 12, null, 14, null, 19, null, 17, null]),
  },
  {
    id: "nova",
    label: "NOVA",
    level: 3,
    bpm: 120,
    accent: "#ffd780",
    ambient: "#2b2413",
    rootMidi: 60,
    kick: pattern("x---x---x---x---"),
    hat: pattern("x-x-x-xxx-x-x-xx"),
    bass: notes([0, null, null, 5, 0, null, 7, null, 0, null, null, 8, 0, null, 5, null]),
    lead: notes([12, null, 19, null, 17, null, 15, null, 12, null, 19, null, 17, null, 15, null]),
  },
  {
    id: "rush",
    label: "RUSH",
    level: 4,
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
    id: "echo",
    label: "ECHO",
    level: 5,
    bpm: 136,
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
