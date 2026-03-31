# Slot Reel Tactics (SRT)

## Purpose of This README
This document is **developer-facing**.
It is written for contributors and AI coding agents to understand:
- what kind of game this project is,
- which design principles are non-negotiable,
- how the code should be extended without breaking core intent.

This is **not** a marketing or player guide.

---

## Project Overview
SRT is a:
- browser-based game,
- built with plain **HTML / CSS / JavaScript**,
- solo-dev, MVP-focused project,
- slot-machine + auto-battle + build-strategy game.

Core idea:
1. The player builds a reel (slot machine strip).
2. Spins generate combat outcomes.
3. The player defeats enemies within limited turns.
4. Rewards improve future build decisions.
5. The loop repeats with increasing decision pressure.

---

## Core Game Loop

### 1) Build Phase
- A monster shop presents limited choices.
- The player buys monsters and places them into reel slots.
- The player may reroll shop choices for coins (cost scaling applies).

### 2) Battle Phase
- The player spins the reel.
- Visible reel results determine monster attacks and total damage.
- Enemy attacks back.
- Repeat until victory or defeat (or turn limit condition).

### 3) Reward Phase
- Gain reward resources (coins, etc.).
- Choose a class (synergy direction modifier).

### 4) Repeat
- Return to build with updated resources and strategic constraints.

---

## Design Philosophy (Must Not Be Broken)

### Decision-Making Game, Not Pure Scaling
- This game is about constrained decisions, not unchecked growth.
- Trade-offs are mandatory: the player must not be able to take everything.
- Build direction should matter more than raw number inflation.

### Limits Are Core Mechanics
- Limit systems are intentional (class slot caps, stacking caps, economy pressure).
- Avoid any feature that enables infinite scaling or runaway stat inflation.

### Clarity Over Feature Quantity
- Reel is the visual centerpiece.
- UI should support clear action flow.
- Avoid clutter, redundant panels, and forced multi-click friction.

---

## Class System Direction
Classes define strategic direction (example: slime synergy, undead synergy).

Design constraints:
- Player has limited class slots (target max: 5).
- Early game slot count may be smaller (example: 3).
- Same class stack is capped (target: up to 2 copies).
- Economic classes do **not** stack.

Implication:
- Class choice must create meaningful opportunity cost.

---

## Reroll System Direction
Both monster shop and class selection should follow a scaling reroll cost model:
- Initial reroll cost: **4 coins**
- Each reroll in the same phase: **+1 coin**
- Cost resets at phase start

Why:
- Creates tension between short-term optimization and long-term economy.
- Prevents free fishing for ideal outcomes.

---

## Architecture Rules (Critical)
All contributors and agents must follow these rules:

1. Use a single `gameState` object.
2. Do not scatter state variables globally.
3. Keep `update()` and `render()` separate.
4. Do not mix rendering and game logic.
5. Prefer helper functions over duplicated logic.
6. Centralize tunable numbers in a `CONFIG` object.
7. Keep implementations MVP-friendly and readable.

When in doubt:
- choose simpler architecture,
- preserve determinism of state transitions,
- avoid hidden side effects.

---

## UI Principles
- Reel editor and reel result visibility must remain dominant.
- “Go to battle” action must be easy to reach.
- Avoid excessive scrolling for primary actions.
- Place important information near relevant interactions.

Recommended priority order:
1. Reel (main focus)
2. Shop (input decisions)
3. Action button (battle start)
4. Detail panels (selected monster, class info)

---

## What to Avoid
Do **not** introduce the following unless explicitly approved by design direction:
- over-engineered systems,
- complex enemy AI frameworks,
- multiplayer/network features,
- large meta-progression trees,
- uncontrolled stacking/infinite scaling mechanics.

---

## Future Extensions (Optional, After MVP Stability)
Possible future systems:
- relic/treasure layer (separate from class system),
- reel size expansion,
- additional monster families and synergy themes.

Rule for future work:
- keep MVP stable first,
- add only features that preserve decision pressure and clarity.

---

## Japanese Summary (短い要約)
このREADMEは、SRTを開発する人・AIエージェント向けの**設計原則ドキュメント**です。  
ゲームの核（ビルド→バトル→報酬ループ）、壊してはいけない制約（上限・トレードオフ・UI優先度）、実装時のアーキテクチャ規則（`gameState`一元化、`update()`/`render()`分離）を明確にしています。

## このREADMEの用途（日本語）
このREADMEは「機能説明」よりも「設計ガードレール」を共有するためのものです。  
新しい機能を追加する際に、ゲーム性を“インフレ型”へ崩さず、意思決定重視のMVP方針を守るための基準として使います。
