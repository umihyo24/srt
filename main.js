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
  classBonus: null,
  reels: Array(18).fill(null),
  enemy: { name: "ゴブリンウォーリア", hp: 10, atk: 2 },
  battle: {
    turn: 0,
    enemyHp: 10,
    visibleGrid: Array(9).fill(null),
    log: [],
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
      if (!monster || gameState.coins < monster.cost || gameState.phase !== "build") return;
      const emptyIndex = gameState.reels.findIndex((v) => v === null);
      if (emptyIndex === -1) return;
      gameState.coins -= monster.cost;
      gameState.reels[emptyIndex] = monster.id;
      gameState.selectedMonsterId = monster.id;
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
      gameState.phase = "battle";
      gameState.battle = {
        turn: 0,
        enemyHp: gameState.enemy.hp,
        visibleGrid: spinVisibleGrid(gameState.reels),
        log: ["バトル開始！スロットを回して攻撃します。"],
        resolved: false,
        won: null
      };
      return;
    }
    case "spin": {
      if (gameState.phase !== "battle" || gameState.battle.resolved) return;
      gameState.battle.turn += 1;
      gameState.battle.visibleGrid = spinVisibleGrid(gameState.reels);
      const dmg = calcDamage(gameState.battle.visibleGrid, gameState.classBonus);
      gameState.battle.enemyHp = Math.max(0, gameState.battle.enemyHp - dmg);
      gameState.battle.log.push(`ターン${gameState.battle.turn}: 合計 ${dmg} ダメージ`);

      if (gameState.battle.enemyHp <= 0) {
        gameState.battle.log.push("敵を撃破！報酬フェーズへ進みます。");
        gameState.battle.resolved = true;
        gameState.battle.won = true;
        gameState.phase = "reward";
        gameState.coins += 8;
        gameState.round += 1;
        return;
      }

      gameState.hp -= gameState.enemy.atk;
      gameState.battle.log.push(`敵の反撃: ${gameState.enemy.atk} ダメージ (残りHP ${gameState.hp})`);

      if (gameState.hp <= 0 || gameState.battle.turn >= 6) {
        gameState.battle.log.push("敗北…ゲームオーバー。");
        gameState.battle.resolved = true;
        gameState.battle.won = false;
        gameState.phase = "gameover";
      }
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

function spinVisibleGrid(reels) {
  return Array.from({ length: 9 }, (_, i) => {
    const reelIndex = i % 3;
    const reelItems = [];
    for (let row = 0; row < 6; row += 1) {
      const val = reels[row * 3 + reelIndex];
      if (val) reelItems.push(val);
    }
    if (reelItems.length === 0) return null;
    return reelItems[Math.floor(Math.random() * reelItems.length)];
  });
}

function calcDamage(grid, classBonus) {
  let dmg = 0;
  const counts = { slime: 0, skeleton: 0, zombie: 0 };
  grid.forEach((id) => {
    if (!id) return;
    const m = MONSTERS.find((x) => x.id === id);
    if (!m) return;
    dmg += m.atk;
    counts[id] += 1;
  });

  if (classBonus === "slime_master" && counts.slime >= 3) dmg += 1;
  if (classBonus === "necromancer") dmg += counts.skeleton + counts.zombie;
  return dmg;
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
            <div class="shop-grid">
              ${MONSTERS.map(
                (m) => `
                <article class="card ${m.cls}">
                  <h4>${m.name}</h4>
                  <div class="stats">コスト ${m.cost} / HP ${m.hp} / ダメージ ${m.atk}</div>
                  <button class="small btn-secondary" data-act="select" data-mid="${m.id}">選択</button>
                  <button class="small btn-primary" data-act="buy" data-mid="${m.id}">購入</button>
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
                      return `<div class="slot" data-act="clear" data-index="${absoluteIndex}">
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
            <h3>選択中モンスター</h3>
            ${selected ? `<div class="monster-chip ${selected.cls}">${selected.name}</div><p>コスト ${selected.cost} / HP ${selected.hp} / 攻撃 ${selected.atk}</p>` : "<p class=\"muted\">未選択</p>"}
          </section>

          <section class="panel">
            <h3>次のバトル情報</h3>
            <div class="next-info"><span>敵: ${gameState.enemy.name}</span><span>HP ${gameState.enemy.hp}</span></div>
            <div class="next-info"><span>敵攻撃</span><span>${gameState.enemy.atk}</span></div>
            <button class="btn-primary" style="width:100%;margin-top:10px;" data-act="start">Start Battle</button>
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

  app.querySelectorAll("[data-act='clear']").forEach((slot) => {
    slot.addEventListener("click", () => {
      update("clearSlot", { index: Number(slot.dataset.index) });
      render();
    });
  });

  const startBtn = app.querySelector("[data-act='start']");
  startBtn?.addEventListener("click", () => {
    update("startBattle");
    render();
  });
}

function renderBattlePhase() {
  app.innerHTML = `
    <div class="phase-root">
      <div class="topbar">
        <h2>バトルフェーズ（スロットバトル）</h2>
        <div class="badges">
          <div class="badge">プレイヤーHP ${gameState.hp}</div>
          <div class="badge">敵HP ${gameState.battle.enemyHp}</div>
          <div class="badge">ターン ${gameState.battle.turn}</div>
        </div>
      </div>

      <div class="battle-layout">
        <div class="phase-root">
          <section class="panel">
            <h3>スロット（3x3）</h3>
            <div class="machine">
              ${gameState.battle.visibleGrid
                .map((id) => {
                  const m = monsterById(id);
                  return `<div class="slot">${m ? `<div class="monster-chip ${m.cls}">${m.name}</div>` : "-"}</div>`;
                })
                .join("")}
            </div>
            <button class="btn-primary" style="margin-top:10px" data-act="spin">スピンして攻撃</button>
          </section>

          <section class="panel">
            <h3>バトルログ</h3>
            <div class="log">
              ${gameState.battle.log.map((l) => `<div class="log-entry">${l}</div>`).join("")}
            </div>
          </section>
        </div>

        <aside class="panel">
          <h3>敵情報</h3>
          <p>${gameState.enemy.name}</p>
          <p>HP: ${gameState.battle.enemyHp}</p>
          <p>攻撃: ${gameState.enemy.atk}</p>
          <p class="muted">※ このフェーズにはショップ・リール編集UIは表示されません。</p>
        </aside>
      </div>
    </div>
  `;

  app.querySelector("[data-act='spin']")?.addEventListener("click", () => {
    update("spin");
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
