import { CardId, rankValue } from '../cards/textures';

export type HandRankName =
  | 'High Card'
  | 'One Pair'
  | 'Two Pair'
  | 'Three of a Kind'
  | 'Straight'
  | 'Flush'
  | 'Full House'
  | 'Four of a Kind'
  | 'Straight Flush'
  | 'Royal Flush';

export interface EvaluatedHand {
  name: HandRankName;
  /** Higher is better. First element is category 0..9, then kickers. */
  score: number[];
  cards: CardId[];
}

const CATEGORY: Record<HandRankName, number> = {
  'High Card': 0,
  'One Pair': 1,
  'Two Pair': 2,
  'Three of a Kind': 3,
  Straight: 4,
  Flush: 5,
  'Full House': 6,
  'Four of a Kind': 7,
  'Straight Flush': 8,
  'Royal Flush': 9,
};

function byRankDesc(a: CardId, b: CardId): number {
  return rankValue(b.rank) - rankValue(a.rank);
}

function uniqueRanksDesc(cards: CardId[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const c of [...cards].sort(byRankDesc)) {
    const v = rankValue(c.rank);
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

function isFlush(cards: CardId[]): boolean {
  const s = cards[0]!.suit;
  return cards.every((c) => c.suit === s);
}

/** Returns high card of straight (14 for broadway, 5 for wheel) or null. */
function straightHigh(cards: CardId[]): number | null {
  const vals = uniqueRanksDesc(cards);
  // Wheel: A-2-3-4-5
  if (
    vals.includes(14) &&
    vals.includes(5) &&
    vals.includes(4) &&
    vals.includes(3) &&
    vals.includes(2)
  ) {
    // Need exactly those for 5-card; for 5 cards unique ranks length 5
    if (vals.length === 5) return 5;
  }
  if (vals.length < 5) return null;
  // Check consecutive from highest
  for (let i = 0; i <= vals.length - 5; i++) {
    const slice = vals.slice(i, i + 5);
    let ok = true;
    for (let j = 1; j < 5; j++) {
      if (slice[j]! !== slice[0]! - j) {
        ok = false;
        break;
      }
    }
    if (ok) return slice[0]!;
  }
  // Also check wheel when more than 5 unique? for 5-card eval vals.length === 5
  return null;
}

function countRanks(cards: CardId[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const c of cards) {
    const v = rankValue(c.rank);
    m.set(v, (m.get(v) ?? 0) + 1);
  }
  return m;
}

/** Evaluate exactly 5 cards. */
export function evaluate5(cards: CardId[]): EvaluatedHand {
  if (cards.length !== 5) throw new Error('evaluate5 needs 5 cards');
  const flush = isFlush(cards);
  const sHigh = straightHigh(cards);
  const counts = countRanks(cards);
  const groups = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });

  let name: HandRankName;
  let score: number[];

  if (flush && sHigh !== null) {
    if (sHigh === 14) {
      name = 'Royal Flush';
      score = [CATEGORY[name]];
    } else {
      name = 'Straight Flush';
      score = [CATEGORY[name], sHigh];
    }
  } else if (groups[0]![1] === 4) {
    name = 'Four of a Kind';
    score = [CATEGORY[name], groups[0]![0], groups[1]![0]];
  } else if (groups[0]![1] === 3 && groups[1]![1] === 2) {
    name = 'Full House';
    score = [CATEGORY[name], groups[0]![0], groups[1]![0]];
  } else if (flush) {
    name = 'Flush';
    score = [CATEGORY[name], ...uniqueRanksDesc(cards)];
  } else if (sHigh !== null) {
    name = 'Straight';
    score = [CATEGORY[name], sHigh];
  } else if (groups[0]![1] === 3) {
    name = 'Three of a Kind';
    const kickers = groups.filter((g) => g[1] === 1).map((g) => g[0]);
    score = [CATEGORY[name], groups[0]![0], ...kickers];
  } else if (groups[0]![1] === 2 && groups[1]![1] === 2) {
    name = 'Two Pair';
    const pairs = [groups[0]![0], groups[1]![0]].sort((a, b) => b - a);
    const kicker = groups[2]![0];
    score = [CATEGORY[name], pairs[0]!, pairs[1]!, kicker];
  } else if (groups[0]![1] === 2) {
    name = 'One Pair';
    const kickers = groups.filter((g) => g[1] === 1).map((g) => g[0]);
    score = [CATEGORY[name], groups[0]![0], ...kickers];
  } else {
    name = 'High Card';
    score = [CATEGORY[name], ...uniqueRanksDesc(cards)];
  }

  return { name, score, cards: [...cards] };
}

function compareScores(a: number[], b: number[]): number {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

/** Best 5-card hand from 5–7 cards (Hold'em). */
export function evaluateBest(cards: CardId[]): EvaluatedHand {
  if (cards.length < 5) throw new Error('Need at least 5 cards');
  if (cards.length === 5) return evaluate5(cards);
  let best: EvaluatedHand | null = null;
  const idx = cards.map((_, i) => i);
  const combos = combinations(idx, 5);
  for (const combo of combos) {
    const five = combo.map((i) => cards[i]!);
    const ev = evaluate5(five);
    if (!best || compareScores(ev.score, best.score) > 0) best = ev;
  }
  return best!;
}

export function compareHands(a: EvaluatedHand, b: EvaluatedHand): number {
  return compareScores(a.score, b.score);
}

function combinations(arr: number[], k: number): number[][] {
  const out: number[][] = [];
  const n = arr.length;
  const pick: number[] = [];
  function rec(start: number): void {
    if (pick.length === k) {
      out.push([...pick]);
      return;
    }
    for (let i = start; i < n; i++) {
      pick.push(arr[i]!);
      rec(i + 1);
      pick.pop();
    }
  }
  rec(0);
  return out;
}

/** Blackjack hand total; soft ace handling. */
export function blackjackTotal(cards: CardId[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    const v = rankValue(c.rank);
    if (c.rank === 'A') {
      aces++;
      total += 11;
    } else if (v >= 10) {
      total += 10;
    } else {
      total += v;
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  const soft = aces > 0 && total <= 21;
  return { total, soft };
}

export function isBlackjack(cards: CardId[]): boolean {
  return cards.length === 2 && blackjackTotal(cards).total === 21;
}

/** Simple Hold'em AI strength heuristic 0..1 from hole + board. */
export function holdemStrength(hole: CardId[], board: CardId[]): number {
  if (board.length >= 3) {
    const ev = evaluateBest([...hole, ...board]);
    return Math.min(1, CATEGORY[ev.name] / 9 + (ev.score[1] ?? 0) / 140);
  }
  // Preflop heuristic
  const [a, b] = hole;
  const va = rankValue(a!.rank);
  const vb = rankValue(b!.rank);
  const high = Math.max(va, vb);
  const low = Math.min(va, vb);
  const pair = va === vb;
  const suited = a!.suit === b!.suit;
  let s = high / 14 * 0.45 + low / 14 * 0.2;
  if (pair) s += 0.35;
  if (suited) s += 0.08;
  if (high - low <= 2 && !pair) s += 0.06;
  return Math.min(1, s);
}
