export interface UpdateEntry {
  version: string;
  date: string;
  title: string;
  bullets: string[];
}

export const UPDATES_LATEST_VERSION = "0.8.0";

export const UPDATES_STORAGE_KEY = "bruno_updates_seen";

export const CHANGELOG: UpdateEntry[] = [
  {
    version: "0.8.0",
    date: "2026-08-18",
    title: "Item shop, coin rewards & cosmetic skins",
    bullets: [
      "Item shop — spend coins on card backs and table backgrounds, then equip them from the shop.",
      "Coin rewards — earn coins every game (winner +20, best loser +8, middle +5, vault bonuses).",
      "Daily login streak — sign in each day for a growing coin bonus (up to +15 per day).",
      "Your equipped card back shows on the deck, your seat fan, and flying draw cards.",
      "Your equipped background themes the game table and page while you play.",
      "Opponent seats show each player's own card back — everyone's cosmetics are visible.",
      "Rooms profile card displays your currently equipped card back and background.",
    ],
  },
  {
    version: "0.7.0",
    date: "2026-08-17",
    title: "Stalemate end-game & Cruelty rework",
    bullets: [
      "A running game timer at the top of the board shows how long the current match has been going.",
      "Stalemate — if the deck empties and no one has won after a full round, the player with the fewest cards wins with normal scoring.",
      "The end-game screen now shows the reason the game ended (first to empty hand or deck exhausted).",
      "Cruelty now lifts when both victims reach 10 or fewer cards instead of exactly 1.",
    ],
  },
  {
    version: "0.6.0",
    date: "2026-08-17",
    title: "Active passives panel",
    bullets: [
      "A new panel in the bottom-right corner shows your active passives with large square icon tiles.",
      "Hover any icon to see the full effect description and who applied it.",
      "Each passive is shown to the player who needs the info — casters see their own, targets see debuffs on them.",
      "Page refresh reconnect — your last game is saved so you rejoin automatically after a refresh or network drop.",
    ],
  },
  {
    version: "0.5.0",
    date: "2026-08-15",
    title: "Leaderboard & bigger UI",
    bullets: [
      "Leaderboard — the top 25 players by rank points, opened from the rooms page or in-game.",
      "Your rank, icon and wins are highlighted on your own leaderboard row.",
      "The whole UI is now 15% larger — every modal, label and button reads bigger.",
    ],
  },
  {
    version: "0.4.0",
    date: "2026-08-15",
    title: "Ranks, How-to-Play & room minimums",
    bullets: [
      "Ranks page — browse every rank from Bronze 3 to Bruno with the exact point ranges.",
      "How to Play — a full tutorial covering turns, special cards, the vault, locations, Hell Gate and origins.",
      "Your profile lives in the lobby — edit icon, username and email right from the rooms page.",
      "Rooms now need at least 3 players. Localhost still allows solo games for testing.",
      "Middle-pack scoring — everyone between the best and worst loser now gains +2 to −4 points instead of a flat 0.",
    ],
  },
  {
    version: "0.3.0",
    date: "2026-08-15",
    title: "Rank points, profiles & winner scoring",
    bullets: [
      "Rank points — winning scores +5 (plus +1 per vault card, up to +10); losers earn +3 for the best hand or lose 5 for the worst.",
      "Profile refresh — points, wins and rank update in the profile tab right after a game, no reload needed.",
      "Signed-in identity — you play as your profile username and your rank badge shows on your seat.",
      "Winner reveal now shows the points you earned (and lost) at the end of every round.",
    ],
  },
  {
    version: "0.2.0",
    date: "2026-08-15",
    title: "Google Sign-In, reconnection & vault updates",
    bullets: [
      "Google Sign-In — play with a real account and keep your identity across sessions.",
      "Reconnection — network drops no longer kick you out. Your seat is held for 60s.",
      "Fleeting vault cards — tokens from effects like All In now vanish after use.",
      "Investment vault now offers a choice each round (not auto-draw).",
      "Vault balance updates: Ruin, Mitosis II, Sacrificial Lamb, Scourge, Midas Touch.",
    ],
  },
  {
    version: "0.1.0",
    date: "2026-08-14",
    title: "Vault effects tightened & UX polish",
    bullets: [
      "Vault tokens now offer up to 3 effects per play (was 5).",
      "Vault Guide panel — browse all 62 confirmed vault effects by tier.",
      "Vault pile tooltip shows the effect currently in play.",
      "Public turn timer for every player, not just the active one.",
      "Event history log moved to the bottom-right corner.",
      "Revealed hands can be collapsed player-by-player.",
      "All 62 implemented vault effects confirmed and tagged [Working].",
    ],
  },
  {
    version: "0.0.9",
    date: "2026-08-13",
    title: "Locations, Mayhem & balance audits",
    bullets: [
      "Locations: Hell Gate gated to its own location; mayhem events roll only there.",
      "Audit fixes: volcano multipliers, prayers stacking, future-market timing.",
      "Bug-fix test batch committed for the audited effects.",
    ],
  },
];

export function readSeenUpdates(): string | null {
  try {
    return localStorage.getItem(UPDATES_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function hasUnseenUpdates(): boolean {
  return readSeenUpdates() !== UPDATES_LATEST_VERSION;
}

export function markUpdatesSeen(): void {
  try {
    localStorage.setItem(UPDATES_STORAGE_KEY, UPDATES_LATEST_VERSION);
  } catch {
    // storage unavailable — the panel will just re-show next mount
  }
}
