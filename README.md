# Cards

WebGL card table in the browser â€” green felt, procedural cards, and three playable games:

1. **Blackjack** vs dealer  
2. **Texas Hold'em** heads-up vs a simple AI  
3. **Klondike Solitaire** (draw-3)

Built with Vite, TypeScript, and Three.js (`three@^0.185`). Browser only (no Electron).

## Play

Requirements:

- **Node.js** `>=18 <21` (Node 20 LTS recommended)
- A modern desktop browser (Chrome, Firefox, Edge, or Safari) on **Windows** or **Linux** (macOS works too)

```bash
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local dev server with HMR |
| `npm run build` | Typecheck (`tsc`) + production bundle |
| `npm run preview` | Serve the `dist/` build |

### Controls

- **Game picker** (top): switch Blackjack / Hold'em / Solitaire (state resets cleanly).
- **Action buttons** (bottom HUD): bet, deal, hit/stand, check/call/raise/fold, draw, new game, etc.
- **Solitaire**: click a face-up card, then click a destination pile (or empty king/ace slot). Click the stock (or **Draw 3**) to draw. Double-click a card to try auto-move to foundation. Empty stock click recycles the waste.
- **Camera**: drag on the table background for a mild orbit peek (clamped).

## Shared table feel (slice 1 polish)

Felt nap texture + wooden rail, richer procedural card faces/backs with thickness, eased deal arcs/flips, and a slightly tighter camera with gentle orbit settle. Game rules unchanged â€” polish lives in `src/table/*` and `src/cards/*`.

## Develop

### Folder map

```
src/
  main.ts              Entry
  app.ts               Mode switch, render loop, pointer â†’ games
  table/               Scene, felt, lights, camera / mild orbit
  cards/               CardMesh, deck pool, canvas textures, deal anim
  games/
    blackjack.ts
    holdem.ts
    solitaire.ts
    handEval.ts        Blackjack totals + Hold'em 5â€“7 card evaluator
    types.ts           GameMode / HUD contracts
  ui/                  HUD overlay (DOM) + css
  core/rng.ts          Seedable shuffle helper
```

### How games plug in

Each mode implements `GameMode` (`mount` / `unmount` / `update` / `onAction` / `onPointer`).  
`app.ts` owns the Three.js table, swaps modes via the HUD, and clears card/chip groups on switch.  
Games draw cards through `CardPool` (shared meshes + lerp animations) and push HUD state with `ctx.setHud`.

Hand ranking for Hold'em lives in `handEval.ts` (high card â†’ royal flush, best-of-21 for seven cards). Blackjack ace soft totals and 3:2 naturals are in the same module / `blackjack.ts`.

## License

MVP sample code â€” procedural card faces only (no third-party card art).

