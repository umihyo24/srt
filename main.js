const MONSTERS = [
  { id: "slime", name: "スライム", cost: 1, hp: 1, atk: 1, cls: "m-slime" },
  { id: "skeleton", name: "スケルトン", cost: 2, hp: 2, atk: 2, cls: "m-skeleton" },
  { id: "zombie", name: "ゾンビ", cost: 2, hp: 2, atk: 2, cls: "m-zombie" }
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
  selectedMonsterId: null,
  pendingPlacement: null,
  classBonus: null,
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
    subPhase: "idle", // idle | spinning | player_result | enemy_result | victory | defeat
    showResultModal: false,
    turnResult: null,
    pendingOutcome: null, // continue | victory | defeat | null
    awaitingContinue: false,
    resolved: false,
    won: null
  }
});

const gameState = INITIAL_STATE();
const app = document.getElementById("app");

function update(action, payload = {}) {
  switch (action) {
    case "selectShopMonster": {
      gameState.selectedMonsterId = payload.monsterId;
      return;
    }
    case "buyMonster": {
      const monster = MONSTERS.find((m) => m.id === payload.monsterId);
      if (!monster || gameState.phase !== "build") return;
      if (gameState.pendingPlacement !== null) return;
      if (gameState.coins < monster.cost) return;
      gameState.coins -= monster.cost;
      gameState.pendingPlacement = monster.id;
      gameState.selectedMonsterId = monster.id;
      return;
    }
    case "placePendingMonster": {
      if (gameState.phase !== "build") return;
      if (gameState.pendingPlacement === null) return;
      const idx = payload.index;
      if (idx < 0 || idx >= gameState.reels.length) return;
      gameState.reels[idx] = gameState.pendingPlacement;
      gameState.pendingPlacement = null;
      return;
    }
    case "clearSlot": {
      if (gameState.phase !== "build") return;
      const idx = payload.index;
      if (idx < 0 || idx >= gameState.reels.length) return;
      gameState.reels[idx] = null;
      return;
    }
    case "startBattle": {
      if (gameState.phase !== "build") return;
      if (gameState.pendingPlacement !== null) return;
      gameState.phase = "battle";
      gameState.battle = {
        turn: 0,
        enemyHp: gameState.enemy.hp,
        visibleGrid: spinVisibleGrid(gameState.reels),
        gridCols: 3,
        gridRows: 3,
        lastDamage: { baseDamage: 0, bonusDamage: 0, totalDamage: 0 },
        log: ["バトル開始！スロットを回して攻撃します。"],
        subPhase: "idle",
        showResultModal: false,
        turnResult: null,
        pendingOutcome: null,
        awaitingContinue: false,
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
      const damageBreakdown = calcDamageBreakdown(gameState.battle.visibleGrid, gameState.classBonus);
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
      gameState.battle.showResultModal = true;
      gameState.battle.pendingOutcome = outcome;
      gameState.battle.awaitingContinue = true;
      gameState.battle.subPhase = outcome === "victory" ? "victory" : outcome === "defeat" ? "defeat" : "enemy_result";
      gameState.battle.log.push(`ターン${gameState.battle.turn}: 合計${dmg}ダメージ`);
      if (outcome === "victory") gameState.battle.log.push("敵を倒した。");
      if (outcome === "defeat") gameState.battle.log.push("プレイヤーは倒れた。");
      return;
    }
    case "battleNext": {
      if (gameState.phase !== "battle") return;
      if (!gameState.battle.awaitingContinue || !gameState.battle.showResultModal) return;
      if (gameState.battle.pendingOutcome === "victory") {
        gameState.battle.resolved = true;
        gameState.battle.won = true;
        gameState.phase = "reward";
        gameState.coins += 8;
        gameState.round += 1;
        return;
      }

      if (gameState.battle.pendingOutcome === "defeat") {
        gameState.battle.resolved = true;
        gameState.battle.won = false;
        gameState.phase = "gameover";
        return;
      }

      gameState.battle.showResultModal = false;
      gameState.battle.turnResult = null;
      gameState.battle.pendingOutcome = null;
      gameState.battle.awaitingContinue = false;
      gameState.battle.subPhase = "idle";
      return;
    }
    case "pickClass": {
      if (gameState.phase !== "reward") return;
      const picked = CLASS_CHOICES.find((c) => c.id === payload.classId);
      if (!picked) return;
      gameState.classBonus = picked.id;
      gameState.phase = "build";
      gameState.enemy = {
        name: `ラウンド${gameState.round}の敵`,
        hp: 10 + gameState.round * 2,
        atk: 2 + Math.floor(gameState.round / 2)
      };
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

function calcDamageBreakdown(grid, classBonus) {
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

  if (classBonus === "slime_master" && counts.slime >= 3) bonusDamage += 1;
  if (classBonus === "necromancer") bonusDamage += counts.skeleton + counts.zombie;

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

function renderBuildPhase() {
  const selected = monsterById(gameState.selectedMonsterId);
  const pendingMonster = monsterById(gameState.pendingPlacement);
  const reels = [0, 1, 2].map((r) => gameState.reels.filter((_, idx) => idx % 3 === r));

  app.innerHTML = `
    <div class="phase-root">
      <div class="topbar">
        <h2>ビルドフェーズ（ショップ＆リール編集）</h2>
        <div class="badges">
          <div class="badge">ラウンド ${gameState.round}</div>
          <div class="badge">コイン ${gameState.coins}</div>
          <div class="badge">HP ${gameState.hp}</div>
        </div>
      </div>

      <div class="build-layout">
        <div class="phase-root">
          <section class="panel">
            <h3>ショップ</h3>
            ${
              pendingMonster
                ? `<p style="margin:0 0 10px;color:#ffcc7a;font-weight:700;">配置待ち: ${pendingMonster.name} を先に18スロットのどれかへ配置してください。</p>`
                : ""
            }
            <div class="shop-grid">
              ${MONSTERS.map(
                (m) => `
                <article class="card ${m.cls}">
                  <h4>${m.name}</h4>
                  <div class="stats">コスト ${m.cost} / HP ${m.hp} / ダメージ ${m.atk}</div>
                  <button class="small btn-secondary" data-act="select" data-mid="${m.id}">選択</button>
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
                      return `<div class="slot" data-act="slot" data-index="${absoluteIndex}" ${
                        pendingMonster ? 'style="outline:2px solid #ffcc7a;cursor:pointer;"' : ""
                      }>
                        ${monster ? `<div class="monster-chip ${monster.cls}">${monster.name}</div>` : "空"}
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
            <h3>${pendingMonster ? "配置待ちモンスター" : "選択中モンスター"}</h3>
            ${
              pendingMonster
                ? `<div class="monster-chip ${pendingMonster.cls}">${pendingMonster.name}</div><p>このモンスターをスロットに配置してください。</p>`
                : selected
                  ? `<div class="monster-chip ${selected.cls}">${selected.name}</div><p>コスト ${selected.cost} / HP ${selected.hp} / 攻撃 ${selected.atk}</p>`
                  : "<p class=\"muted\">未選択</p>"
            }
          </section>

          <section class="panel">
            <h3>次のバトル情報</h3>
            <div class="next-info"><span>敵: ${gameState.enemy.name}</span><span>HP ${gameState.enemy.hp}</span></div>
            <div class="next-info"><span>敵攻撃</span><span>${gameState.enemy.atk}</span></div>
            <button class="btn-primary" style="width:100%;margin-top:10px;" data-act="start" ${pendingMonster ? "disabled" : ""}>Start Battle</button>
            ${
              pendingMonster
                ? '<p style="margin-top:8px;color:#ffcc7a;">配置待ちモンスターの配置後にバトル開始できます。</p>'
                : ""
            }
          </section>
        </aside>
      </div>
    </div>
  `;

  bindBuildEvents();
}

function bindBuildEvents() {
  app.querySelectorAll("[data-act='select']").forEach((btn) => {
    btn.addEventListener("click", () => {
      update("selectShopMonster", { monsterId: btn.dataset.mid });
      render();
    });
  });

  app.querySelectorAll("[data-act='buy']").forEach((btn) => {
    btn.addEventListener("click", () => {
      update("buyMonster", { monsterId: btn.dataset.mid });
      render();
    });
  });

  app.querySelectorAll("[data-act='slot']").forEach((slot) => {
    slot.addEventListener("click", () => {
      const slotIndex = Number(slot.dataset.index);
      if (gameState.pendingPlacement !== null) {
        update("placePendingMonster", { index: slotIndex });
      } else {
        update("clearSlot", { index: slotIndex });
      }
      render();
    });
  });

  const startBtn = app.querySelector("[data-act='start']");
  startBtn?.addEventListener("click", () => {
    update("startBattle");
    render();
  });
}

function getClassBonusLabel(classBonus) {
  if (classBonus === "slime_master") return "スライムマスター（スライム3体以上で+1）";
  if (classBonus === "necromancer") return "ネクロマンサー（不死系攻撃+1/体）";
  if (classBonus === "beast_tamer") return "ビーストテイマー（次ラウンド開始時コイン+2）";
  return "なし";
}

function getEnemyAttackInfo(battleTurn) {
  const frequency = "毎ターン";
  const targetRule = "プレイヤーを直接攻撃";
  const nextAttackTiming = battleTurn >= 0 ? `ターン ${battleTurn + 1} 終了時` : "次ターン";
  return { frequency, targetRule, nextAttackTiming };
}

function getBattleContinueLabel(subPhase) {
  if (subPhase === "victory") return "報酬へ進む";
  if (subPhase === "defeat") return "結果へ";
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

function renderBattleGridCells() {
  return gameState.battle.visibleGrid
    .map((id) => {
      const m = monsterById(id);
      return `<div class="slot battle-cell">${m ? `<div class="monster-chip ${m.cls}">${m.name}</div>` : '<div class="muted">Empty</div>'}</div>`;
    })
    .join("");
}

function renderBattleLogPanel() {
  return `
    <section class="panel battle-panel">
      <h3>バトルログ</h3>
      <div class="log">
        ${gameState.battle.log.map((l) => `<div class="log-entry">${l}</div>`).join("")}
      </div>
    </section>
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
      </div>
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

function renderBattleSummaryPanel() {
  const { baseDamage, bonusDamage, totalDamage } = gameState.battle.lastDamage;
  return `
    <section class="panel battle-summary-panel">
      <h3>ダメージサマリー（前回スピン）</h3>
      <div class="battle-summary-grid">
        <div class="summary-card">
          <div class="muted">基礎ダメージ</div>
          <strong>${baseDamage}</strong>
        </div>
        <div class="summary-card">
          <div class="muted">クラスボーナス</div>
          <strong>${bonusDamage}</strong>
        </div>
        <div class="summary-card summary-total">
          <div class="muted">合計ダメージ</div>
          <strong>${totalDamage}</strong>
        </div>
      </div>
    </section>
  `;
}

function renderBattleResultModal() {
  if (!gameState.battle.showResultModal || !gameState.battle.turnResult) return "";
  const { playerActions, enemyActions, outcome, totalDamage } = gameState.battle.turnResult;
  const outcomeText =
    outcome === "victory" ? "敵を倒した" : outcome === "defeat" ? "プレイヤーは倒れた" : "戦闘続行";
  const continueLabel = getBattleContinueLabel(gameState.battle.subPhase);

  return `
    <div class="battle-modal-overlay">
      <section class="panel battle-result-modal">
        <h3>ターン${gameState.battle.turn} の結果</h3>
        <div class="result-section">
          <h4>プレイヤーの攻撃</h4>
          <ul>
            ${playerActions.map((line) => `<li>${line}</li>`).join("")}
            <li>このターンの合計ダメージ ${totalDamage}</li>
          </ul>
        </div>
        <div class="result-section">
          <h4>敵の行動</h4>
          <ul>
            ${
              enemyActions.length > 0
                ? enemyActions.map((line) => `<li>${line}</li>`).join("")
                : "<li>敵は行動できない。</li>"
            }
          </ul>
        </div>
        <div class="result-section">
          <h4>結果</h4>
          <ul><li>${outcomeText}</li></ul>
        </div>
        <div class="battle-modal-actions">
          <button class="btn-secondary battle-next-btn" data-act="battle-next">${continueLabel}</button>
        </div>
      </section>
    </div>
  `;
}

function renderBattlePhase() {
  const classBonusLabel = getClassBonusLabel(gameState.classBonus);
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

      <div class="battle-layout battle-layout-3col">
        <aside class="battle-col battle-col-left">
          ${renderBattleLogPanel()}
        </aside>
        <main class="battle-col battle-col-center">
          ${renderBattleCenterPanel()}
        </main>
        <aside class="battle-col battle-col-right">
          ${renderEnemyInfoPanel()}
        </aside>
      </div>

      ${renderBattleSummaryPanel()}
      ${renderBattleResultModal()}
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
}

function renderRewardPhase() {
  app.innerHTML = `
    <div class="center-phase">
      <div class="topbar">
        <h2>リワードフェーズ（クラス選択）</h2>
        <div class="badge">ラウンド ${gameState.round}</div>
      </div>

      <section class="panel">
        <h3>クラスを1つ選択してください</h3>
        <div class="choices">
          ${CLASS_CHOICES.map(
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
