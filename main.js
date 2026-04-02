const MONSTERS = [
  { id: "slime", name: "スライム", species: "slime", cost: 1, hp: 1, atk: 1, cls: "m-slime", habitats: ["water"] },
  { id: "skeleton", name: "スケルトン", species: "undead", cost: 2, hp: 2, atk: 2, cls: "m-skeleton", habitats: ["cave"] },
  { id: "zombie", name: "ゾンビ", species: "undead", cost: 2, hp: 2, atk: 2, cls: "m-zombie", habitats: ["swamp", "cave"] },
  { id: "bat", name: "バット", species: "beast", cost: 1, hp: 1, atk: 1, cls: "m-bat", habitats: ["cave"] },
  { id: "wolf", name: "ウルフ", species: "beast", cost: 2, hp: 2, atk: 3, cls: "m-wolf", habitats: ["forest"] },
  { id: "goblin", name: "ゴブリン", species: "humanoid", cost: 1, hp: 2, atk: 1, cls: "m-goblin", habitats: ["forest", "swamp"] },
  { id: "imp", name: "インプ", species: "demon", cost: 2, hp: 1, atk: 3, cls: "m-imp", habitats: ["volcano"] },
  { id: "knight", name: "ナイト", species: "humanoid", cost: 3, hp: 3, atk: 3, cls: "m-knight", habitats: ["forest"] },
  { id: "ghost", name: "ゴースト", species: "undead", cost: 2, hp: 1, atk: 2, cls: "m-ghost", habitats: ["cave"] },
  { id: "mushroom", name: "マッシュルーム", species: "plant", cost: 1, hp: 2, atk: 1, cls: "m-mushroom", habitats: ["forest", "swamp"] },
  { id: "lizard", name: "リザード", species: "reptile", cost: 2, hp: 2, atk: 2, cls: "m-lizard", habitats: ["swamp", "water"] }
];

const CLASS_CHOICES = [
  { id: "slime_master", name: "スライムマスター", desc: "スライムが揃うと追加ダメージ+1", stackable: true },
  { id: "necromancer", name: "ネクロマンサー", desc: "不死系(スケルトン/ゾンビ)の攻撃+1", stackable: true },
  { id: "beast_tamer", name: "ビーストテイマー", desc: "次ラウンド開始時コイン+2", stackable: false, category: "economic" },
  { id: "berserker", name: "バーサーカー", desc: "出撃モンスター1体につき追加ダメージ+1", stackable: true },
  { id: "lucky_strike", name: "ラッキーストライク", desc: "合計ダメージが奇数なら追加ダメージ+2", stackable: true }
];

const ROUTE_CHOICES = [
  { id: "normal", label: "通常ルート", enemyHpBonus: 0, enemyAtkBonus: 0, nextWinBonusCoins: 0, rewardCandidateBonus: 0, rewardCoinBonus: 1 },
  { id: "strong", label: "強敵ルート", enemyHpBonus: 4, enemyAtkBonus: 1, nextWinBonusCoins: 4, rewardCandidateBonus: 1, rewardCoinBonus: 0 }
];

const CONFIG = {
  COMBO: {
    ALIGN_TRIPLE_BONUS: 4
  },
  HABITAT: {
    TRIGGER_COUNT: 3,
    EFFECTS: {
      forest: { name: "森の仲間たち", baseDamage: 3 },
      water: { name: "水辺の連携", baseDamage: 2 },
      cave: { name: "洞窟の奇襲", baseDamage: 2 }
    }
  },
  MERGE: {
    MAX_STAR: 3,
    ATK_PER_EXTRA_STAR: 1
  },
  SHOP: {
    KEEP_LIMIT: 2
  },
  SCOUT: {
    DISCOUNT_DIVISOR: 2,
    MIN_COST: 1
  },
  BOSS: {
    ROUND_INTERVAL: 3,
    HP_BONUS: 6,
    ATK_BONUS: 1
  },
  REWARD: {
    BASE_COIN_OPTION: 5
  },
  HABITAT_COLORS: {
    forest: "#3ea85a",
    water: "#3f8bff",
    cave: "#8d68d8",
    swamp: "#6f7e34",
    volcano: "#d96b38"
  }
};

const SHOP_SIZE = 3;
const REROLL_INITIAL_COST = 4;
const CHOICE_COUNT = 3;

const INITIAL_STATE = () => ({
  phase: "build", // build | battle | reward | route | gameover
  round: 1,
  coins: 12,
  hp: 12,
  buildManualPlacement: false,
  buildStatus: { type: "info", text: "モンスターを購入してリールに配置します" },
  shopChoices: rollShopEntries(MONSTERS, 3),
  monsterRerollCost: 4,
  selectedMonsterId: null,
  selectedMonsterStar: 1,
  selectedSource: null, // shop | reel | null
  selectedSlotIndex: null,
  reelInteractionConfirm: null,
  pendingPlacement: null,
  pendingPurchaseSlotIndex: null,
  replacementConfirm: null,
  classSlots: [],
  maxClassSlots: 3,
  maxDuplicatePerClass: 2,
  classChoices: rollClassChoices(CLASS_CHOICES, 3),
  classRerollCost: 4,
  nextRoute: ROUTE_CHOICES[0],
  currentBattleRoute: null,
  pendingRewardType: null, // normal | charisma | null
  pendingRewardRouteId: null,
  normalRewardChoices: [],
  defeatedEnemyChoices: [],
  reels: Array(18).fill(null),
  enemy: { ...buildEnemyForRound(1, ROUTE_CHOICES[0]) },
  battle: {
    turn: 0,
    enemyHp: 10,
    visibleGrid: Array(9).fill(null),
    gridCols: 3,
    gridRows: 3,
    lastDamage: { baseDamage: 0, bonusDamage: 0, comboBonusDamage: 0, totalDamage: 0 },
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

function resetBuildUiState() {
  gameState.buildStatus = { ...DEFAULT_BUILD_STATUS };
}

function getSellValue(monster) {
  if (!monster) return 0;
  return Math.floor(monster.cost / 2);
}

function toReelUnit(slotValue) {
  if (!slotValue) return null;
  if (typeof slotValue === "string") return { id: slotValue, star: 1 };
  if (typeof slotValue !== "object" || !slotValue.id) return null;
  const star = Math.max(1, Math.min(CONFIG.MERGE.MAX_STAR, Number(slotValue.star) || 1));
  return { id: slotValue.id, star };
}

function createUnit(id, star = 1) {
  return toReelUnit({ id, star });
}

function getUnitMonster(slotValue) {
  const unit = toReelUnit(slotValue);
  return unit ? monsterById(unit.id) : null;
}

function getUnitStar(slotValue) {
  const unit = toReelUnit(slotValue);
  return unit?.star ?? 1;
}

function getStarDisplay(level) {
  if (!level || level < 1) return "";
  return "☆".repeat(level);
}

function getMonsterStarLabel(unitLike) {
  return getStarDisplay(getUnitStar(unitLike));
}

function getMonsterNameWithStars(name, level) {
  const stars = getStarDisplay(level);
  return stars ? `${name} ${stars}` : name;
}

function formatUnitForLog(unitLike) {
  const unit = toReelUnit(unitLike);
  if (!unit) return "不明";
  const monster = monsterById(unit.id);
  const name = monster?.name ?? unit.id;
  return `${name}${getStarDisplay(unit.star)}`;
}

function clearReelSelection() {
  gameState.selectedMonsterId = null;
  gameState.selectedMonsterStar = 1;
  gameState.selectedSource = null;
  gameState.selectedSlotIndex = null;
}

function clearBuildInteractionFlags() {
  gameState.reelInteractionConfirm = null;
  gameState.replacementConfirm = null;
}

function cleanupAfterBuildAction({ clearSelection = true } = {}) {
  clearBuildInteractionFlags();
  if (clearSelection) clearReelSelection();
}

function clearPendingPlacementState({ rerollPurchasedSlot = false } = {}) {
  if (rerollPurchasedSlot && gameState.pendingPurchaseSlotIndex !== null) {
    gameState.shopChoices = rerollShopEntriesWithKept(gameState.shopChoices, gameState.pendingPurchaseSlotIndex);
  }
  gameState.pendingPlacement = null;
  gameState.pendingPurchaseSlotIndex = null;
}

function beginPendingPlacement(unit, slotIndex) {
  gameState.pendingPlacement = toReelUnit(unit);
  gameState.pendingPurchaseSlotIndex = slotIndex;
  cleanupAfterBuildAction();
}

function getBuildInteractionMode() {
  if (gameState.replacementConfirm) return "replacement_confirm";
  if (gameState.reelInteractionConfirm) return "reel_interaction_confirm";
  if (gameState.pendingPlacement) return "pending_placement";
  if (gameState.selectedSource === "reel" && gameState.selectedSlotIndex !== null) return "selecting_reel";
  return "idle";
}

function isRewardPlacementPhase() {
  return gameState.phase === "reward" && gameState.pendingRewardType === "normal";
}

function canEditReelInCurrentPhase() {
  return gameState.phase === "build" || isRewardPlacementPhase();
}

function completeNormalReward() {
  gameState.pendingPlacement = null;
  gameState.pendingPurchaseSlotIndex = null;
  gameState.pendingRewardRouteId = null;
  gameState.normalRewardChoices = [];
  gameState.pendingRewardType = null;
  gameState.phase = "route";
}

function canMergeMonsters(sourceUnit, targetUnit) {
  const src = toReelUnit(sourceUnit);
  const dst = toReelUnit(targetUnit);
  if (!src || !dst) return false;
  if (src.id !== dst.id) return false;
  if (src.star !== dst.star) return false;
  if (src.star >= CONFIG.MERGE.MAX_STAR) return false;
  return true;
}

function mergeMonsters(sourceUnit, targetUnit) {
  if (!canMergeMonsters(sourceUnit, targetUnit)) return null;
  const src = toReelUnit(sourceUnit);
  return createUnit(src.id, src.star + 1);
}

function swapReelSlots(fromIndex, toIndex) {
  const fromUnit = toReelUnit(gameState.reels[fromIndex]);
  const toUnit = toReelUnit(gameState.reels[toIndex]);
  gameState.reels[toIndex] = fromUnit;
  gameState.reels[fromIndex] = toUnit;
}

function moveReelMonster(fromIndex, toIndex) {
  const fromUnit = toReelUnit(gameState.reels[fromIndex]);
  gameState.reels[toIndex] = fromUnit;
  gameState.reels[fromIndex] = null;
}

function getReplacementPreview(incomingUnit, targetUnit) {
  const incoming = toReelUnit(incomingUnit);
  const target = toReelUnit(targetUnit);
  if (!incoming || !target) return null;
  const incomingMonster = monsterById(incoming.id);
  const targetMonster = monsterById(target.id);
  const sellValue = getSellValue(targetMonster);
  return {
    incoming,
    target,
    incomingMonster,
    targetMonster,
    sellValue
  };
}

function applyReplacementWithSell(targetIndex) {
  const incoming = toReelUnit(gameState.pendingPlacement);
  if (!incoming) return;
  const existing = toReelUnit(gameState.reels[targetIndex]);
  gameState.reels[targetIndex] = incoming;
  if (existing) {
    const existingMonster = monsterById(existing.id);
    const sellValue = getSellValue(existingMonster);
    gameState.coins += sellValue;
    gameState.buildStatus = {
      type: "info",
      text: `${existingMonster?.name ?? "モンスター"} ${getMonsterStarLabel(existing)} を売却して配置しました（+${sellValue}コイン）`
    };
  } else {
    const incomingMonster = monsterById(incoming.id);
    gameState.buildStatus = { type: "info", text: `${incomingMonster?.name ?? "モンスター"} ${getMonsterStarLabel(incoming)} を配置しました` };
  }
}

function applyPendingPlacementToSlot(targetIndex) {
  const incomingUnit = toReelUnit(gameState.pendingPlacement);
  if (!incomingUnit) return { applied: false };
  const existingUnit = toReelUnit(gameState.reels[targetIndex]);
  if (!existingUnit) {
    applyReplacementWithSell(targetIndex);
    return { applied: true };
  }
  if (canMergeMonsters(incomingUnit, existingUnit)) {
    gameState.replacementConfirm = {
      type: "merge",
      targetIndex,
      targetUnit: existingUnit,
      incomingUnit
    };
    gameState.buildStatus = { type: "warn", text: "合成確認中: 既存モンスターと合成しますか？" };
    return { applied: false };
  }
  const preview = getReplacementPreview(incomingUnit, existingUnit);
  gameState.replacementConfirm = {
    type: "replace",
    targetIndex,
    targetUnit: preview?.target ?? existingUnit,
    incomingUnit: preview?.incoming ?? incomingUnit,
    sellValue: preview?.sellValue ?? 0
  };
  gameState.buildStatus = { type: "warn", text: "置き換え確認中: 既存モンスターを売却して配置しますか？" };
  return { applied: false };
}

function rollShopChoices(pool, choiceCount = SHOP_SIZE) {
  const candidates = [...pool];
  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return candidates.slice(0, Math.min(choiceCount, candidates.length)).map((monster) => monster.id);
}

function pickMonsterId(pool, excludedIds = []) {
  const ids = pool.map((monster) => monster.id);
  const uniqueCandidates = ids.filter((id) => !excludedIds.includes(id));
  const source = uniqueCandidates.length > 0 ? uniqueCandidates : ids;
  return source[Math.floor(Math.random() * source.length)];
}

function rollShopEntries(pool, choiceCount = SHOP_SIZE, baseEntries = []) {
  const entries = [];
  for (let i = 0; i < choiceCount; i += 1) {
    const preset = baseEntries[i] ?? null;
    if (preset && preset.kept) {
      entries.push({
        monsterId: preset.monsterId,
        kept: true,
        scout: Boolean(preset.scout),
        costOverride: preset.costOverride ?? null
      });
      continue;
    }
    const excluded = entries.map((entry) => entry.monsterId);
    const monsterId = pickMonsterId(pool, excluded);
    entries.push({ monsterId, kept: false, scout: false, costOverride: null });
  }
  return entries;
}

function rerollShopEntriesWithKept(entries, replacedSlotIndex = null) {
  const next = entries.map((entry) => ({ ...entry }));
  const placedIds = [];
  for (let i = 0; i < next.length; i += 1) {
    if (i === replacedSlotIndex) {
      const monsterId = pickMonsterId(MONSTERS, placedIds);
      next[i] = { monsterId, kept: false, scout: false, costOverride: null };
      placedIds.push(monsterId);
      continue;
    }
    if (next[i].kept) {
      placedIds.push(next[i].monsterId);
      continue;
    }
    const monsterId = pickMonsterId(MONSTERS, placedIds);
    next[i] = { monsterId, kept: false, scout: false, costOverride: null };
    placedIds.push(monsterId);
  }
  return next;
}

function refreshShopEntriesForNextBuild(entries) {
  return rerollShopEntriesWithKept(entries, null);
}

function rollClassChoices(pool, choiceCount = CHOICE_COUNT) {
  const candidates = [...pool];
  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return candidates.slice(0, Math.min(choiceCount, candidates.length)).map((classData) => classData.id);
}

function getRouteById(routeId) {
  return ROUTE_CHOICES.find((route) => route.id === routeId) || ROUTE_CHOICES[0];
}

function isBossRound(round) {
  return round % CONFIG.BOSS.ROUND_INTERVAL === 0;
}

function buildEnemyMonsterIds(round, routeId, count = CHOICE_COUNT) {
  const ids = MONSTERS.map((m) => m.id);
  const routeSeed = String(routeId || "normal").split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const start = (round * 17 + routeSeed) % ids.length;
  const picks = [];
  for (let i = 0; i < ids.length && picks.length < count; i += 1) {
    const idx = (start + i * 3) % ids.length;
    const id = ids[idx];
    if (!picks.includes(id)) picks.push(id);
  }
  return picks;
}

function buildScoutRewardChoices(monsterIds = []) {
  return monsterIds.map((id) => monsterById(id)).filter(Boolean).slice(0, CHOICE_COUNT);
}

function buildNormalRewardMonsterChoices(monsterIds = [], route = ROUTE_CHOICES[0]) {
  const baseChoices = buildScoutRewardChoices(monsterIds);
  const targetCount = Math.max(CHOICE_COUNT, CHOICE_COUNT + (route?.rewardCandidateBonus ?? 0));
  const existingIds = baseChoices.map((monster) => monster.id);
  while (baseChoices.length < targetCount) {
    const fallbackId = pickMonsterId(MONSTERS, existingIds);
    const fallbackMonster = monsterById(fallbackId);
    if (!fallbackMonster || existingIds.includes(fallbackMonster.id)) break;
    baseChoices.push(fallbackMonster);
    existingIds.push(fallbackMonster.id);
  }
  return baseChoices;
}

function getShopEntryCost(entry, monster) {
  if (entry?.costOverride != null) return entry.costOverride;
  return monster?.cost ?? 0;
}

function buildEnemyForRound(round, route) {
  const safeRoute = route || ROUTE_CHOICES[0];
  const bossRound = isBossRound(round);
  const bossHpBonus = bossRound ? CONFIG.BOSS.HP_BONUS : 0;
  const bossAtkBonus = bossRound ? CONFIG.BOSS.ATK_BONUS : 0;
  const monsterIds = buildEnemyMonsterIds(round, safeRoute.id, CHOICE_COUNT);
  return {
    name: bossRound ? `ラウンド${round} ボス` : `ラウンド${round}の敵`,
    isBoss: bossRound,
    monsterIds,
    hp: 10 + round * 2 + safeRoute.enemyHpBonus + bossHpBonus,
    atk: 2 + Math.floor(round / 2) + safeRoute.enemyAtkBonus + bossAtkBonus
  };
}

function countOwnedClass(classId) {
  return gameState.classSlots.filter((ownedId) => ownedId === classId).length;
}

function canPickClass(classId) {
  const classData = CLASS_CHOICES.find((c) => c.id === classId);
  if (!classData) return { ok: false, message: "不正な職業です。" };
  if (gameState.classSlots.length >= gameState.maxClassSlots) {
    return { ok: false, message: "職業スロットが上限です。" };
  }
  const duplicateCount = countOwnedClass(classId);
  if (classData.stackable === false && duplicateCount > 0) {
    return { ok: false, message: "この経済系職業は重複できません。" };
  }
  if (duplicateCount >= gameState.maxDuplicatePerClass) {
    return { ok: false, message: "同じ職業はこれ以上選べません。" };
  }
  return { ok: true, message: "" };
}

function enterBuildPhaseFromReward() {
  const beastTamerCount = countOwnedClass("beast_tamer");
  if (beastTamerCount > 0) {
    gameState.coins += beastTamerCount * 2;
  }
  gameState.phase = "build";
  resetBuildUiState();
  gameState.shopChoices = refreshShopEntriesForNextBuild(gameState.shopChoices);
  gameState.defeatedEnemyChoices = [];
  gameState.normalRewardChoices = [];
  gameState.pendingRewardRouteId = null;
  gameState.monsterRerollCost = REROLL_INITIAL_COST;
  gameState.enemy = buildEnemyForRound(gameState.round, gameState.nextRoute);
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
      if (gameState.replacementConfirm || gameState.reelInteractionConfirm) return;
      const monster = MONSTERS.find((m) => m.id === payload.monsterId);
      if (!monster) return;
      cleanupAfterBuildAction();
      gameState.selectedMonsterId = monster.id;
      gameState.selectedMonsterStar = 1;
      gameState.selectedSource = "shop";
      gameState.selectedSlotIndex = null;
      return;
    }
    case "selectReelSlot": {
      if (!canEditReelInCurrentPhase()) return;
      if (gameState.replacementConfirm || gameState.reelInteractionConfirm) return;
      const idx = payload.index;
      if (idx < 0 || idx >= gameState.reels.length) return;
      const unit = toReelUnit(gameState.reels[idx]);
      if (!unit) return;
      cleanupAfterBuildAction({ clearSelection: false });
      gameState.selectedMonsterId = unit.id;
      gameState.selectedMonsterStar = unit.star;
      gameState.selectedSource = "reel";
      gameState.selectedSlotIndex = idx;
      return;
    }
    case "clearSelection": {
      if (!canEditReelInCurrentPhase()) return;
      if (gameState.pendingPlacement || gameState.replacementConfirm || gameState.reelInteractionConfirm) {
        gameState.buildStatus = { type: "warn", text: "確認中または配置待ちの操作を完了/キャンセルしてください" };
        return;
      }
      cleanupAfterBuildAction();
      return;
    }
    case "buyMonster": {
      const slotIndex = Number(payload.slotIndex);
      if (slotIndex < 0 || slotIndex >= gameState.shopChoices.length) return;
      const entry = gameState.shopChoices[slotIndex];
      const monster = MONSTERS.find((m) => m.id === entry?.monsterId);
      const purchaseCost = getShopEntryCost(entry, monster);
      if (!monster || gameState.phase !== "build") return;
      if (payload.monsterId && payload.monsterId !== monster.id) return;
      cleanupAfterBuildAction();
      if (gameState.pendingPlacement !== null) {
        gameState.buildStatus = { type: "warn", text: "先に配置を完了してください" };
        return;
      }
      if (gameState.coins < purchaseCost) {
        gameState.buildStatus = {
          type: "warn",
          text: "コインが不足しています",
          code: "insufficient_coins",
          requiredCoins: purchaseCost
        };
        return;
      }
      gameState.selectedMonsterId = monster.id;
      gameState.selectedMonsterStar = 1;
      gameState.selectedSource = "shop";
      gameState.selectedSlotIndex = null;
      if (gameState.buildManualPlacement) {
        gameState.coins -= purchaseCost;
        beginPendingPlacement(createUnit(monster.id, 1), slotIndex);
        gameState.buildStatus = { type: "info", text: `${monster.name} ${getMonsterStarLabel(gameState.pendingPlacement)} を配置待ちです` };
        return;
      }

      const emptyIndex = getFirstEmptyVisualSlotIndex(gameState.reels);
      if (emptyIndex === -1) {
        gameState.coins -= purchaseCost;
        beginPendingPlacement(createUnit(monster.id, 1), slotIndex);
        gameState.buildStatus = { type: "warn", text: `リール満員: ${monster.name}の配置先を選ぶと既存モンスターを売却して置き換えます` };
        return;
      }

      gameState.coins -= purchaseCost;
      gameState.reels[emptyIndex] = createUnit(monster.id, 1);
      gameState.buildStatus = { type: "info", text: `${monster.name}を自動配置しました` };
      gameState.shopChoices = rerollShopEntriesWithKept(gameState.shopChoices, slotIndex);
      return;
    }
    case "toggleShopKeep": {
      if (gameState.phase !== "build") return;
      const slotIndex = Number(payload.slotIndex);
      if (slotIndex < 0 || slotIndex >= gameState.shopChoices.length) return;
      const entry = gameState.shopChoices[slotIndex];
      const keptCount = gameState.shopChoices.filter((item) => item.kept).length;
      if (!entry.kept && keptCount >= CONFIG.SHOP.KEEP_LIMIT) {
        gameState.buildStatus = { type: "warn", text: `キープ上限は${CONFIG.SHOP.KEEP_LIMIT}件です` };
        return;
      }
      gameState.shopChoices[slotIndex] = { ...entry, kept: !entry.kept };
      return;
    }
    case "rerollShop": {
      if (gameState.phase !== "build") return;
      if (gameState.coins < gameState.monsterRerollCost) {
        gameState.buildStatus = { type: "warn", text: "リロールに必要なコインが不足しています" };
        return;
      }
      gameState.coins -= gameState.monsterRerollCost;
      gameState.shopChoices = rerollShopEntriesWithKept(gameState.shopChoices);
      gameState.buildStatus = { type: "info", text: `ショップをリロールしました（-${gameState.monsterRerollCost}コイン）` };
      gameState.monsterRerollCost += 1;
      return;
    }
    case "placePendingMonster": {
      if (!canEditReelInCurrentPhase()) return;
      if (gameState.pendingPlacement === null) return;
      if (gameState.reelInteractionConfirm) return;
      const idx = payload.index;
      if (idx < 0 || idx >= gameState.reels.length) return;
      const { applied } = applyPendingPlacementToSlot(idx);
      if (!applied) return;
      clearPendingPlacementState({ rerollPurchasedSlot: gameState.phase === "build" });
      cleanupAfterBuildAction();
      if (isRewardPlacementPhase()) {
        completeNormalReward();
      }
      return;
    }
    case "confirmReplacement": {
      if (!canEditReelInCurrentPhase()) return;
      if (!gameState.replacementConfirm || gameState.pendingPlacement === null) return;
      const confirm = gameState.replacementConfirm;
      const targetIndex = confirm.targetIndex;
      if (confirm.type === "merge") {
        const incoming = toReelUnit(gameState.pendingPlacement);
        const existing = toReelUnit(gameState.reels[targetIndex]);
        if (!incoming || !existing || !canMergeMonsters(incoming, existing)) {
          cleanupAfterBuildAction({ clearSelection: false });
          gameState.buildStatus = { type: "warn", text: "合成条件が変わったためキャンセルしました" };
          return;
        }
        const merged = mergeMonsters(incoming, existing);
        gameState.reels[targetIndex] = merged;
        const mergedMonster = monsterById(merged.id);
        gameState.buildStatus = {
          type: "info",
          text: `${mergedMonster?.name ?? "モンスター"}を合成しました（${getMonsterStarLabel(merged)}）`
        };
      } else {
        applyReplacementWithSell(targetIndex);
      }
      clearPendingPlacementState({ rerollPurchasedSlot: gameState.phase === "build" });
      cleanupAfterBuildAction();
      if (isRewardPlacementPhase()) {
        completeNormalReward();
      }
      return;
    }
    case "cancelReplacement": {
      if (!canEditReelInCurrentPhase()) return;
      if (!gameState.replacementConfirm) return;
      cleanupAfterBuildAction({ clearSelection: false });
      gameState.buildStatus = { type: "info", text: "確認をキャンセルしました。配置先を選び直してください" };
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
      const unit = toReelUnit(gameState.reels[idx]);
      if (!unit) return;
      const monster = monsterById(unit.id);
      if (!monster) return;
      const sellValue = getSellValue(monster);
      gameState.coins += sellValue;
      gameState.reels[idx] = null;
      cleanupAfterBuildAction();
      gameState.buildStatus = { type: "info", text: `${getMonsterNameWithStars(monster.name, unit.star)}を売却しました（+${sellValue}コイン）` };
      return;
    }
    case "moveSelectedReelMonster": {
      if (!canEditReelInCurrentPhase()) return;
      if (gameState.pendingPlacement !== null) return;
      if (gameState.reelInteractionConfirm || gameState.replacementConfirm) return;
      if (gameState.selectedSource !== "reel" || gameState.selectedSlotIndex === null) return;
      const from = gameState.selectedSlotIndex;
      const to = Number(payload.index);
      if (to < 0 || to >= gameState.reels.length || from === to) return;
      const fromUnit = toReelUnit(gameState.reels[from]);
      if (!fromUnit) return;
      const toUnit = toReelUnit(gameState.reels[to]);
      if (!toUnit) {
        moveReelMonster(from, to);
        gameState.buildStatus = { type: "info", text: "モンスターを移動しました" };
        cleanupAfterBuildAction();
      } else if (canMergeMonsters(fromUnit, toUnit)) {
        cleanupAfterBuildAction({ clearSelection: false });
        gameState.reelInteractionConfirm = {
          fromIndex: from,
          toIndex: to
        };
        gameState.buildStatus = { type: "warn", text: "同一モンスターです: 合成 / キャンセル を選択してください" };
        return;
      } else {
        swapReelSlots(from, to);
        gameState.buildStatus = { type: "info", text: "スロットを入れ替えました" };
        cleanupAfterBuildAction();
      }
      return;
    }
    case "confirmReelMerge": {
      if (!canEditReelInCurrentPhase()) return;
      const confirm = gameState.reelInteractionConfirm;
      if (!confirm) return;
      const fromUnit = toReelUnit(gameState.reels[confirm.fromIndex]);
      const toUnit = toReelUnit(gameState.reels[confirm.toIndex]);
      if (!fromUnit || !toUnit || !canMergeMonsters(fromUnit, toUnit)) {
        cleanupAfterBuildAction();
        gameState.buildStatus = { type: "warn", text: "合成条件が変わったためキャンセルしました" };
        return;
      }
      gameState.reels[confirm.toIndex] = mergeMonsters(fromUnit, toUnit);
      gameState.reels[confirm.fromIndex] = null;
      cleanupAfterBuildAction();
      gameState.buildStatus = { type: "info", text: "モンスターを合成しました" };
      return;
    }
    case "confirmReelSwap": {
      if (!canEditReelInCurrentPhase()) return;
      const confirm = gameState.reelInteractionConfirm;
      if (!confirm) return;
      const fromUnit = toReelUnit(gameState.reels[confirm.fromIndex]);
      const toUnit = toReelUnit(gameState.reels[confirm.toIndex]);
      if (!fromUnit || !toUnit) {
        cleanupAfterBuildAction();
        return;
      }
      if (canMergeMonsters(fromUnit, toUnit)) {
        gameState.buildStatus = { type: "warn", text: "この組み合わせは合成のみ可能です" };
        return;
      }
      swapReelSlots(confirm.fromIndex, confirm.toIndex);
      cleanupAfterBuildAction();
      gameState.buildStatus = { type: "info", text: "スロットを入れ替えました" };
      return;
    }
    case "cancelReelInteraction": {
      if (!canEditReelInCurrentPhase()) return;
      if (!gameState.reelInteractionConfirm) return;
      cleanupAfterBuildAction();
      gameState.buildStatus = { type: "info", text: "操作をキャンセルしました" };
      return;
    }
    case "startBattle": {
      if (gameState.phase !== "build") return;
      if (gameState.pendingPlacement !== null) {
        gameState.buildStatus = { type: "warn", text: "先に配置を完了してください" };
        return;
      }
      gameState.currentBattleRoute = gameState.nextRoute;
      gameState.phase = "battle";
      gameState.battle = {
        turn: 0,
        enemyHp: gameState.enemy.hp,
        visibleGrid: spinVisibleGrid(gameState.reels),
        gridCols: 3,
        gridRows: 3,
        lastDamage: { baseDamage: 0, bonusDamage: 0, comboBonusDamage: 0, totalDamage: 0 },
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
      const playerActions = buildPlayerResultMessages(damageBreakdown);
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
        playerActions,
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
        const victoryRound = gameState.round;
        const rewardType = isBossRound(victoryRound) ? "charisma" : "normal";
        gameState.battle.resolved = true;
        gameState.battle.won = true;
        gameState.phase = "reward";
        gameState.coins += 8 + (gameState.currentBattleRoute?.nextWinBonusCoins ?? 0);
        gameState.pendingRewardType = rewardType;
        gameState.pendingRewardRouteId = gameState.currentBattleRoute?.id ?? gameState.nextRoute.id;
        gameState.defeatedEnemyChoices = [...(gameState.enemy.monsterIds ?? [])];
        if (rewardType === "normal") {
          const rewardRoute = getRouteById(gameState.pendingRewardRouteId);
          gameState.normalRewardChoices = buildNormalRewardMonsterChoices(gameState.defeatedEnemyChoices, rewardRoute).map((monster) => monster.id);
        } else {
          gameState.normalRewardChoices = [];
        }
        gameState.currentBattleRoute = null;
        if (rewardType === "charisma") {
          gameState.classChoices = rollClassChoices(CLASS_CHOICES, CHOICE_COUNT);
          gameState.classRerollCost = REROLL_INITIAL_COST;
        }
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
      if (gameState.pendingRewardType !== "charisma") return;
      const picked = CLASS_CHOICES.find((c) => c.id === payload.classId);
      if (!picked) return;
      if (!gameState.classChoices.includes(picked.id)) return;
      const classCheck = canPickClass(picked.id);
      if (!classCheck.ok) {
        alert(classCheck.message);
        return;
      }
      gameState.classSlots.push(picked.id);
      gameState.phase = "route";
      return;
    }
    case "skipClassSelection": {
      if (gameState.phase !== "reward") return;
      if (gameState.pendingRewardType !== "charisma") return;
      gameState.phase = "route";
      return;
    }
    case "pickNormalRewardMonster": {
      if (gameState.phase !== "reward") return;
      if (gameState.pendingRewardType !== "normal") return;
      if (gameState.pendingPlacement) return;
      const selectedMonster = monsterById(payload.monsterId);
      if (!selectedMonster) return;
      if (!gameState.normalRewardChoices.includes(selectedMonster.id)) return;
      gameState.pendingPlacement = createUnit(selectedMonster.id, 1);
      cleanupAfterBuildAction();
      gameState.buildStatus = { type: "info", text: `${selectedMonster.name} を報酬として獲得。配置先を選択してください` };
      return;
    }
    case "takeNormalRewardCoins": {
      if (gameState.phase !== "reward") return;
      if (gameState.pendingRewardType !== "normal") return;
      if (gameState.pendingPlacement) {
        gameState.buildStatus = { type: "warn", text: "配置待ちの報酬モンスターを先に配置してください" };
        return;
      }
      const rewardRoute = getRouteById(gameState.pendingRewardRouteId);
      gameState.coins += CONFIG.REWARD.BASE_COIN_OPTION + (rewardRoute.rewardCoinBonus ?? 0);
      completeNormalReward();
      return;
    }
    case "pickRoute": {
      if (gameState.phase !== "route") return;
      gameState.nextRoute = getRouteById(payload.routeId);
      gameState.pendingRewardType = null;
      enterBuildPhaseFromReward();
      return;
    }
    case "rerollClassChoices": {
      if (gameState.phase !== "reward") return;
      if (gameState.pendingRewardType !== "charisma") return;
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

function getMonsterHabitats(monster) {
  if (!monster || !Array.isArray(monster.habitats)) return [];
  if (monster.habitats.length < 1 || monster.habitats.length > 2) return [];
  return monster.habitats.filter((habitat) => Boolean(CONFIG.HABITAT_COLORS[habitat]));
}

function getVisibleGridCounts(visibleGrid) {
  return visibleGrid.reduce(
    (acc, slotValue) => {
      const unit = toReelUnit(slotValue);
      if (!unit) return acc;
      const monster = monsterById(unit.id);
      if (!monster) return acc;
      acc.idCounts[unit.id] = (acc.idCounts[unit.id] ?? 0) + 1;
      acc.filledCount += 1;
      getMonsterHabitats(monster).forEach((habitat) => {
        acc.habitatCounts[habitat] = (acc.habitatCounts[habitat] ?? 0) + 1;
      });
      return acc;
    },
    { idCounts: {}, habitatCounts: {}, filledCount: 0 }
  );
}

function findAlignedTripleCombos(visibleGrid) {
  const safeGrid = Array.isArray(visibleGrid) ? visibleGrid : [];
  const comboLines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];
  return comboLines.reduce((acc, positions) => {
    const [a, b, c] = positions;
    const unitA = toReelUnit(safeGrid[a]);
    const unitB = toReelUnit(safeGrid[b]);
    const unitC = toReelUnit(safeGrid[c]);
    if (!unitA || !unitB || !unitC) return acc;
    if (unitA.id !== unitB.id || unitA.id !== unitC.id) return acc;
    acc.push({ monsterId: unitA.id, positions });
    return acc;
  }, []);
}

function getGridPositionLabel(index) {
  const labels = ["左上", "上", "右上", "左", "中央", "右", "左下", "下", "右下"];
  return labels[index] ?? `#${index}`;
}

function formatComboPositionText(positions) {
  return `（${positions.map((index) => getGridPositionLabel(index)).join("・")}）`;
}

function getComboParticipants(grid, positions = []) {
  return positions
    .map((index) => toReelUnit(grid[index]))
    .filter(Boolean)
    .map((unit) => ({ id: unit.id, name: monsterById(unit.id)?.name ?? unit.id, star: unit.star }));
}

function getHabitatParticipants(grid, habitat, requiredCount = 3) {
  const participants = [];
  grid.forEach((slotValue) => {
    if (participants.length >= requiredCount) return;
    const unit = toReelUnit(slotValue);
    if (!unit) return;
    const monster = monsterById(unit.id);
    if (!monster) return;
    if (!getMonsterHabitats(monster).includes(habitat)) return;
    participants.push({ id: unit.id, name: monster.name, star: unit.star });
  });
  return participants;
}

function calculateStarComboMultiplier(participants = []) {
  const star2Count = participants.filter((unit) => unit.star === 2).length;
  const star3Count = participants.filter((unit) => unit.star === 3).length;
  let multiplier = 1;
  if (star2Count > 0) multiplier *= (1 + star2Count);
  if (star3Count > 0) multiplier *= (1 + star3Count) ** 2;
  return { star2Count, star3Count, multiplier };
}

function buildTriggeredEffectLogs(effectBreakdown) {
  if (!effectBreakdown) return [];
  const participantsText = effectBreakdown.participants.length > 0
    ? effectBreakdown.participants.map((unit) => formatUnitForLog(unit)).join(" / ")
    : "なし";
  const starEffects = [];
  if (effectBreakdown.star2Count > 0) starEffects.push(`☆☆x${1 + effectBreakdown.star2Count}`);
  if (effectBreakdown.star3Count > 0) starEffects.push(`☆☆☆x${(1 + effectBreakdown.star3Count) ** 2}`);
  const lines = [
    `効果: ${effectBreakdown.name}`,
    `→ 基礎ダメージ: ${effectBreakdown.baseDamage}`,
    `→ 参加ユニット: ${participantsText}`,
    `→ 星効果: ${starEffects.length > 0 ? starEffects.join(" + ") : "なし"}`,
    `→ 最終ダメージ: ${effectBreakdown.finalDamage}`
  ];
  return lines;
}

function calcDamageBreakdown(grid, classSlots = []) {
  const safeGrid = Array.isArray(grid) ? grid : [];
  let baseDamage = 0;
  let classBonusDamage = 0;
  const counts = { slime: 0, skeleton: 0, zombie: 0 };
  safeGrid.forEach((slotValue) => {
    const unit = toReelUnit(slotValue);
    if (!unit) return;
    const m = MONSTERS.find((x) => x.id === unit.id);
    if (!m) return;
    baseDamage += m.atk + (unit.star - 1) * CONFIG.MERGE.ATK_PER_EXTRA_STAR;
    if (Object.hasOwn(counts, unit.id)) counts[unit.id] += 1;
  });

  classSlots.forEach((classId) => {
    if (classId === "slime_master" && counts.slime >= 3) classBonusDamage += 1;
    if (classId === "necromancer") classBonusDamage += counts.skeleton + counts.zombie;
    if (classId === "berserker") {
      const summonedCount = safeGrid.filter((slotValue) => toReelUnit(slotValue)).length;
      classBonusDamage += summonedCount;
    }
    if (classId === "lucky_strike" && (baseDamage + classBonusDamage) % 2 === 1) classBonusDamage += 2;
  });

  const comboTriggers = findAlignedTripleCombos(safeGrid);
  const triggeredEffects = [];
  comboTriggers.forEach((trigger) => {
    const participants = getComboParticipants(safeGrid, trigger.positions);
    const { star2Count, star3Count, multiplier } = calculateStarComboMultiplier(participants);
    const monster = monsterById(trigger.monsterId);
    const name = `トリプル${monster?.name ?? trigger.monsterId}`;
    const baseComboDamage = CONFIG.COMBO.ALIGN_TRIPLE_BONUS;
    const finalDamage = baseComboDamage * multiplier;
    triggeredEffects.push({
      type: "combo",
      name,
      baseDamage: baseComboDamage,
      participants,
      star2Count,
      star3Count,
      multiplier,
      finalDamage,
      positions: trigger.positions
    });
  });

  const { habitatCounts } = getVisibleGridCounts(safeGrid);
  Object.entries(CONFIG.HABITAT.EFFECTS).forEach(([habitat, effectConfig]) => {
    if ((habitatCounts[habitat] ?? 0) < CONFIG.HABITAT.TRIGGER_COUNT) return;
    const participants = getHabitatParticipants(safeGrid, habitat, CONFIG.HABITAT.TRIGGER_COUNT);
    if (participants.length < CONFIG.HABITAT.TRIGGER_COUNT) return;
    const { star2Count, star3Count, multiplier } = calculateStarComboMultiplier(participants);
    const baseHabitatDamage = effectConfig.baseDamage ?? 0;
    const finalDamage = baseHabitatDamage * multiplier;
    triggeredEffects.push({
      type: "habitat",
      habitat,
      name: effectConfig.name ?? habitat,
      baseDamage: baseHabitatDamage,
      participants,
      star2Count,
      star3Count,
      multiplier,
      finalDamage
    });
  });

  const comboBonusDamage = triggeredEffects.reduce((sum, effect) => sum + effect.finalDamage, 0);
  const habitatBonusDamage = 0;
  const totalDamage = baseDamage + comboBonusDamage + habitatBonusDamage + classBonusDamage;

  return {
    baseDamage,
    classBonusDamage,
    comboBonusDamage,
    habitatBonusDamage,
    comboTriggers,
    triggeredEffects,
    totalDamage
  };
}

function buildPlayerResultMessages(damageBreakdown) {
  if (!damageBreakdown) return ["味方の攻撃！ 0ダメージ", "合計0ダメージ！！"];

  const lines = [`味方の攻撃！ ${damageBreakdown.baseDamage}ダメージ`];
  if (damageBreakdown.triggeredEffects.length > 0) {
    lines.push("連携コンボ！");
    damageBreakdown.triggeredEffects.forEach((effect) => {
      lines.push(...buildTriggeredEffectLogs(effect));
      if (effect.type === "combo" && effect.positions) {
        lines.push(formatComboPositionText(effect.positions));
      }
    });
  }
  if (damageBreakdown.classBonusDamage > 0) {
    lines.push(`クラス効果！ +${damageBreakdown.classBonusDamage}`);
  }
  lines.push(`合計${damageBreakdown.totalDamage}ダメージ！！`);
  return lines;
}

function buildEnemyResultMessages(enemyAtk) {
  return [`敵の攻撃 → プレイヤーに${enemyAtk}ダメージ`];
}

function monsterById(id) {
  return MONSTERS.find((m) => m.id === id) || null;
}

function getHabitatColors(monster) {
  const habitats = getMonsterHabitats(monster);
  if (habitats.length === 1) {
    return [CONFIG.HABITAT_COLORS[habitats[0]]];
  }
  if (habitats.length === 2) {
    return [CONFIG.HABITAT_COLORS[habitats[0]], CONFIG.HABITAT_COLORS[habitats[1]]];
  }
  return ["#24354a"];
}

function buildHabitatPanelStyle(monster) {
  const colors = getHabitatColors(monster);
  if (colors.length === 1) return `background:${colors[0]};`;
  const [colorA, colorB] = colors;
  return `background:linear-gradient(135deg, ${colorA} 0%, ${colorA} 48%, ${colorB} 52%, ${colorB} 100%);`;
}

function renderHabitatBand(monster, className = "habitat-panel") {
  return `<div class="${className}" style="${buildHabitatPanelStyle(monster)}"></div>`;
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
    case "route":
      renderRoutePhase();
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
  const mode = getBuildInteractionMode();
  if (mode === "reel_interaction_confirm") {
    return { type: "warn", text: "確認中: 合成 / キャンセル を選択してください" };
  }
  if (mode === "replacement_confirm") {
    if (gameState.replacementConfirm?.type === "merge") {
      return { type: "warn", text: "合成確認中: 配置待ちモンスターとの合成を確定してください" };
    }
    return { type: "warn", text: "置き換え確認中: 売却して配置するか選択してください" };
  }
  if (gameState.pendingPlacement) {
    const monster = getUnitMonster(gameState.pendingPlacement);
    if (monster) {
      return {
        type: "info",
        text: `配置モード: ${monster.name} ${getMonsterStarLabel(gameState.pendingPlacement)} の配置先を選択してください`
      };
    }
  }
  if (mode === "selecting_reel") {
    const selectedMonster = monsterById(gameState.selectedMonsterId);
    return {
      type: "info",
      text: `選択中: ${selectedMonster?.name ?? "モンスター"} を移動先スロットへクリックしてください`
    };
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
  const visibleShopEntries = gameState.shopChoices
    .map((entry, index) => {
      const monster = monsterById(entry.monsterId);
      return { ...entry, index, monster, displayCost: getShopEntryCost(entry, monster) };
    })
    .filter((entry) => entry.monster);
  const classInfo = getCurrentClassInfo(gameState.classSlots);
  const selected = monsterById(gameState.selectedMonsterId);
  const selectedStar = gameState.selectedMonsterStar ?? 1;
  const canSell = gameState.selectedSource === "reel" && gameState.selectedSlotIndex !== null && gameState.pendingPlacement === null;
  const sellValue = getSellValue(selected);
  const isReelSelection = gameState.selectedSource === "reel" && gameState.selectedSlotIndex !== null;
  const pendingMonster = getUnitMonster(gameState.pendingPlacement);
  const buildStatus = getBuildStatusDisplay();
  const showShopStatus =
    buildStatus.type !== "info"
    || buildStatus.text !== DEFAULT_BUILD_STATUS.text
    || Boolean(gameState.pendingPlacement)
    || Boolean(gameState.replacementConfirm);
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
            <div class="shop-action-row">
              <div class="action-left">
                <label style="display:flex;gap:8px;align-items:center;">
                  <input type="checkbox" data-act="toggle-manual" ${gameState.buildManualPlacement ? "checked" : ""} />
                  手動配置
                </label>
                <button class="small btn-secondary" data-act="reroll-shop">リロール 💰${gameState.monsterRerollCost}</button>
              </div>
              <div class="action-right">
                <button class="small btn-secondary" data-act="clear-selected" ${isReelSelection ? "" : "disabled"}>解除</button>
                <button class="small btn-danger" data-act="sell-selected" ${canSell ? "" : "disabled"}>売却</button>
              </div>
            </div>
            <div class="shop-grid">
              ${visibleShopEntries.map(
                (entry) => `
                <article class="card ${entry.monster.cls} ${entry.kept ? "shop-kept" : ""} ${
                  gameState.selectedSource === "shop" && gameState.selectedMonsterId === entry.monster.id ? "build-selected-shop" : ""
                }" data-act="select-shop" data-mid="${entry.monster.id}" data-slot-index="${entry.index}">
                  ${renderHabitatBand(entry.monster, "habitat-panel")}
                  <h4>${getMonsterNameWithStars(entry.monster.name, 1)}</h4>
                  <div class="stats">HP ${entry.monster.hp} / ダメージ ${entry.monster.atk}</div>
                  ${entry.scout ? `<p class="muted">スカウト割引: 💰${entry.displayCost}</p>` : ""}
                  <div class="card-controls">
                    <button class="small btn-primary purchase-cost-btn" data-act="buy" data-mid="${entry.monster.id}" data-slot-index="${entry.index}" ${pendingMonster ? "disabled" : ""}>💰${entry.displayCost}</button>
                    <button class="small ${entry.kept ? "btn-primary" : "btn-secondary"}" data-act="toggle-keep" data-slot-index="${entry.index}">${entry.kept ? "キープ中" : "キープ"}</button>
                  </div>
                </article>`
              ).join("")}
            </div>
            ${
              showShopStatus
                ? `<div class="build-status-bar build-status-${buildStatus.type} ${gameState.reelInteractionConfirm ? "build-status-interaction" : ""}" title="${buildStatus.text}">
                    <span>${buildStatus.text}</span>
                    ${
                      gameState.reelInteractionConfirm
                        ? `<div class="build-status-actions">
                            <button class="small btn-primary" data-act="confirm-reel-merge">合成</button>
                            <button class="small btn-secondary" data-act="cancel-reel-interaction">キャンセル</button>
                          </div>`
                        : ""
                    }
                  </div>`
                : ""
            }
          </section>

          <section class="panel">
            <div class="reel-grid">
              ${reels
                .map(
                  (col, colIdx) => `
                <div class="reel-col">
                  ${col
                    .map((slotValue, rowIdx) => {
                      const absoluteIndex = rowIdx * 3 + colIdx;
                      const monster = getUnitMonster(slotValue);
                      const isSelectedSlot =
                        gameState.selectedSource === "reel" && gameState.selectedSlotIndex === absoluteIndex;
                      return `<div class="slot" data-act="slot" data-index="${absoluteIndex}" ${
                        pendingMonster ? 'style="outline:2px solid #ffcc7a;cursor:pointer;"' : ""
                      }>
                        <div class="${isSelectedSlot ? "build-selected-slot" : ""}" style="width:100%;padding:2px;border-radius:8px;">
                          ${
                            monster
                              ? `<div class="monster-chip ${monster.cls} sp-${monster.species}">
                                  ${renderHabitatBand(monster, "habitat-band-chip")}
                                  <span>${getMonsterNameWithStars(monster.name, getUnitStar(slotValue))}</span>
                                </div>`
                              : "空"
                          }
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
            <div class="next-info"><span>ルート</span><span>${gameState.nextRoute.label}</span></div>
            <div class="next-info"><span>敵: ${gameState.enemy.name}</span><span>HP ${gameState.enemy.hp}</span></div>
            <div class="next-info"><span>敵攻撃</span><span>${gameState.enemy.atk}</span></div>
            <div class="next-info"><span>勝利ボーナス</span><span>+${gameState.nextRoute.nextWinBonusCoins}コイン</span></div>
            <button class="btn-primary build-start-btn" style="width:100%;margin-top:10px;" data-act="start" ${
              pendingMonster ? "disabled" : ""
            }>勝ちに行く</button>
            ${
              pendingMonster
                ? '<p style="margin-top:8px;color:#ffcc7a;">配置待ちモンスターの配置後にバトル開始できます。</p>'
                : ""
            }
          </section>

          <section class="panel selected-info-panel">
            <h3>選択中モンスター</h3>
            <div class="selected-info-content">
              ${
                isReelSelection && selected
                  ? `${renderHabitatBand(selected, "habitat-panel")}
                     <div class="monster-chip ${selected.cls} sp-${selected.species}">
                       <span>${getMonsterNameWithStars(selected.name, selectedStar)}</span>
                     </div>
                     <p>種族: ${selected.species} / 生息地: ${getMonsterHabitats(selected).join("/") || "-"}</p>
                     <p class="selected-info-stats">コスト ${selected.cost} / HP ${selected.hp} / 攻撃 ${selected.atk}</p>
                     <p>売却価格: ${sellValue}</p>`
                  : `<div class="selected-info-placeholder">リールのモンスターを選択してください。</div>`
              }
            </div>
          </section>

          ${
            gameState.reelInteractionConfirm
              ? `<section class="panel">
                  <h3>移動方法を選択</h3>
                  <p>同一モンスター/同一レベルです。</p>
                  <div style="display:flex;gap:8px;justify-content:flex-end;">
                    <button class="small btn-primary" data-act="confirm-reel-merge">合成</button>
                    <button class="small btn-secondary" data-act="cancel-reel-interaction">キャンセル</button>
                  </div>
                </section>`
              : ""
          }

          ${
            gameState.replacementConfirm
              ? `<section class="panel">
                  <h3>${gameState.replacementConfirm.type === "merge" ? "合成確認" : "置き換え確認"}</h3>
                  ${
                    gameState.replacementConfirm.type === "merge"
                      ? `<p>${monsterById(gameState.replacementConfirm.targetUnit.id)?.name ?? "モンスター"} ${getMonsterStarLabel(gameState.replacementConfirm.targetUnit)} と</p>
                         <p>${monsterById(gameState.replacementConfirm.incomingUnit.id)?.name ?? "モンスター"} ${getMonsterStarLabel(gameState.replacementConfirm.incomingUnit)} を合成しますか？</p>`
                      : `<p>${monsterById(gameState.replacementConfirm.targetUnit.id)?.name ?? "モンスター"} ${getMonsterStarLabel(gameState.replacementConfirm.targetUnit)} を売却して、</p>
                         <p>${monsterById(gameState.replacementConfirm.incomingUnit.id)?.name ?? "モンスター"} ${getMonsterStarLabel(gameState.replacementConfirm.incomingUnit)} を配置しますか？</p>
                         <p>売却額: +${gameState.replacementConfirm.sellValue}コイン</p>`
                  }
                  <div style="display:flex;gap:8px;justify-content:flex-end;">
                    <button class="small btn-secondary" data-act="cancel-replacement">キャンセル</button>
                    <button class="small btn-danger" data-act="confirm-replacement">${gameState.replacementConfirm.type === "merge" ? "合成する" : "置き換える"}</button>
                  </div>
                </section>`
              : ""
          }

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
      update("buyMonster", { monsterId: btn.dataset.mid, slotIndex: Number(btn.dataset.slotIndex) });
      render();
    });
  });

  app.querySelector("[data-act='reroll-shop']")?.addEventListener("click", () => {
    update("rerollShop");
    render();
  });

  app.querySelectorAll("[data-act='select-shop']").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target?.closest("[data-act='buy']") || event.target?.closest("[data-act='toggle-keep']")) return;
      update("selectShopMonster", { monsterId: card.dataset.mid });
      render();
    });
  });

  app.querySelectorAll("[data-act='toggle-keep']").forEach((btn) => {
    btn.addEventListener("click", () => {
      update("toggleShopKeep", { slotIndex: Number(btn.dataset.slotIndex) });
      render();
    });
  });

  app.querySelectorAll("[data-act='slot']").forEach((slot) => {
    slot.addEventListener("click", () => {
      const slotIndex = Number(slot.dataset.index);
      if (gameState.pendingPlacement !== null) {
        update("placePendingMonster", { index: slotIndex });
      } else if (
        gameState.selectedSource === "reel"
        && gameState.selectedSlotIndex !== null
        && gameState.selectedSlotIndex === slotIndex
      ) {
        update("clearSelection");
      } else if (gameState.selectedSource === "reel" && gameState.selectedSlotIndex !== null && gameState.selectedSlotIndex !== slotIndex) {
        update("moveSelectedReelMonster", { index: slotIndex });
      } else if (gameState.reels[slotIndex]) {
        update("selectReelSlot", { index: slotIndex });
      } else {
        update("clearSelection");
      }
      render();
    });
  });

  app.querySelector("[data-act='sell-selected']")?.addEventListener("click", () => {
    update("sellSelectedMonster");
    render();
  });

  app.querySelector("[data-act='clear-selected']")?.addEventListener("click", () => {
    update("clearSelection");
    render();
  });

  app.querySelector("[data-act='confirm-reel-merge']")?.addEventListener("click", () => {
    update("confirmReelMerge");
    render();
  });

  app.querySelector("[data-act='cancel-reel-interaction']")?.addEventListener("click", () => {
    update("cancelReelInteraction");
    render();
  });

  app.querySelector("[data-act='confirm-replacement']")?.addEventListener("click", () => {
    update("confirmReplacement");
    render();
  });

  app.querySelector("[data-act='cancel-replacement']")?.addEventListener("click", () => {
    update("cancelReplacement");
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

function buildCompactTurnSummary({ playerActions = [], enemyAttack, outcome }) {
  const lines = [...playerActions];
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
    .map((slotValue) => {
      const unit = toReelUnit(slotValue);
      const m = unit ? monsterById(unit.id) : null;
      return `<div class="slot battle-cell">${
        m
          ? `<div class="monster-chip ${m.cls} sp-${m.species}">
              ${renderHabitatBand(m, "habitat-band-chip")}
              <span>${getMonsterNameWithStars(m.name, unit.star)}</span>
            </div>`
          : '<div class="muted">Empty</div>'
      }</div>`;
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
  const rewardType = gameState.pendingRewardType === "charisma" ? "charisma" : "normal";
  if (rewardType === "normal") {
    const rewardRoute = getRouteById(gameState.pendingRewardRouteId);
    const rewardChoiceIds = gameState.normalRewardChoices.length > 0
      ? gameState.normalRewardChoices
      : buildNormalRewardMonsterChoices(gameState.defeatedEnemyChoices, rewardRoute).map((monster) => monster.id);
    const rewardChoices = rewardChoiceIds
      .map((id) => monsterById(id))
      .filter(Boolean);
    const coinRewardValue = CONFIG.REWARD.BASE_COIN_OPTION + (rewardRoute.rewardCoinBonus ?? 0);
    const reels = [0, 1, 2].map((r) => gameState.reels.filter((_, idx) => idx % 3 === r));
    const rewardStatus = getBuildStatusDisplay();
    const mode = getBuildInteractionMode();
    const statusForReward =
      mode === "idle"
        ? { type: "info", text: "報酬を選択してください: モンスターを受け取るか、+5コインを獲得できます" }
        : rewardStatus;
    app.innerHTML = `
      <div class="center-phase">
        <div class="topbar">
          <h2>リワードフェーズ（戦利品）</h2>
          <div class="badges">
            <div class="badge">次ラウンド ${gameState.round}</div>
            <div class="badge">コイン ${gameState.coins}</div>
          </div>
        </div>
        <section class="panel">
          <h3>報酬を1つ選択してください</h3>
          <p class="muted">敵モンスターを選んだ場合は、この画面で即時配置します。配置せずにコイン報酬を選ぶこともできます。</p>
          <p class="muted">今回ルート効果（${rewardRoute.label}）: 候補数 +${rewardRoute.rewardCandidateBonus ?? 0} / コイン報酬 +${rewardRoute.rewardCoinBonus ?? 0}</p>
          <div class="choices">
            ${rewardChoices.map((m) => `
              <article class="choice">
                <h4>${m.name}</h4>
                <p class="muted">種族: ${m.species} / 生息地: ${getMonsterHabitats(m).join("/") || "-"}</p>
                <p class="muted">報酬ユニット（☆1）</p>
                <button class="btn-secondary" data-act="pick-normal-reward-monster" data-mid="${m.id}" ${gameState.pendingPlacement ? "disabled" : ""}>このモンスターを受け取る</button>
              </article>
            `).join("")}
            <article class="choice">
              <h4>コインを受け取る</h4>
              <p class="muted">モンスター報酬を見送り、追加コインを獲得します。</p>
              <button class="btn-secondary" data-act="take-normal-reward-coins" ${gameState.pendingPlacement ? "disabled" : ""}>+${coinRewardValue}コインを受け取る</button>
            </article>
          </div>

          <div class="build-status-bar build-status-${statusForReward.type}" style="margin-top:12px;" title="${statusForReward.text}">
            <span>${statusForReward.text}</span>
          </div>

          <h3 style="margin-top:14px;">報酬配置用リール</h3>
          <div class="reel-grid">
            ${reels
              .map(
                (col, colIdx) => `
                <div class="reel-col">
                  ${col
                    .map((slotValue, rowIdx) => {
                      const absoluteIndex = rowIdx * 3 + colIdx;
                      const monster = getUnitMonster(slotValue);
                      const isSelectedSlot =
                        gameState.selectedSource === "reel" && gameState.selectedSlotIndex === absoluteIndex;
                      return `<div class="slot" data-act="reward-slot" data-index="${absoluteIndex}">
                        <div class="${isSelectedSlot ? "build-selected-slot" : ""}" style="width:100%;padding:2px;border-radius:8px;">
                          ${
                            monster
                              ? `<div class="monster-chip ${monster.cls} sp-${monster.species}">
                                  ${renderHabitatBand(monster, "habitat-band-chip")}
                                  <span>${getMonsterNameWithStars(monster.name, getUnitStar(slotValue))}</span>
                                </div>`
                              : "空"
                          }
                        </div>
                      </div>`;
                    })
                    .join("")}
                </div>`
              )
              .join("")}
          </div>

          ${
            gameState.replacementConfirm
              ? `<section class="panel" style="margin-top:10px;">
                  <h3>${gameState.replacementConfirm.type === "merge" ? "合成確認" : "置き換え確認"}</h3>
                  <p>${
                    gameState.replacementConfirm.type === "merge"
                      ? "同一モンスター/同一レベルです。合成しますか？"
                      : "既存モンスターを売却して置き換えますか？"
                  }</p>
                  <div style="display:flex;gap:8px;justify-content:flex-end;">
                    <button class="small btn-secondary" data-act="cancel-replacement">キャンセル</button>
                    <button class="small btn-danger" data-act="confirm-replacement">${gameState.replacementConfirm.type === "merge" ? "合成する" : "置き換える"}</button>
                  </div>
                </section>`
              : ""
          }

          ${
            gameState.reelInteractionConfirm
              ? `<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px;">
                  <button class="small btn-primary" data-act="confirm-reel-merge">合成</button>
                  <button class="small btn-secondary" data-act="cancel-reel-interaction">キャンセル</button>
                </div>`
              : ""
          }
        </section>
      </div>
    `;

    app.querySelectorAll("[data-act='pick-normal-reward-monster']").forEach((btn) => {
      btn.addEventListener("click", () => {
        update("pickNormalRewardMonster", { monsterId: btn.dataset.mid });
        render();
      });
    });
    app.querySelector("[data-act='take-normal-reward-coins']")?.addEventListener("click", () => {
      update("takeNormalRewardCoins");
      render();
    });
    app.querySelectorAll("[data-act='reward-slot']").forEach((slot) => {
      slot.addEventListener("click", () => {
        const slotIndex = Number(slot.dataset.index);
        if (gameState.pendingPlacement !== null) {
          update("placePendingMonster", { index: slotIndex });
        } else if (
          gameState.selectedSource === "reel"
          && gameState.selectedSlotIndex !== null
          && gameState.selectedSlotIndex === slotIndex
        ) {
          update("clearSelection");
        } else if (gameState.selectedSource === "reel" && gameState.selectedSlotIndex !== null && gameState.selectedSlotIndex !== slotIndex) {
          update("moveSelectedReelMonster", { index: slotIndex });
        } else if (gameState.reels[slotIndex]) {
          update("selectReelSlot", { index: slotIndex });
        }
        render();
      });
    });
    app.querySelector("[data-act='confirm-replacement']")?.addEventListener("click", () => {
      update("confirmReplacement");
      render();
    });
    app.querySelector("[data-act='cancel-replacement']")?.addEventListener("click", () => {
      update("cancelReplacement");
      render();
    });
    app.querySelector("[data-act='confirm-reel-merge']")?.addEventListener("click", () => {
      update("confirmReelMerge");
      render();
    });
    app.querySelector("[data-act='cancel-reel-interaction']")?.addEventListener("click", () => {
      update("cancelReelInteraction");
      render();
    });
    return;
  }

  const visibleClassChoices = gameState.classChoices
    .map((id) => CLASS_CHOICES.find((c) => c.id === id))
    .filter(Boolean);
  const classSlotFull = gameState.classSlots.length >= gameState.maxClassSlots;
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
        ${
          classSlotFull
            ? '<p class="muted">職業スロットが上限です。「スキップ」で次のビルドへ進んでください。</p>'
            : ""
        }
        <div class="choices">
          ${visibleClassChoices.map(
            (c) => {
              const classCheck = canPickClass(c.id);
              return `
            <article class="choice">
              <h4>${c.name}</h4>
              <p class="muted">${c.desc}</p>
              <button class="btn-secondary" data-act="pick" data-cid="${c.id}" ${classCheck.ok ? "" : "disabled"}>このクラスを選ぶ</button>
              ${classCheck.ok ? "" : `<p class="muted" style="margin-top:6px;">${classCheck.message}</p>`}
            </article>`;
            }
          ).join("")}
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:10px;">
          <button class="btn-secondary" data-act="skip-class">スキップ</button>
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
  app.querySelector("[data-act='skip-class']")?.addEventListener("click", () => {
    update("skipClassSelection");
    render();
  });
}

function renderRoutePhase() {
  const defeatedPreview = buildScoutRewardChoices(gameState.defeatedEnemyChoices);
  app.innerHTML = `
    <div class="center-phase">
      <div class="topbar">
        <h2>ルート選択（次の戦闘条件）</h2>
        <div class="badge">ラウンド ${gameState.round}</div>
      </div>
      <section class="panel">
        ${
          defeatedPreview.length > 0
            ? `<p class="muted">前戦闘で倒した敵: ${defeatedPreview.map((m) => m.name).join(" / ")}</p>`
            : ""
        }
        <h3>次に進むルートを選択してください</h3>
        <div class="choices">
          ${ROUTE_CHOICES.map(
            (route) => {
              const previewEnemy = buildEnemyForRound(gameState.round, route);
              const previewNames = buildScoutRewardChoices(previewEnemy.monsterIds).map((m) => m.name).join(" / ");
              return `
            <article class="choice">
              <h4>${route.label}${previewEnemy.isBoss ? "（ボス戦）" : ""}</h4>
              <p class="muted">敵HP補正 +${route.enemyHpBonus}</p>
              <p class="muted">敵攻撃補正 +${route.enemyAtkBonus}</p>
              <p class="muted">次回勝利ボーナス +${route.nextWinBonusCoins}コイン</p>
              <p class="muted">通常報酬候補 +${route.rewardCandidateBonus ?? 0}</p>
              <p class="muted">通常報酬コイン +${route.rewardCoinBonus ?? 0}</p>
              <p class="muted">出現候補: ${previewNames || "不明"}</p>
              <button class="btn-secondary" data-act="pick-route" data-rid="${route.id}">このルートに進む</button>
            </article>`;
            }
          ).join("")}
        </div>
      </section>
    </div>
  `;

  app.querySelectorAll("[data-act='pick-route']").forEach((btn) => {
    btn.addEventListener("click", () => {
      update("pickRoute", { routeId: btn.dataset.rid });
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
