/**
 * Made-up families, rounds, packs, and themes for the /demo stage. Visual pass
 * only: nothing here talks to the MCP server yet.
 */

export type HairStyle = "short" | "long" | "bun" | "curly" | "ponytail" | "spiky" | "bald";

/** The parts of a player's flat portrait (see components/demo/Avatar). */
export interface Look {
  bg: string;
  skin: string;
  hair: HairStyle;
  hairColor: string;
  shirt: string;
  /** The avatar shape picked with New look; without one, the player's place in the family picks it. */
  shape?: number;
}

export interface DemoMember {
  id: string;
  name: string;
  role: "grown-up" | "kid";
  week: number;
  allTime: number;
  streak?: number;
  owes?: string;
  look: Look;
}

export interface DemoFamily {
  id: string;
  name: string;
  members: DemoMember[];
}

const SKIN = ["#f6cfb3", "#eab48f", "#c98b62", "#9c6440", "#6e4329"] as const;
const HAIR_COLORS = ["#2b1a12", "#5a2d1a", "#c46a2a", "#e0a33a", "#1a1110", "#d9d3e6"] as const;
export const HAIR_STYLES: HairStyle[] = ["short", "long", "curly", "spiky", "ponytail", "bun", "bald"];
export const SWATCHES = ["#ff8fb1", "#ffc53d", "#3ee0c5", "#7cc6ff", "#8b6bff", "#ff9a3c"];
const SHIRTS = ["#7c5cff", "#ff5fa2", "#3ee0c5", "#ff9a3c", "#ffc53d"] as const;

/** A portrait for a new player: the chosen color, and a look that changes with `n`. */
export function newLook(bg: string, n: number): Look {
  return {
    bg,
    skin: SKIN[(n * 3) % SKIN.length]!,
    hair: HAIR_STYLES[n % HAIR_STYLES.length]!,
    hairColor: HAIR_COLORS[(n * 2) % (HAIR_COLORS.length - 1)]!,
    shirt: SHIRTS[(n + 1) % SHIRTS.length]!,
  };
}

/** The same portrait for a name every time. */
export function lookFor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return newLook(SWATCHES[h % SWATCHES.length]!, h % 97);
}

/**
 * Portraits are saved on this device only, by player id. The store keeps a
 * player to a first name, a role, and a grade band (packages/core types.ts),
 * and a drawn likeness of a child is more than that.
 */
const LOOKS_KEY = "heytrivi.looks";
export function savedLooks(): Record<string, Look> {
  try {
    return JSON.parse(localStorage.getItem(LOOKS_KEY) ?? "{}") as Record<string, Look>;
  } catch {
    return {};
  }
}
export function saveLook(playerId: string, look: Look): void {
  try {
    localStorage.setItem(LOOKS_KEY, JSON.stringify({ ...savedLooks(), [playerId]: look }));
  } catch {
    // Private window: the look lasts until reload.
  }
}

const look = (bg: string, skin: number, hair: HairStyle, hairColor: string, shirt: string): Look => ({
  bg,
  skin: SKIN[skin]!,
  hair,
  hairColor,
  shirt,
});

export const FAMILIES: DemoFamily[] = [
  {
    id: "jones",
    name: "Jones Family",
    members: [
      { id: "mom", name: "Mom", role: "grown-up", week: 120, allTime: 1840, streak: 5, look: look("#ff8fb1", 0, "long", "#5a2d1a", "#7c5cff") },
      { id: "dad", name: "Dad", role: "grown-up", week: 90, allTime: 1615, owes: "Dishes tonight", look: look("#7cc6ff", 1, "short", "#2b1a12", "#ff9a3c") },
      { id: "billy", name: "Billy", role: "kid", week: 115, allTime: 1290, streak: 3, look: look("#ffc53d", 0, "spiky", "#c46a2a", "#3ee0c5") },
      { id: "sally", name: "Sally", role: "kid", week: 70, allTime: 980, owes: "Feed the dog", look: look("#3ee0c5", 0, "ponytail", "#e0a33a", "#ff5fa2") },
    ],
  },
  {
    id: "garcia",
    name: "Garcia Family",
    members: [
      { id: "abuela", name: "Abuela", role: "grown-up", week: 140, allTime: 2210, streak: 9, look: look("#ffc53d", 2, "bun", "#d9d3e6", "#ff5fa2") },
      { id: "papa", name: "Papá", role: "grown-up", week: 85, allTime: 1390, look: look("#7cc6ff", 2, "short", "#1d1410", "#3ee0c5") },
      { id: "lucia", name: "Lucía", role: "kid", week: 150, allTime: 1505, streak: 4, look: look("#ff8fb1", 2, "curly", "#2b1a12", "#ffc53d") },
      { id: "mateo", name: "Mateo", role: "kid", week: 60, allTime: 870, owes: "Fold the laundry", look: look("#8b6bff", 2, "spiky", "#2b1a12", "#ff9a3c") },
    ],
  },
  {
    id: "okafor",
    name: "Okafor Family",
    members: [
      { id: "ada", name: "Ada", role: "grown-up", week: 105, allTime: 1720, look: look("#3ee0c5", 4, "bun", "#1a1110", "#ff5fa2") },
      { id: "chidi", name: "Chidi", role: "grown-up", week: 130, allTime: 1655, streak: 6, look: look("#ff9a3c", 4, "bald", "#1a1110", "#7c5cff") },
      { id: "nneka", name: "Nneka", role: "kid", week: 95, allTime: 1120, look: look("#ffc53d", 3, "curly", "#1a1110", "#3ee0c5") },
      { id: "tobi", name: "Tobi", role: "kid", week: 40, allTime: 640, owes: "Take out recycling", look: look("#7cc6ff", 3, "short", "#1a1110", "#ff5fa2") },
    ],
  },
  {
    id: "patel",
    name: "Patel Family",
    members: [
      { id: "nani", name: "Nani", role: "grown-up", week: 75, allTime: 1980, look: look("#8b6bff", 2, "bun", "#e4e0ea", "#ffc53d") },
      { id: "priya", name: "Priya", role: "grown-up", week: 125, allTime: 1610, streak: 2, look: look("#ff8fb1", 1, "long", "#1d1210", "#3ee0c5") },
      { id: "raj", name: "Raj", role: "grown-up", week: 110, allTime: 1475, look: look("#3ee0c5", 1, "short", "#1d1210", "#7c5cff") },
      { id: "anika", name: "Anika", role: "kid", week: 135, allTime: 1060, streak: 7, look: look("#ffc53d", 1, "ponytail", "#1d1210", "#ff5fa2") },
      { id: "dev", name: "Dev", role: "kid", week: 55, allTime: 720, owes: "Water the plants", look: look("#7cc6ff", 1, "spiky", "#1d1210", "#ff9a3c") },
    ],
  },
];

/**
 * The scripted rounds the mic plays. `answerer` is an index into the family,
 * so the same script works for every family; `{name}` becomes their name.
 */
export interface DemoRound {
  round: number;
  pack: string;
  packColor: string;
  stake: string;
  question: string;
  answerer: number;
  heard: string;
  reply: string;
  points: number;
}

export const ROUNDS: DemoRound[] = [
  {
    round: 3,
    pack: "Dinosaur Detectives",
    packColor: "#3ee0c5",
    stake: "Loser takes out the trash",
    question: "Which dinosaur had three horns and a big bony frill around its neck?",
    answerer: 2,
    heard: "Is it a triceratops?",
    reply: "Triceratops is right! Ten points to {name}.",
    points: 10,
  },
  {
    round: 4,
    pack: "Kitchen Table Riddles",
    packColor: "#ffc53d",
    stake: "Loser takes out the trash",
    question: "Riddle time! What has hands and a face, but can't clap or smile?",
    answerer: 3,
    heard: "A clock!",
    reply: "A clock! Nice thinking. Ten points to {name}.",
    points: 10,
  },
  {
    round: 5,
    pack: "Lost in Space",
    packColor: "#8b6bff",
    stake: "Loser takes out the trash",
    question: "Last one! Which planet is famous for its big, beautiful rings?",
    answerer: 0,
    heard: "Saturn, obviously.",
    reply: "Saturn it is! Ten points to {name}.",
    points: 10,
  },
];

export interface DemoPack {
  id: string;
  name: string;
  blurb: string;
  count: number;
  color: string;
  on: boolean;
}

export const PACKS: DemoPack[] = [
  { id: "dinos", name: "Dinosaur Detectives", blurb: "Ages 6 to 9", count: 12, color: "#3ee0c5", on: true },
  { id: "space", name: "Lost in Space", blurb: "Planets and stars", count: 10, color: "#8b6bff", on: true },
  { id: "riddles", name: "Kitchen Table Riddles", blurb: "Everyone can play", count: 8, color: "#ffc53d", on: true },
  { id: "movies", name: "Movie Night", blurb: "Grown-ups vs. kids", count: 15, color: "#ff8fb1", on: false },
  { id: "animals", name: "Wild Animals", blurb: "Ages 4 and up", count: 9, color: "#ff9a3c", on: false },
];

/** The two looks for the stage: the dark game show, and a flat, bright one in the style of Duolingo. */
export type Skin = "show" | "duo";

/** Each theme has a name and preview colors per skin; the stage colors live in demo.css and duo.css. */
export const THEMES = [
  {
    id: "showtime",
    show: { name: "Showtime", blurb: "Purple stage, gold lights", colors: { bg: "#26093f", frame: "#6d4dff", bulb: "#ffd36b", accent: "#ff5fa2" } },
    duo: { name: "Grape", blurb: "Purple stage, gold lights", colors: { bg: "#f7f7f7", frame: "#ce82ff", bulb: "#ffc800", accent: "#f6ecff" } },
  },
  {
    id: "arcade",
    show: { name: "Midnight Arcade", blurb: "Neon blue, ice lights", colors: { bg: "#071233", frame: "#2b6bff", bulb: "#b9f6ff", accent: "#22d3ee" } },
    duo: { name: "Sky", blurb: "Bright blue, sunny lights", colors: { bg: "#f7f7f7", frame: "#1cb0f6", bulb: "#ffc800", accent: "#e8f7fe" } },
  },
  {
    id: "sunset",
    show: { name: "Sunset Studio", blurb: "Warm plum and coral", colors: { bg: "#3a0d26", frame: "#ff7a59", bulb: "#ffe6a0", accent: "#ff5f6d" } },
    duo: { name: "Tangerine", blurb: "Warm orange and gold", colors: { bg: "#f7f7f7", frame: "#ff9600", bulb: "#ffc800", accent: "#fff4e5" } },
  },
  {
    id: "pajama",
    show: { name: "Pajama Party", blurb: "Soft pink, cozy night in", colors: { bg: "#ffd6e1", frame: "#8a6cff", bulb: "#ffd36b", accent: "#ff5f8f" } },
    duo: { name: "Bubblegum", blurb: "Pink and playful", colors: { bg: "#f7f7f7", frame: "#ff6bc1", bulb: "#ffc800", accent: "#ffeef8" } },
  },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
