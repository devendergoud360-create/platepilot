/**
 * PlatePilot browser engine — port of server optimization logic.
 * No network required.
 */

export const GOAL_TARGETS = {
  loss: { kcal: 1800, protein: 70, carbs: 200, fat: 55 },
  gain: { kcal: 2400, protein: 110, carbs: 280, fat: 70 },
  maintain: { kcal: 2100, protein: 80, carbs: 250, fat: 65 },
  highprotein: { kcal: 2200, protein: 120, carbs: 250, fat: 70 },
};

const DIET_FILTERS = {
  veg: r => r.diet.includes('veg'),
  nonveg: () => true,
  vegan: r => r.diet.includes('vegan'),
};

const SLOT_TYPES = ['breakfast', 'lunch', 'snack', 'dinner'];

const EXTRAS = [
  { id: 9001, name: 'Extra Roti', type: 'extra', kcal: 120, protein: 4, carbs: 24, fat: 2, cost: 5, prepMin: 5, difficulty: 'easy',
    ingredients: [{ name: 'Wheat Roti', qty: 1, unit: 'pcs', cost: 5 }],
    recipe: 'Add one more hot wheat roti.', category: 'grains', proteinSource: 'Wheat Roti', carbSource: 'Wheat Roti', diet: ['veg','nonveg','vegan'] },
  { id: 9002, name: 'Extra Rice Bowl', type: 'extra', kcal: 180, protein: 4, carbs: 40, fat: 1, cost: 6, prepMin: 8, difficulty: 'easy',
    ingredients: [{ name: 'Rice', qty: 40, unit: 'g', cost: 4 }, { name: 'Ghee', qty: 1, unit: 'tsp', cost: 2 }],
    recipe: 'Extra scoop of steamed rice with a tsp of ghee.', category: 'grains', proteinSource: 'Rice', carbSource: 'Rice', diet: ['veg','nonveg'] },
  { id: 9003, name: 'Banana + Peanut Butter', type: 'extra', kcal: 200, protein: 7, carbs: 26, fat: 9, cost: 10, prepMin: 3, difficulty: 'easy',
    ingredients: [{ name: 'Banana', qty: 1, unit: 'pcs', cost: 5 }, { name: 'Peanut Butter', qty: 1, unit: 'tbsp', cost: 5 }],
    recipe: 'Banana with a tablespoon of peanut butter.', category: 'fruits', proteinSource: 'Peanut Butter', carbSource: 'Banana', diet: ['veg','nonveg','vegan'] },
  { id: 9004, name: 'Boiled Egg', type: 'extra', kcal: 75, protein: 6, carbs: 1, fat: 5, cost: 7, prepMin: 8, difficulty: 'easy',
    ingredients: [{ name: 'Eggs', qty: 1, unit: 'pcs', cost: 7 }],
    recipe: 'One hard-boiled egg.', category: 'eggs', proteinSource: 'Eggs', carbSource: 'Egg', diet: ['nonveg'] },
  { id: 9005, name: 'Glass of Milk', type: 'extra', kcal: 150, protein: 8, carbs: 12, fat: 8, cost: 8, prepMin: 2, difficulty: 'easy',
    ingredients: [{ name: 'Milk', qty: 200, unit: 'ml', cost: 8 }],
    recipe: 'Warm glass of full-cream milk.', category: 'dairy', proteinSource: 'Milk', carbSource: 'Milk', diet: ['veg','nonveg'] },
  { id: 9006, name: 'Peanut Chikki Bite', type: 'extra', kcal: 160, protein: 5, carbs: 18, fat: 9, cost: 8, prepMin: 2, difficulty: 'easy',
    ingredients: [{ name: 'Peanuts', qty: 20, unit: 'g', cost: 6 }, { name: 'Jaggery', qty: 8, unit: 'g', cost: 2 }],
    recipe: 'Small peanut-jaggery chikki piece.', category: 'legumes', proteinSource: 'Peanuts', carbSource: 'Jaggery', diet: ['veg','nonveg','vegan'] },
  { id: 9007, name: 'Curd Bowl', type: 'extra', kcal: 90, protein: 5, carbs: 7, fat: 4, cost: 6, prepMin: 2, difficulty: 'easy',
    ingredients: [{ name: 'Curd', qty: 120, unit: 'g', cost: 6 }],
    recipe: 'Small bowl of fresh curd.', category: 'dairy', proteinSource: 'Curd', carbSource: 'Curd', diet: ['veg','nonveg'] },
  { id: 9008, name: 'Roasted Chana Handful', type: 'extra', kcal: 130, protein: 7, carbs: 20, fat: 3, cost: 7, prepMin: 2, difficulty: 'easy',
    ingredients: [{ name: 'Roasted Chana', qty: 30, unit: 'g', cost: 7 }],
    recipe: 'Handful of roasted chana.', category: 'legumes', proteinSource: 'Roasted Chana', carbSource: 'Roasted Chana', diet: ['veg','nonveg','vegan'] },
  { id: 9009, name: 'Soya Milk Glass', type: 'extra', kcal: 140, protein: 9, carbs: 12, fat: 6, cost: 10, prepMin: 2, difficulty: 'easy',
    ingredients: [{ name: 'Soya Milk', qty: 200, unit: 'ml', cost: 10 }],
    recipe: 'Glass of soya milk for plant protein.', category: 'legumes', proteinSource: 'Soya Milk', carbSource: 'Soya Milk', diet: ['veg','vegan','nonveg'] },
  { id: 9010, name: 'Extra Sprouts Bowl', type: 'extra', kcal: 120, protein: 9, carbs: 18, fat: 2, cost: 9, prepMin: 5, difficulty: 'easy',
    ingredients: [{ name: 'Moong Sprouts', qty: 70, unit: 'g', cost: 9 }],
    recipe: 'Extra bowl of steamed moong sprouts.', category: 'legumes', proteinSource: 'Moong Sprouts', carbSource: 'Moong Sprouts', diet: ['veg','vegan','nonveg'] },
  { id: 9011, name: 'Roasted Chana + Curd', type: 'extra', kcal: 150, protein: 10, carbs: 22, fat: 4, cost: 11, prepMin: 3, difficulty: 'easy',
    ingredients: [{ name: 'Roasted Chana', qty: 25, unit: 'g', cost: 6 }, { name: 'Curd', qty: 80, unit: 'g', cost: 5 }],
    recipe: 'Roasted chana with a side of curd.', category: 'legumes', proteinSource: 'Roasted Chana', carbSource: 'Roasted Chana', diet: ['veg','nonveg'] },
  { id: 9012, name: 'Peanut Butter Scoop', type: 'extra', kcal: 120, protein: 6, carbs: 8, fat: 9, cost: 6, prepMin: 1, difficulty: 'easy',
    ingredients: [{ name: 'Peanut Butter', qty: 1, unit: 'tbsp', cost: 6 }],
    recipe: 'A spoon of peanut butter.', category: 'legumes', proteinSource: 'Peanut Butter', carbSource: 'Peanut Butter', diet: ['veg','nonveg','vegan'] },
];

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function filterRecipes(recipes, diet, goal) {
  const dietFn = DIET_FILTERS[diet] || DIET_FILTERS.nonveg;
  let pool = recipes.filter(dietFn);
  if (goal === 'highprotein' || goal === 'gain') {
    pool = pool.slice().sort((a, b) => (b.protein / b.cost) - (a.protein / a.cost));
  }
  if (goal === 'loss') {
    pool = pool.slice().sort((a, b) => (a.kcal / Math.max(a.protein, 1)) - (b.kcal / Math.max(b.protein, 1)));
  }
  return pool;
}

function countVarietyPenalty(meals) {
  let penalty = 0;
  for (let i = 1; i < meals.length; i++) {
    if (meals[i].proteinSource === meals[i - 1].proteinSource) penalty++;
  }
  return penalty;
}

function evalPlan(spent, kcal, protein, carbs, fat, targets, hardCap, meals) {
  const kcalGap = Math.abs(kcal - targets.kcal);
  const proteinGap = Math.max(0, targets.protein - protein) * 7;
  const budgetUnused = Math.max(0, hardCap - spent);
  const over = spent > hardCap ? (spent - hardCap) * 50 : 0;
  const variety = countVarietyPenalty(meals || []);
  const underFuel = kcal < targets.kcal * 0.9 ? (targets.kcal - kcal) * 0.4 : 0;
  return kcalGap + proteinGap + over + variety * 40 - Math.min(budgetUnused, 30) * 0.3 + underFuel;
}

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

    // Top-up extras
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

    // Local search
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

    // Final top-up
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

  // Fill missing slots
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

export function generateMealPlan(recipes, { budget, diet = 'nonveg', goal = 'maintain', days = 7, pantry = [] }) {
  const dailyBudget = Number(budget);
  if (!dailyBudget || dailyBudget < 40 || dailyBudget > 500) {
    throw new Error('Budget must be between ₹40 and ₹500 per day');
  }

  const week = [];
  const usedHistory = new Set();
  for (let d = 0; d < days; d++) {
    const prevDay = week[d - 1];
    const ban = new Set(usedHistory);
    if (prevDay) prevDay.meals.forEach(m => ban.add(m.id));

    const dayPlan = optimizeDay(recipes, dailyBudget, diet, goal, ban, Date.now() + d * 7919);

    if (pantry && pantry.length) {
      dayPlan.meals = dayPlan.meals.map(m => {
        const matches = (m.ingredients || []).filter(i =>
          pantry.some(p => p.toLowerCase() === i.name.toLowerCase())
        );
        return { ...m, pantryMatches: matches.map(x => x.name) };
      });
    }

    dayPlan.day = d + 1;
    dayPlan.label = `Day ${d + 1}`;
    week.push(dayPlan);
    dayPlan.meals.forEach(m => usedHistory.add(m.id));
  }

  const grocery = buildGrocery(week, pantry);
  const weeklyCost = week.reduce((s, d) => s + d.totals.cost, 0);

  return {
    week,
    grocery,
    weeklyCost,
    dailyBudget,
    diet,
    goal,
    targets: GOAL_TARGETS[goal] || GOAL_TARGETS.maintain,
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

export function swapMeal(recipes, { mealId, budget, diet = 'nonveg', goal = 'maintain', avoidIds = [] }) {
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

export function analyzeMess(messMenu = [], { budget = 120, diet = 'nonveg', goal = 'maintain' } = {}, recipes = []) {
  const menu = messMenu.map(m => {
    const match = recipes.find(r => r.name.toLowerCase().includes(String(m.name || '').toLowerCase()));
    return match ? { ...m, ...match, source: 'mess' } : { ...m, id: null, source: 'mess' };
  });
  const sorted = menu.slice().sort((a, b) =>
    ((b.protein || 0) / Math.max(b.cost || 1, 1)) - ((a.protein || 0) / Math.max(a.cost || 1, 1))
  );
  const messBudget = Math.floor(budget * 0.6);
  const picks = [];
  let spent = 0;
  for (const m of sorted) {
    if (spent + (m.cost || 0) <= messBudget) {
      picks.push(m);
      spent += m.cost || 0;
    }
  }
  const remaining = budget - spent;
  const dietFn = DIET_FILTERS[diet] || DIET_FILTERS.nonveg;
  const supplements = recipes
    .filter(r => dietFn(r) && (r.tags || []).includes('high-protein') && r.cost <= remaining)
    .sort((a, b) => (b.protein / b.cost) - (a.protein / a.cost))
    .slice(0, 3);

  return {
    messPicks: picks,
    messSpent: spent,
    supplements,
    outsideBudget: remaining,
    total: spent + (supplements[0]?.cost || 0),
  };
}

function categorize(name) {
  const n = name.toLowerCase();
  if (/rice|roti|bread|oats|poha|rava|pav|papad|biscuit|makhana|semolina|wheat/.test(n)) return 'Grains & Cereals';
  if (/dal|lentil|chana|rajma|soya|sprouts|besan|peanut|gram/.test(n)) return 'Lentils & Legumes';
  if (/milk|curd|paneer|egg|butter|yogurt|ghee/.test(n)) return 'Dairy & Eggs';
  if (/chicken|fish|meat/.test(n)) return 'Protein (Meat/Fish)';
  if (/apple|banana|lemon|fruit/.test(n)) return 'Fruits';
  if (/potato|onion|tomato|carrot|peas|beans|cauliflower|vegetable|drumstick|coriander|curry leaves|chili|ginger|garlic|cucumber/.test(n)) return 'Vegetables';
  if (/oil|sugar|salt|spices|masala|cumin|turmeric|mustard|tamarind|soy sauce|chaat|pepper|jaggery/.test(n)) return 'Spices & Others';
  return 'Pantry Staples';
}

export function buildGrocery(week, pantry = []) {
  const map = new Map();
  const pantrySet = new Set((pantry || []).map(p => p.toLowerCase()));
  for (const day of week) {
    for (const meal of day.meals) {
      for (const ing of meal.ingredients || []) {
        const key = ing.name;
        if (!map.has(key)) {
          map.set(key, {
            name: ing.name,
            qty: 0,
            unit: ing.unit,
            cost: 0,
            category: categorize(ing.name),
          });
        }
        const e = map.get(key);
        e.qty += ing.qty;
        e.cost += ing.cost;
        e.needBuy = !pantrySet.has(ing.name.toLowerCase());
      }
    }
  }

  const items = [...map.values()].map(e => ({
    ...e,
    estCost: Math.round(e.cost),
    inPantry: !e.needBuy,
  }));

  const categories = {};
  for (const it of items) {
    if (!categories[it.category]) categories[it.category] = [];
    categories[it.category].push(it);
  }

  const ordered = {};
  const catOrder = ['Grains & Cereals', 'Lentils & Legumes', 'Dairy & Eggs', 'Vegetables', 'Fruits', 'Protein (Meat/Fish)', 'Spices & Others', 'Pantry Staples'];
  for (const c of catOrder) {
    if (categories[c]) ordered[c] = categories[c].sort((a, b) => a.name.localeCompare(b.name));
  }
  for (const c of Object.keys(categories)) {
    if (!ordered[c]) ordered[c] = categories[c];
  }

  const totalEst = items.filter(i => !i.inPantry).reduce((s, i) => s + i.estCost, 0);
  return { categories: ordered, totalEst, itemCount: items.length };
}
