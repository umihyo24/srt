const MONSTERS = [
  { id: "slime", name: "スライム", cost: 1, hp: 1, atk: 1, cls: "m-slime" },
  { id: "skeleton", name: "スケルトン", cost: 2, hp: 2, atk: 2, cls: "m-skeleton" },
  { id: "zombie", name: "ゾンビ", cost: 2, hp: 2, atk: 2, cls: "m-zombie" },
  { id: "bat", name: "バット", cost: 1, hp: 1, atk: 1, cls: "m-bat" },
  { id: "wolf", name: "ウルフ", cost: 2, hp: 2, atk: 3, cls: "m-wolf" },
  { id: "goblin", name: "ゴブリン", cost: 1, hp: 2, atk: 1, cls: "m-goblin" },
  { id: "imp", name: "インプ", cost: 2, hp: 1, atk: 3, cls: "m-imp" },
  { id: "knight", name: "ナイト", cost: 3, hp: 3, atk: 3, cls: "m-knight" },
  { id: "ghost", name: "ゴースト", cost: 2, hp: 1, atk: 2, cls: "m-ghost" },
  { id: "mushroom", name: "マッシュルーム", cost: 1, hp: 2, atk: 1, cls: "m-mushroom" },
  { id: "lizard", name: "リザード", cost: 2, hp: 2, atk: 2, cls: "m-lizard" }
];

const CLASS_CHOICES = [
  { id: "slime_master", name: "スライムマスター", desc: "スライムが揃うと追加ダメージ+1" },
  { id: "necromancer", name: "ネクロマンサー", desc: "不死系(スケルトン/ゾンビ)の攻撃+1" },
  { id: "beast_tamer", name: "ビーストテイマー", desc: "次ラウンド開始時コイン+2" }
];

const INITIAL_STATE = () => ({
  phase: "build", // build | battle | reward | gameover
  round: 1,
  coins: 12,
  hp: 12,
  buildManualPlacement: false,
  buildStatus: { type: "info", text: "モンスターを購入してリールに配置します" },
  shopChoices: rollShopChoices(MONSTERS, 3),
  monsterRerollCost: 4,
  selectedMonsterId: null,
  selectedSource: null, // shop | reel | null
  selectedSlotIndex: null,
  pendingPlacement: null,
  classSlots: [],
  maxClassSlots: 3,
  maxDuplicatePerClass: 2,
  classChoices: rollClassChoices(CLASS_CHOICES, 3),
  classRerollCost: 4,
  reels: Array(18).fill(null),
  enemy: { name: "ゴブリンウォーリア", hp: 10, atk: 2 },
  battle: {
    turn: 0,
    enemyHp: 10,
    visibleGrid: Array(9).fill(null),
    gridCols: 3,
    gridRows: 3,
    lastDamage: { baseDamage: 0, bonusDamage: 0, totalDamage: 0 },
    log: [],
    logEntries: [],
    compactTurnSummary: ["スピンして戦闘を開始してください。"],
    showBattleLogModal: false,
    subPhase: "idle", // idle | spinning | enemy_result | victory | defeat
    turnResult: null,
    pendingOutcome: null, // continue | victory | defeat | null
    requiresOutcomeConfirm: false,
    resolved: false,
    won: null
  }
});

const gameState = INITIAL_STATE();
const app = document.getElementById("app");
const DEFAULT_BUILD_STATUS = Object.freeze({ type: "info", text: "モンスターを購入してリールに配置します" });
const SHOP_SIZE = 3;
const REROLL_INITIAL_COST = 4;
const CHOICE_COUNT = 3;

function resetBuildUiState() {
  gameState.buildStatus = { ...DEFAULT_BUILD_STATUS };
}

function getSellValue(monster) {
  if (!monster) return 0;
  return Math.floor(monster.cost / 2);
}

function rollShopChoices(pool, choiceCount = SHOP_SIZE) {
  const candidates = [...pool];
  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return candidates.slice(0, Math.min(choiceCount, candidates.length)).map((monster) => monster.id);
}

function rollClassChoices(pool, choiceCount = CHOICE_COUNT) {
  const candidates = [...pool];
  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return candidates.slice(0, Math.min(choiceCount, candidates.length)).map((classData) => classData.id);
}

function update(action, payload = {}) {
  switch (action) {
    case "setBuildManualPlacement": {
      if (gameState.phase !== "build") return;
      gameState.buildManualPlacement = Boolean(payload.enabled);
      if (!gameState.buildManualPlacement && gameState.pendingPlacement) {
        gameState.buildStatus = { type: "warn", text: "配置待ちモンスターを先に配置してください" };
      } else {
        gameState.buildStatus = {
          type: "info",
          text: gameState.buildManualPlacement
            ? "手動配置モード: 購入後に配置先を選択します"
            : "モンスターを購入してリールに配置します"
        };
      }
      return;
    }
    case "selectShopMonster": {
      if (gameState.phase !== "build") return;
      const monster = MONSTERS.find((m) => m.id === payload.monsterId);
      if (!monster) return;
      gameState.selectedMonsterId = monster.id;
      gameState.selectedSource = "shop";
      gameState.selectedSlotIndex = null;
      return;
    }
    case "selectReelSlot": {
      if (gameState.phase !== "build") return;
      const idx = payload.index;
      if (idx < 0 || idx >= gameState.reels.length) return;
      const id = gameState.reels[idx];
      if (!id) return;
      gameState.selectedMonsterId = id;
      gameState.selectedSource = "reel";
      gameState.selectedSlotIndex = idx;
      return;
    }
    case "clearSelection": {
      if (gameState.phase !== "build") return;
      gameState.selectedMonsterId = null;
      gameState.selectedSource = null;
      gameState.selectedSlotIndex = null;
      return;
    }
    case "buyMonster": {
      const monster = MONSTERS.find((m) => m.id === payload.monsterId);
      if (!monster || gameState.phase !== "build") return;
      if (!gameState.shopChoices.includes(monster.id)) return;
      gameState.selectedMonsterId = monster.id;
      gameState.selectedSource = "shop";
      gameState.selectedSlotIndex = null;
      if (gameState.pendingPlacement !== null) {
        gameState.buildStatus = { type: "warn", text: "先に配置を完了してください" };
        return;
      }
      if (gameState.coins < monster.cost) {
        gameState.buildStatus = {
          type: "warn",
          text: "コインが不足しています",
          code: "insufficient_coins",
          requiredCoins: monster.cost
        };
        return;
      }
      gameState.selectedMonsterId = monster.id;
      if (gameState.buildManualPlacement) {
        gameState.coins -= monster.cost;
        gameState.pendingPlacement = monster.id;
        gameState.buildStatus = { type: "info", text: `配置待ち: ${monster.name}を18スロットのどこかへ配置してください` };
        return;
      }

      const emptyIndex = getFirstEmptyVisualSlotIndex(gameState.reels);
      if (emptyIndex === -1) {
        gameState.buildStatus = { type: "warn", text: "空きスロットがありません。手動配置を有効にするか、スロットを空けてください" };
        return;
      }

      gameState.coins -= monster.cost;
      gameState.reels[emptyIndex] = monster.id;
      gameState.buildStatus = { type: "info", text: `${monster.name}を自動配置しました` };
      return;
    }
    case "rerollShop": {
      if (gameState.phase !== "build") return;
      if (gameState.coins < gameState.monsterRerollCost) {
        gameState.buildStatus = { type: "warn", text: "リロールに必要なコインが不足しています" };
        return;
      }
      gameState.coins -= gameState.monsterRerollCost;
      gameState.shopChoices = rollShopChoices(MONSTERS, CHOICE_COUNT);
      gameState.buildStatus = { type: "info", text: `ショップをリロールしました（-${gameState.monsterRerollCost}コイン）` };
      gameState.monsterRerollCost += 1;
      return;
    }
    case "placePendingMonster": {
      if (gameState.phase !== "build") return;
      if (gameState.pendingPlacement === null) return;
      const idx = payload.index;
      if (idx < 0 || idx >= gameState.reels.length) return;
      gameState.reels[idx] = gameState.pendingPlacement;
      gameState.pendingPlacement = null;
      gameState.buildStatus = { type: "info", text: "モンスターを購入してリールに配置します" };
      return;
    }
    case "clearSlot": {
      if (gameState.phase !== "build") return;
      const idx = payload.index;
      if (idx < 0 || idx >= gameState.reels.length) return;
      gameState.reels[idx] = null;
      return;
    }
    case "sellSelectedMonster": {
      if (gameState.phase !== "build") return;
      if (gameState.pendingPlacement !== null) return;
      if (gameState.selectedSource !== "reel" || gameState.selectedSlotIndex === null) return;
      const idx = gameState.selectedSlotIndex;
      if (idx < 0 || idx >= gameState.reels.length) return;
      const monsterId = gameState.reels[idx];
      if (!monsterId) return;
      const monster = monsterById(monsterId);
      if (!monster) return;
      const sellValue = getSellValue(monster);
      gameState.coins += sellValue;
      gameState.reels[idx] = null;
      gameState.selectedMonsterId = null;
      gameState.selectedSource = null;
      gameState.selectedSlotIndex = null;
      gameState.buildStatus = { type: "info", text: `${monster.name}を売却しました（+${sellValue}コイン）` };
      return;
    }
    case "startBattle": {
      if (gameState.phase !== "build") return;
      if (gameState.pendingPlacement !== null) {
        gameState.buildStatus = { type: "warn", text: "先に配置を完了してください" };
        return;
      }
      gameState.phase = "battle";
      gameState.battle = {
        turn: 0,
        enemyHp: gameState.enemy.hp,
        visibleGrid: spinVisibleGrid(gameState.reels),
        gridCols: 3,
        gridRows: 3,
        lastDamage: { baseDamage: 0, bonusDamage: 0, totalDamage: 0 },
        log: ["バトル開始！スロットを回して攻撃します。"],
        logEntries: [],
        compactTurnSummary: ["スピンして戦闘を開始してください。"],
        showBattleLogModal: false,
        subPhase: "idle",
        turnResult: null,
        pendingOutcome: null,
        requiresOutcomeConfirm: false,
        resolved: false,
        won: null
      };
      return;
    }
    case "spin": {
      if (gameState.phase !== "battle" || gameState.battle.resolved) return;
      if (gameState.battle.subPhase !== "idle") return;
      gameState.battle.subPhase = "spinning";
      gameState.battle.turn += 1;
      gameState.battle.visibleGrid = spinVisibleGrid(gameState.reels);
      const damageBreakdown = calcDamageBreakdown(gameState.battle.visibleGrid, gameState.classSlots);
      const dmg = damageBreakdown.totalDamage;
      gameState.battle.lastDamage = damageBreakdown;
      gameState.battle.enemyHp = Math.max(0, gameState.battle.enemyHp - dmg);
      const playerActions = buildPlayerResultMessages(gameState.battle.visibleGrid);
      let enemyActions = [];
      let outcome = "continue";
      if (gameState.battle.enemyHp <= 0) {
        outcome = "victory";
      } else {
        enemyActions = buildEnemyResultMessages(gameState.enemy.atk);
        gameState.hp -= gameState.enemy.atk;
        if (gameState.hp <= 0 || gameState.battle.turn >= 6) {
          outcome = "defeat";
        }
      }

      gameState.battle.turnResult = {
        playerActions,
        enemyActions,
        totalDamage: dmg,
        outcome
      };
      gameState.battle.logEntries.push({
        turn: gameState.battle.turn,
        playerActions,
        enemyActions: enemyActions.length > 0 ? enemyActions : ["敵は力をためている"],
        outcomeText: getBattleOutcomeText(outcome)
      });
      gameState.battle.compactTurnSummary = buildCompactTurnSummary({
        totalDamage: dmg,
        enemyAttack: enemyActions[0] || "敵は力をためている",
        outcome
      });
      gameState.battle.pendingOutcome = outcome;
      gameState.battle.requiresOutcomeConfirm = outcome === "victory" || outcome === "defeat";
      gameState.battle.subPhase = outcome === "victory" ? "victory" : outcome === "defeat" ? "defeat" : "enemy_result";
      gameState.battle.log.push(`ターン${gameState.battle.turn}: 合計${dmg}ダメージ`);
      if (outcome === "victory") gameState.battle.log.push("敵を倒した。");
      if (outcome === "defeat") gameState.battle.log.push("プレイヤーは倒れた。");
      if (outcome === "continue") {
        gameState.battle.subPhase = "idle";
        gameState.battle.pendingOutcome = null;
      }
      return;
    }
    case "openBattleLog": {
      if (gameState.phase !== "battle") return;
      gameState.battle.showBattleLogModal = true;
      return;
    }
    case "closeBattleLog": {
      if (gameState.phase !== "battle") return;
      gameState.battle.showBattleLogModal = false;
      return;
    }
    case "battleNext": {
      if (gameState.phase !== "battle") return;
      if (!gameState.battle.requiresOutcomeConfirm) return;
      if (gameState.battle.pendingOutcome === "victory") {
        gameState.battle.resolved = true;
        gameState.battle.won = true;
        gameState.phase = "reward";
        gameState.coins += 8;
        gameState.classChoices = rollClassChoices(CLASS_CHOICES, CHOICE_COUNT);
        gameState.classRerollCost = REROLL_INITIAL_COST;
        gameState.round += 1;
        return;
      }

      if (gameState.battle.pendingOutcome === "defeat") {
        gameState.battle.resolved = true;
        gameState.battle.won = false;
        gameState.phase = "gameover";
        return;
      }
      return;
    }
    case "pickClass": {
      if (gameState.phase !== "reward") return;
      const picked = CLASS_CHOICES.find((c) => c.id === payload.classId);
      if (!picked) return;
      if (!gameState.classChoices.includes(picked.id)) return;
      const currentCount = gameState.classSlots.length;
      const duplicateCount = gameState.classSlots.filter((classId) => classId === picked.id).length;
      if (currentCount >= gameState.maxClassSlots) {
        alert("職業スロットが上限です。");
        return;
      }
      if (duplicateCount >= gameState.maxDuplicatePerClass) {
        alert("同じ職業はこれ以上選べません。");
        return;
      }
      gameState.classSlots.push(picked.id);
      gameState.phase = "build";
      resetBuildUiState();
      gameState.shopChoices = rollShopChoices(MONSTERS, CHOICE_COUNT);
      gameState.monsterRerollCost = REROLL_INITIAL_COST;
      gameState.enemy = {
        name: `ラウンド${gameState.round}の敵`,
        hp: 10 + gameState.round * 2,
        atk: 2 + Math.floor(gameState.round / 2)
      };
      return;
    }
    case "rerollClassChoices": {
      if (gameState.phase !== "reward") return;
      if (gameState.coins < gameState.classRerollCost) {
        alert("リロールに必要なコインが不足しています。");
        return;
      }
      gameState.coins -= gameState.classRerollCost;
      gameState.classChoices = rollClassChoices(CLASS_CHOICES, CHOICE_COUNT);
      gameState.classRerollCost += 1;
      return;
    }
    case "restart": {
      Object.assign(gameState, INITIAL_STATE());
      return;
    }
    default:
      return;
  }
}

function getReelStrip(reels, reelIndex) {
  return Array.from({ length: 6 }, (_, row) => reels[row * 3 + reelIndex] ?? null);
}

function getVisibleWindowFromStop(strip, stopIndex, visibleRows = 3) {
  return Array.from({ length: visibleRows }, (_, offset) => {
    const idx = (stopIndex + offset) % strip.length;
    return strip[idx];
  });
}

function getVisualOrderIndices(cols, rows) {
  const result = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      result.push(row * cols + col);
    }
  }
  return result;
}

function getFirstEmptyVisualSlotIndex(reels) {
  const visualOrder = getVisualOrderIndices(3, 6);
  return visualOrder.find((idx) => reels[idx] === null) ?? -1;
}

function spinVisibleGrid(reels) {
  const reelWindows = Array.from({ length: 3 }, (_, reelIndex) => {
    const strip = getReelStrip(reels, reelIndex);
    const stopIndex = Math.floor(Math.random() * strip.length);
    return getVisibleWindowFromStop(strip, stopIndex, 3);
  });

  const grid = [];
  for (let row = 0; row < 3; row += 1) {
    for (let reelIndex = 0; reelIndex < 3; reelIndex += 1) {
      grid.push(reelWindows[reelIndex][row]);
    }
  }
  return grid;
}

function calcDamageBreakdown(grid, classSlots = []) {
  let baseDamage = 0;
  let bonusDamage = 0;
  const counts = { slime: 0, skeleton: 0, zombie: 0 };
  grid.forEach((id) => {
    if (!id) return;
    const m = MONSTERS.find((x) => x.id === id);
    if (!m) return;
    baseDamage += m.atk;
    counts[id] += 1;
  });

  classSlots.forEach((classId) => {
    if (classId === "slime_master" && counts.slime >= 3) bonusDamage += 1;
    if (classId === "necromancer") bonusDamage += counts.skeleton + counts.zombie;
  });

  return {
    baseDamage,
    bonusDamage,
    totalDamage: baseDamage + bonusDamage
  };
}

function buildPlayerResultMessages(grid) {
  const attackLines = grid
    .filter((id) => id !== null)
    .map((id) => {
      const m = monsterById(id);
      if (!m) return null;
      return `${m.name}の攻撃 → 敵に${m.atk}ダメージ`;
    })
    .filter(Boolean);

  if (attackLines.length === 0) return ["攻撃できるモンスターがいない。"];
  return attackLines;
}

function buildEnemyResultMessages(enemyAtk) {
  return [`敵の攻撃 → プレイヤーに${enemyAtk}ダメージ`];
}

function monsterById(id) {
  return MONSTERS.find((m) => m.id === id) || null;
}

function render() {
  switch (gameState.phase) {
    case "build":
      renderBuildPhase();
      return;
    case "battle":
      renderBattlePhase();
      return;
    case "reward":
      renderRewardPhase();
      return;
    case "gameover":
      renderGameOverPhase();
      return;
    default:
      app.innerHTML = "";
  }
}

function getBuildStatusDisplay() {
  const status = gameState.buildStatus || DEFAULT_BUILD_STATUS;
  if (status.code === "insufficient_coins" && gameState.coins >= (status.requiredCoins ?? Infinity)) {
    return { ...DEFAULT_BUILD_STATUS };
  }
  if (gameState.pendingPlacement) {
    const monster = monsterById(gameState.pendingPlacement);
    if (monster) {
      return {
        type: "info",
        text: `配置待ち: ${monster.name}を18スロットのどこかへ配置してください`
      };
    }
  }
  return status;
}

function getGroupedClassEntries(classSlots = []) {
  return classSlots.reduce((acc, classId) => {
    const picked = CLASS_CHOICES.find((c) => c.id === classId);
    if (!picked) return acc;
    const found = acc.find((item) => item.id === classId);
    if (found) {
      found.count += 1;
      return acc;
    }
    acc.push({ id: classId, name: picked.name, desc: picked.desc, count: 1 });
    return acc;
  }, []);
}

function getCurrentClassInfo(classSlots = []) {
  const grouped = getGroupedClassEntries(classSlots);
  if (grouped.length === 0) {
    return {
      title: "現在の職業: なし",
      entries: []
    };
  }
  return {
    title: "現在の職業",
    entries: grouped.map((item) => ({
      label: `${item.name}${item.count > 1 ? ` x${item.count}` : ""}`,
      desc: item.desc
    }))
  };
}

function renderBuildPhase() {
  const visibleShopMonsters = gameState.shopChoices
    .map((id) => monsterById(id))
    .filter(Boolean);
  const classInfo = getCurrentClassInfo(gameState.classSlots);
  const selected = monsterById(gameState.selectedMonsterId);
  const canSell = gameState.selectedSource === "reel" && gameState.selectedSlotIndex !== null && gameState.pendingPlacement === null;
  const sellValue = getSellValue(selected);
  const isReelSelection = gameState.selectedSource === "reel" && gameState.selectedSlotIndex !== null;
  const pendingMonster = monsterById(gameState.pendingPlacement);
  const buildStatus = getBuildStatusDisplay();
  const reels = [0, 1, 2].map((r) => gameState.reels.filter((_, idx) => idx % 3 === r));

  app.innerHTML = `
    <div class="phase-root">
      <div class="topbar build-header">
        <div class="build-header-main">
          <h2>ビルドフェーズ（ショップ＆リール編集）</h2>
          <div class="badges build-main-stats">
            <div class="badge">ラウンド ${gameState.round}</div>
            <div class="badge">コイン ${gameState.coins}</div>
            <div class="badge">HP ${gameState.hp}</div>
          </div>
        </div>
      </div>

      <div class="build-layout">
        <div class="phase-root">
          <section class="panel">
            <h3>ショップ</h3>
            <label style="display:flex;gap:8px;align-items:center;margin-bottom:10px;">
              <input type="checkbox" data-act="toggle-manual" ${gameState.buildManualPlacement ? "checked" : ""} />
              配置先を選ぶ（手動配置）
            </label>
            <div style="display:flex;justify-content:flex-end;margin-bottom:10px;">
              <button class="small btn-secondary" data-act="reroll-shop">リロール (${gameState.monsterRerollCost}コイン)</button>
            </div>
            <div class="build-status-bar build-status-${buildStatus.type}" title="${buildStatus.text}">
              ${buildStatus.text}
            </div>
            <div class="shop-grid">
              ${visibleShopMonsters.map(
                (m) => `
                <article class="card ${m.cls} ${
                  gameState.selectedSource === "shop" && gameState.selectedMonsterId === m.id ? "build-selected-shop" : ""
                }" data-act="select-shop" data-mid="${m.id}">
                  <h4>${m.name}</h4>
                  <div class="stats">コスト ${m.cost} / HP ${m.hp} / ダメージ ${m.atk}</div>
                  <button class="small btn-primary" data-act="buy" data-mid="${m.id}" ${pendingMonster ? "disabled" : ""}>購入</button>
                </article>`
              ).join("")}
            </div>
          </section>

          <section class="panel">
            <h3>リール編集エリア（3リール×6段 = 18スロット）</h3>
            <div class="reel-grid">
              ${reels
                .map(
                  (col, colIdx) => `
                <div class="reel-col">
                  <strong>リール${colIdx + 1}</strong>
                  ${col
                    .map((id, rowIdx) => {
                      const absoluteIndex = rowIdx * 3 + colIdx;
                      const monster = monsterById(id);
                      const isSelectedSlot =
                        gameState.selectedSource === "reel" && gameState.selectedSlotIndex === absoluteIndex;
                      return `<div class="slot" data-act="slot" data-index="${absoluteIndex}" ${
                        pendingMonster ? 'style="outline:2px solid #ffcc7a;cursor:pointer;"' : ""
                      }>
                        <div class="${isSelectedSlot ? "build-selected-slot" : ""}" style="width:100%;padding:2px;border-radius:8px;">
                          ${monster ? `<div class="monster-chip ${monster.cls}">${monster.name}</div>` : "空"}
                        </div>
                      </div>`;
                    })
                    .join("")}
                </div>`
                )
                .join("")}
            </div>
          </section>

        </div>

        <aside class="phase-root">
          <section class="panel">
            <h3>次のバトル情報</h3>
            <div class="next-info"><span>敵: ${gameState.enemy.name}</span><span>HP ${gameState.enemy.hp}</span></div>
            <div class="next-info"><span>敵攻撃</span><span>${gameState.enemy.atk}</span></div>
            <button class="btn-primary build-start-btn" style="width:100%;margin-top:10px;" data-act="start" ${
              pendingMonster ? "disabled" : ""
            }>勝ちに行く</button>
            ${
              pendingMonster
                ? '<p style="margin-top:8px;color:#ffcc7a;">配置待ちモンスターの配置後にバトル開始できます。</p>'
                : ""
            }
          </section>

          <section class="panel">
            <h3>${pendingMonster ? "配置待ちモンスター" : "選択中モンスター"}</h3>
            ${
              pendingMonster
                ? `<div class="monster-chip ${pendingMonster.cls}">${pendingMonster.name}</div><p>このモンスターをスロットに配置してください。</p>`
                : selected
                  ? `<div class="monster-chip ${selected.cls}">${selected.name}</div>
                    <p>コスト ${selected.cost} / HP ${selected.hp} / 攻撃 ${selected.atk}</p>
                    <p>選択元: ${gameState.selectedSource === "shop" ? "ショップ" : "配置済みスロット"}</p>
                    ${isReelSelection ? `<p>売却価格: ${sellValue}</p>` : ""}
                    ${
                      canSell
                        ? '<button class="small btn-danger" data-act="sell-selected">売却</button>'
                        : ""
                    }`
                  : "<p class=\"muted\">未選択</p>"
            }
          </section>

          <section class="panel">
            <h3>現在の職業</h3>
            <p><strong>${classInfo.title}</strong></p>
            ${
              classInfo.entries.length === 0
                ? '<p class="muted">職業を獲得するとここに効果が表示されます。</p>'
                : `<ul>${classInfo.entries
                    .map((entry) => `<li><strong>${entry.label}</strong><br /><span class="muted">${entry.desc}</span></li>`)
                    .join("")}</ul>`
            }
          </section>
        </aside>
      </div>
    </div>
  `;

  bindBuildEvents();
}

function bindBuildEvents() {
  app.querySelector("[data-act='toggle-manual']")?.addEventListener("change", (event) => {
    const checked = Boolean(event.target?.checked);
    update("setBuildManualPlacement", { enabled: checked });
    render();
  });

  app.querySelectorAll("[data-act='buy']").forEach((btn) => {
    btn.addEventListener("click", () => {
      update("buyMonster", { monsterId: btn.dataset.mid });
      render();
    });
  });

  app.querySelector("[data-act='reroll-shop']")?.addEventListener("click", () => {
    update("rerollShop");
    render();
  });

  app.querySelectorAll("[data-act='select-shop']").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target?.closest("[data-act='buy']")) return;
      update("selectShopMonster", { monsterId: card.dataset.mid });
      render();
    });
  });

  app.querySelectorAll("[data-act='slot']").forEach((slot) => {
    slot.addEventListener("click", () => {
      const slotIndex = Number(slot.dataset.index);
      if (gameState.pendingPlacement !== null) {
        update("placePendingMonster", { index: slotIndex });
      } else if (gameState.reels[slotIndex]) {
        update("selectReelSlot", { index: slotIndex });
      } else if (gameState.selectedSource === "reel") {
        update("clearSelection");
      }
      render();
    });
  });

  app.querySelector("[data-act='sell-selected']")?.addEventListener("click", () => {
    update("sellSelectedMonster");
    render();
  });

  const startBtn = app.querySelector("[data-act='start']");
  startBtn?.addEventListener("click", () => {
    update("startBattle");
    render();
  });
}

function getClassBonusLabel(classSlots = []) {
  if (classSlots.length === 0) return "なし";
  return getGroupedClassEntries(classSlots)
    .map((entry) => `${entry.name}${entry.count > 1 ? ` x${entry.count}` : ""}`)
    .join(" / ");
}

function getEnemyAttackInfo(battleTurn) {
  const frequency = "毎ターン";
  const targetRule = "プレイヤーを直接攻撃";
  const nextAttackTiming = battleTurn >= 0 ? `ターン ${battleTurn + 1} 終了時` : "次ターン";
  return { frequency, targetRule, nextAttackTiming };
}

function getBattleContinueLabel(subPhase) {
  if (subPhase === "victory" || subPhase === "defeat") return "次へ";
  return "次へ";
}

function getBattleStatusText(subPhase) {
  if (subPhase === "idle") return "スピン待機中";
  if (subPhase === "spinning") return "スピン中...";
  if (subPhase === "enemy_result") return "敵行動結果";
  if (subPhase === "victory") return "勝利！";
  if (subPhase === "defeat") return "敗北...";
  return "";
}

function buildCompactTurnSummary({ totalDamage, enemyAttack, outcome }) {
  const lines = ["味方の攻撃！", `合計${totalDamage}ダメージ`];
  if (outcome === "victory") {
    lines.push("戦闘に勝利した！");
    return lines;
  }
  if (outcome === "defeat") {
    lines.push(enemyAttack);
    lines.push("プレイヤーは倒れた。");
    return lines;
  }
  lines.push(enemyAttack);
  lines.push("戦闘続行");
  return lines;
}

function renderBattleGridCells() {
  return gameState.battle.visibleGrid
    .map((id) => {
      const m = monsterById(id);
      return `<div class="slot battle-cell">${m ? `<div class="monster-chip ${m.cls}">${m.name}</div>` : '<div class="muted">Empty</div>'}</div>`;
    })
    .join("");
}

function renderCompactBattleSummary() {
  const summaryLines = gameState.battle.compactTurnSummary || [];
  const isVictory = gameState.battle.pendingOutcome === "victory";
  const isDefeat = gameState.battle.pendingOutcome === "defeat";
  const summaryClass = isVictory ? "battle-compact-victory" : isDefeat ? "battle-compact-defeat" : "";

  return `
    <section class="panel battle-compact-summary ${summaryClass}">
      <h3>バトル結果</h3>
      <ul>
        ${summaryLines.map((line) => `<li>${line}</li>`).join("")}
      </ul>
      ${
        gameState.battle.requiresOutcomeConfirm
          ? '<div class="battle-turn-result-actions"><button class="btn-secondary battle-next-btn" data-act="battle-next">次へ</button></div>'
          : ""
      }
    </section>
  `;
}

function renderBattleLogModal() {
  if (!gameState.battle.showBattleLogModal) return "";
  const entries = gameState.battle.logEntries;
  const entryHtml =
    entries.length === 0
      ? '<p class="muted">まだバトルログはありません。</p>'
      : entries
          .map(
            (entry) => `
          <article class="battle-log-turn">
            <h4>ターン${entry.turn}</h4>
            <div class="battle-log-group">
              <strong>・プレイヤー</strong>
              <ul>${entry.playerActions.map((line) => `<li>${line}</li>`).join("")}</ul>
            </div>
            <div class="battle-log-group">
              <strong>・エネミー</strong>
              <ul>${entry.enemyActions.map((line) => `<li>${line}</li>`).join("")}</ul>
            </div>
            <p class="battle-log-outcome">${entry.outcomeText}</p>
          </article>
        `
          )
          .join("");

  return `
    <div class="battle-modal-overlay">
      <section class="panel battle-result-modal">
        <div class="battle-log-modal-header">
          <h3>バトルログ</h3>
          <button class="small btn-secondary" data-act="close-battle-log">閉じる</button>
        </div>
        <div class="battle-log-modal-body">
          ${entryHtml}
        </div>
      </section>
    </div>
  `;
}

function renderBattleCenterPanel() {
  const canSpin = gameState.battle.subPhase === "idle";
  const statusText = getBattleStatusText(gameState.battle.subPhase);

  return `
    <section class="panel battle-panel battle-center-panel">
      <h3>スロット（${gameState.battle.gridCols}x${gameState.battle.gridRows}）</h3>
      <p class="muted">現在ステップ: ${statusText}</p>
      <div class="machine battle-machine-grid" style="--grid-cols:${gameState.battle.gridCols};">
        ${renderBattleGridCells()}
      </div>
      <div class="battle-action-row">
        <button class="btn-primary battle-spin-btn" data-act="spin" ${canSpin ? "" : "disabled"}>スピンして攻撃</button>
        <button class="btn-secondary battle-next-btn" data-act="open-battle-log">バトルログ</button>
      </div>
      ${renderCompactBattleSummary()}
    </section>
  `;
}

function renderEnemyInfoPanel() {
  const attackInfo = getEnemyAttackInfo(gameState.battle.turn);
  return `
    <section class="panel battle-panel">
      <h3>敵情報</h3>
      <p><strong>名前:</strong> ${gameState.enemy.name}</p>
      <p><strong>現在HP:</strong> ${gameState.battle.enemyHp}</p>
      <p><strong>攻撃値:</strong> ${gameState.enemy.atk}</p>
      <p><strong>攻撃頻度:</strong> ${attackInfo.frequency}</p>
      <p><strong>対象ルール:</strong> ${attackInfo.targetRule}</p>
      <p><strong>次の攻撃:</strong> ${attackInfo.nextAttackTiming}</p>
      <p class="muted">※ 現在は簡易AI。将来的に対象選択ロジックを拡張予定。</p>
    </section>
  `;
}

function getBattleOutcomeText(outcome) {
  if (outcome === "victory") return "敵を倒した";
  if (outcome === "defeat") return "プレイヤーは倒れた";
  return "戦闘続行";
}

function renderBattlePhase() {
  const classBonusLabel = getClassBonusLabel(gameState.classSlots);
  app.innerHTML = `
    <div class="phase-root battle-screen">
      <div class="topbar">
        <h2>バトルフェーズ（スロットバトル）</h2>
        <div class="badges">
          <div class="badge">ターン ${gameState.battle.turn}</div>
          <div class="badge">プレイヤーHP ${gameState.hp}</div>
          <div class="badge">敵HP ${gameState.battle.enemyHp}</div>
          <div class="badge">クラス効果: ${classBonusLabel}</div>
        </div>
      </div>

      <div class="battle-layout battle-layout-2col">
        <main class="battle-col battle-col-center">
          ${renderBattleCenterPanel()}
        </main>
        <aside class="battle-col battle-col-right">
          ${renderEnemyInfoPanel()}
        </aside>
      </div>

      ${renderBattleLogModal()}
    </div>
  `;

  app.querySelector("[data-act='spin']")?.addEventListener("click", () => {
    update("spin");
    render();
  });
  app.querySelector("[data-act='battle-next']")?.addEventListener("click", () => {
    update("battleNext");
    render();
  });
  app.querySelector("[data-act='open-battle-log']")?.addEventListener("click", () => {
    update("openBattleLog");
    render();
  });
  app.querySelector("[data-act='close-battle-log']")?.addEventListener("click", () => {
    update("closeBattleLog");
    render();
  });
}

function renderRewardPhase() {
  const visibleClassChoices = gameState.classChoices
    .map((id) => CLASS_CHOICES.find((c) => c.id === id))
    .filter(Boolean);
  app.innerHTML = `
    <div class="center-phase">
      <div class="topbar">
        <h2>リワードフェーズ（クラス選択）</h2>
        <div class="badges">
          <div class="badge">ラウンド ${gameState.round}</div>
          <div class="badge">コイン ${gameState.coins}</div>
        </div>
      </div>

      <section class="panel">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
          <h3>クラスを1つ選択してください</h3>
          <button class="small btn-secondary" data-act="reroll-class">リロール (${gameState.classRerollCost}コイン)</button>
        </div>
        <div class="choices">
          ${visibleClassChoices.map(
            (c) => `
            <article class="choice">
              <h4>${c.name}</h4>
              <p class="muted">${c.desc}</p>
              <button class="btn-secondary" data-act="pick" data-cid="${c.id}">このクラスを選ぶ</button>
            </article>`
          ).join("")}
        </div>
      </section>
    </div>
  `;

  app.querySelectorAll("[data-act='pick']").forEach((btn) => {
    btn.addEventListener("click", () => {
      update("pickClass", { classId: btn.dataset.cid });
      render();
    });
  });
  app.querySelector("[data-act='reroll-class']")?.addEventListener("click", () => {
    update("rerollClassChoices");
    render();
  });
}

function renderGameOverPhase() {
  app.innerHTML = `
    <div class="center-phase">
      <section class="panel">
        <h2>ゲームオーバー</h2>
        <p>到達ラウンド: ${gameState.round}</p>
        <p>所持コイン: ${gameState.coins}</p>
        <button class="btn-danger" data-act="restart">Restart</button>
      </section>
    </div>
  `;

  app.querySelector("[data-act='restart']")?.addEventListener("click", () => {
    update("restart");
    render();
  });
}

render();
