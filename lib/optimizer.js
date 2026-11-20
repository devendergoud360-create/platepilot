const { loadRecipes, GOAL_TARGETS, DIET_FILTERS, SLOT_TYPES, EXTRAS, mulberry32, filterRecipes, countVarietyPenalty, evalPlan } = require('./engine');

function optimizeDay(recipes, budget, diet, goal, usedIds = new Set(), seed = Date.now()) {
  const targets = GOAL_TARGETS[goal] || GOAL_TARGETS.maintain;
  const dietFn = DIET_FILTERS[diet] || DIET_FILTERS.nonveg;
  const pool = filterRecipes(recipes, diet, goal).concat(EXTRAS.filter(dietFn));

  const bySlot = {};
  for (const t of SLOT_TYPES) bySlot[t] = pool.filter(r => r.type === t);
  const extrasPool = EXTRAS.filter(dietFn);
  const flexible = pool.filter(r => r.type !== 'extra');
  const hardCap = budget;

  let best = null;
  const attempts = 80;
  for (let a = 0; a < attempts; a++) {
    const rng = mulberry32(seed + a * 9973);
    const picked = [];
    const used = new Set(usedIds);
    let spent = 0;
    let kcal = 0, protein = 0, carbs = 0, fat = 0;

    for (const slot of SLOT_TYPES) {
      let candidates = (bySlot[slot].length ? bySlot[slot] : flexible)
        .filter(r => !used.has(r.id) && r.type !== 'extra');
      if (!candidates.length) candidates = flexible.filter(r => !used.has(r.id) && r.type !== 'extra');
      if (!candidates.length) continue;

      const prev = picked[picked.length - 1];
      const remainingSlots = 4 - picked.length;
      const remainingBudget = hardCap - spent;
      const reserve = Math.max(0, remainingSlots - 1) * 8;

      const scored = candidates.map(r => {
        const feasible = r.cost <= remainingBudget - reserve;
        let score = (r.protein / Math.max(r.cost, 1)) * 16;
        const kcalBehind = targets.kcal - kcal;
        const protBehind = targets.protein - protein;
        if (kcalBehind > 0) score += (r.kcal / Math.max(r.cost, 1)) * (kcalBehind > 400 ? 3.5 : 1.5);
        else score += r.kcal / 200;
        if (goal === 'gain' || goal === 'highprotein') {
          score += r.protein * 1.0;
          if (protBehind > 0) score += (r.protein / Math.max(r.cost, 1)) * (protBehind > 40 ? 8 : 3);
        }
        if (goal === 'loss') score += (r.protein / Math.max(r.kcal, 1)) * 100;
        if (prev && r.proteinSource === prev.proteinSource) score -= 12;
        if (prev && r.carbSource === prev.carbSource) score -= 4;
        if (picked.some(p => p.id === r.id)) score -= 100;
        score += (rng() - 0.5) * 2;
        if (!feasible) score -= 30;
        if (slot === 'breakfast' && (r.tags || []).includes('quick')) score += 1;
        return { r, score };
      });

      scored.sort((x, y) => y.score - x.score);
      let chosen = null;
      for (const { r } of scored) {
        if (spent + r.cost + reserve <= hardCap) {
          chosen = r;
          break;
        }
      }
      if (!chosen) {
        const cheap = candidates.filter(r => spent + r.cost <= hardCap)
          .sort((x, y) => y.kcal - x.kcal)[0];
        if (cheap) chosen = cheap;
      }
      if (chosen) {
        picked.push(chosen);
        used.add(chosen.id);
        spent += chosen.cost;
        kcal += chosen.kcal;
        protein += chosen.protein;
        carbs += chosen.carbs;
        fat += chosen.fat;
      }
    }

    for (let guard = 0; guard < 5; guard++) {
      const extrasUsed = picked.filter(p => p.type === 'extra').length;
      const maxExtras = (goal === 'highprotein' || goal === 'gain') && protein < targets.protein * 0.85 ? 4 : 3;
      if (extrasUsed >= maxExtras) break;
      if (kcal >= targets.kcal * 0.98 && protein >= targets.protein * 0.92) break;
      const room = hardCap - spent;
      if (room < 5) break;
      const wantProtein = goal === 'highprotein' || goal === 'gain' || protein < targets.protein * 0.85;
      const options = extrasPool.filter(e =>
        e.cost <= room &&
        !picked.some(p => p.id === e.id) &&
        (kcal < targets.kcal * 0.98 || (wantProtein && e.protein >= 5))
      );
      if (!options.length) break;
      options.sort((a, b) => {
        const aScore = (kcal < targets.kcal ? a.kcal * 0.5 : 0) + a.protein * (wantProtein ? 16 : 5);
        const bScore = (kcal < targets.kcal ? b.kcal * 0.5 : 0) + b.protein * (wantProtein ? 16 : 5);
        return bScore / b.cost - aScore / a.cost;
      });
      const pick = options[0];
      picked.push(pick);
      spent += pick.cost;
      kcal += pick.kcal;
      protein += pick.protein;
      carbs += pick.carbs;
      fat += pick.fat;
    }

    for (let iter = 0; iter < 50; iter++) {
      const mainIdx = picked.map((p, i) => ({ p, i })).filter(x => x.p.type !== 'extra');
      if (!mainIdx.length) break;
      const { i, p: old } = mainIdx[Math.floor(rng() * mainIdx.length)];
      const alts = flexible.filter(r =>
        r.type === old.type &&
        r.id !== old.id &&
        !used.has(r.id) &&
        !picked.some(p => p.id === r.id) &&
        spent - old.cost + r.cost <= hardCap
      );
      if (!alts.length) continue;
      alts.sort((x, y) => {
        const xs = x.kcal * 0.05 + x.protein * 2 - x.cost * 0.3;
        const ys = y.kcal * 0.05 + y.protein * 2 - y.cost * 0.3;
        return ys - xs;
      });
      const cand = alts[Math.floor(rng() * Math.min(4, alts.length))];
      const newSpent = spent - old.cost + cand.cost;
      const newKcal = kcal - old.kcal + cand.kcal;
      const newProt = protein - old.protein + cand.protein;
      const newCarbs = carbs - old.carbs + cand.carbs;
      const newFat = fat - old.fat + cand.fat;
      const curScore = evalPlan(spent, kcal, protein, carbs, fat, targets, hardCap, picked);
      const newScore = evalPlan(newSpent, newKcal, newProt, newCarbs, newFat, targets, hardCap,
        picked.map((p, j) => (j === i ? cand : p)));
      if (newScore < curScore - 0.5) {
        used.delete(old.id);
        used.add(cand.id);
        picked[i] = cand;
        spent = newSpent; kcal = newKcal; protein = newProt; carbs = newCarbs; fat = newFat;
      }
    }

    for (let guard = 0; guard < 3; guard++) {
      const extrasUsed = picked.filter(p => p.type === 'extra').length;
      const maxExtras = (goal === 'highprotein' || goal === 'gain') && protein < targets.protein * 0.85 ? 4 : 3;
      if (extrasUsed >= maxExtras) break;
      const room = hardCap - spent;
      if (kcal >= targets.kcal * 0.98 || room < 5) break;
      const wantProtein = goal === 'highprotein' || goal === 'gain' || protein < targets.protein * 0.85;
      const options = extrasPool.filter(e => e.cost <= room && !picked.some(p => p.id === e.id));
      if (!options.length) break;
      options.sort((a, b) => {
        const as = (wantProtein ? a.protein * 15 : 0) + a.kcal * 0.5;
        const bs = (wantProtein ? b.protein * 15 : 0) + b.kcal * 0.5;
        return bs / b.cost - as / a.cost;
      });
      const pick = options[0];
      picked.push(pick);
      spent += pick.cost;
      kcal += pick.kcal;
      protein += pick.protein;
      carbs += pick.carbs;
      fat += pick.fat;
    }

    while (spent > hardCap && picked.length > 3) {
      const idx = picked.reduce((mi, r, j, arr) => r.cost > arr[mi].cost ? j : mi, 0);
      const [rm] = picked.splice(idx, 1);
      spent -= rm.cost;
      kcal -= rm.kcal;
      protein -= rm.protein;
      carbs -= rm.carbs;
      fat -= rm.fat;
    }

    const score = evalPlan(spent, kcal, protein, carbs, fat, targets, hardCap, picked);
    if (!best || score < best.score) {
      best = {
        score,
        meals: picked,
        total: {
          kcal: Math.round(kcal),
          protein: Math.round(protein),
          carbs: Math.round(carbs),
          fat: Math.round(fat),
          cost: spent,
        },
      };
    }
  }

  const slotsPresent = new Set(best.meals.map(m => m.type));
  for (const slot of SLOT_TYPES) {
    if (!slotsPresent.has(slot)) {
      const alts = bySlot[slot].filter(r => !best.meals.some(m => m.id === r.id) && best.total.cost + r.cost <= hardCap);
      if (alts.length) {
        const pick = alts.sort((a, b) => (b.protein / b.cost) - (a.protein / a.cost))[0];
        best.meals.push(pick);
        best.total.kcal += pick.kcal;
        best.total.protein += pick.protein;
        best.total.carbs += pick.carbs;
        best.total.fat += pick.fat;
        best.total.cost += pick.cost;
      }
    }
  }

  const order = { breakfast: 0, lunch: 1, snack: 2, dinner: 3, extra: 4 };
  best.meals.sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9));

  return {
    meals: best.meals,
    totals: best.total,
    targets,
    budget: hardCap,
    remaining: hardCap - best.total.cost,
  };
}

function pickBest(pool, original, targets, goal) {
  const scored = pool.map(r => {
    let score = 0;
    score += (r.protein / Math.max(r.cost, 1)) * 10;
    score -= Math.abs(r.protein - original.protein) * 0.3;
    score -= Math.abs(r.cost - original.cost) * 0.5;
    if (goal === 'loss') score += (r.protein / Math.max(r.kcal, 1)) * 50;
    if ((goal === 'gain' || goal === 'highprotein') && r.protein > original.protein) score += 8;
    if ((goal === 'gain' || goal === 'highprotein')) score += r.protein * 0.8;
    if (r.proteinSource !== original.proteinSource) score += 3;
    return { r, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].r;
}

function swapMeal(recipes, { mealId, budget, diet = 'nonveg', goal = 'maintain', avoidIds = [] }) {
  const original = recipes.find(r => r.id === Number(mealId));
  if (!original) throw new Error('Meal not found');
  const dietFn = DIET_FILTERS[diet] || DIET_FILTERS.nonveg;
  const targets = GOAL_TARGETS[goal] || GOAL_TARGETS.maintain;

  let pool = recipes.filter(r =>
    dietFn(r) &&
    r.type === original.type &&
    r.id !== original.id &&
    !avoidIds.includes(r.id) &&
    Math.abs(r.cost - original.cost) <= Math.max(5, Math.floor(original.cost * 0.35))
  );
  if (!pool.length) {
    pool = recipes.filter(r =>
      dietFn(r) && r.type === original.type && r.id !== original.id && !avoidIds.includes(r.id)
    );
  }
  if (!pool.length) throw new Error('No alternative found');
  return { swap: pickBest(pool, original, targets, goal) };
}

function categorize(name) {
  const n = String(name || '').toLowerCase();
  if (/rice|roti|bread|oats|poha|rava|pav|papad|biscuit|makhana|semolina|wheat/.test(n)) return 'Grains & Cereals';
  if (/dal|lentil|chana|rajma|soya|sprouts|besan|peanut|gram/.test(n)) return 'Lentils & Legumes';
  if (/milk|curd|paneer|egg|butter|yogurt|ghee/.test(n)) return 'Dairy & Eggs';
  if (/chicken|fish|meat/.test(n)) return 'Protein (Meat/Fish)';
  if (/apple|banana|lemon|fruit/.test(n)) return 'Fruits';
  if (/potato|onion|tomato|carrot|peas|beans|cauliflower|vegetable|drumstick|coriander|curry leaves|chili|ginger|garlic|cucumber/.test(n)) return 'Vegetables';
  if (/oil|sugar|salt|spices|masala|cumin|turmeric|mustard|tamarind|soy sauce|chaat|pepper|jaggery/.test(n)) return 'Spices & Others';
  return 'Pantry Staples';
}

function buildGrocery(week, pantry = []) {
  const map = new Map();
  const pantrySet = new Set((pantry || []).map(p => String(p).toLowerCase()));
  for (const day of week || []) {
    for (const meal of day.meals || []) {
      for (const ing of meal.ingredients || []) {
        const key = ing.name;
        if (!map.has(key)) {
          map.set(key, { name: ing.name, qty: 0, unit: ing.unit || 'pcs', cost: 0, category: categorize(ing.name) });
        }
        const e = map.get(key);
        e.qty += Number(ing.qty) || 0;
        e.cost += Number(ing.cost) || 0;
        e.needBuy = !pantrySet.has(String(ing.name).toLowerCase());
      }
    }
  }
  const items = [...map.values()].map(e => ({ ...e, estCost: Math.round(e.cost), inPantry: !e.needBuy }));
  const categories = {};
  for (const it of items) {
    if (!categories[it.category]) categories[it.category] = [];
    categories[it.category].push(it);
  }
  const catOrder = ['Grains & Cereals', 'Lentils & Legumes', 'Dairy & Eggs', 'Vegetables', 'Fruits', 'Protein (Meat/Fish)', 'Spices & Others', 'Pantry Staples'];
  const ordered = {};
  for (const c of catOrder) if (categories[c]) ordered[c] = categories[c].sort((a, b) => a.name.localeCompare(b.name));
  for (const c of Object.keys(categories)) if (!ordered[c]) ordered[c] = categories[c];
  const totalEst = items.filter(i => !i.inPantry).reduce((s, i) => s + i.estCost, 0);
  return { categories: ordered, totalEst, itemCount: items.length };
}

module.exports = {
  optimizeDay,
  swapMeal,
  buildGrocery,
  categorize,
  pickBest,
  GOAL_TARGETS,
  DIET_FILTERS,
  SLOT_TYPES,
  EXTRAS,
};
