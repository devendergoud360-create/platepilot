const fs = require('fs');
const path = require('path');

let recipesCache = null;

function loadRecipes() {
  if (recipesCache) return recipesCache;
  const p = path.join(__dirname, '..', 'data', 'recipes.json');
  recipesCache = JSON.parse(fs.readFileSync(p, 'utf8'));
  return recipesCache;
}

const GOAL_TARGETS = {
  loss: { kcal: 1800, protein: 70, carbs: 200, fat: 55 },
  gain: { kcal: 2400, protein: 110, carbs: 280, fat: 70 },
  maintain: { kcal: 2100, protein: 80, carbs: 250, fat: 65 },
  highprotein: { kcal: 2200, protein: 120, carbs: 250, fat: 70 },
};

const DIET_FILTERS = {
  veg: r => Array.isArray(r.diet) && r.diet.includes('veg'),
  nonveg: () => true,
  vegan: r => Array.isArray(r.diet) && r.diet.includes('vegan'),
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
    if (meals[i].proteinSource && meals[i - 1].proteinSource && meals[i].proteinSource === meals[i - 1].proteinSource) penalty++;
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

module.exports = {
  loadRecipes,
  GOAL_TARGETS,
  DIET_FILTERS,
  SLOT_TYPES,
  EXTRAS,
  mulberry32,
  filterRecipes,
  countVarietyPenalty,
  evalPlan,
};
