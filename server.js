const express = require('express');
const path = require('path');
const fs = require('fs');

const { loadRecipes } = require('./lib/engine');
const { optimizeDay, swapMeal, buildGrocery } = require('./lib/optimizer');
const { validateMealPlanRequest, validateSwapRequest, validateGroceryRequest } = require('./lib/validation');

const app = express();
const PORT = process.env.PORT || 3000;
const recipes = loadRecipes();

app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/data.js', (req, res) => {
  const data = fs.readFileSync(path.join(__dirname, 'data', 'recipes.json'), 'utf8');
  res.type('application/javascript').send(`window.PLATEPILOT_RECIPES = ${data};\n`);
});

const GOAL_TARGETS = {
  loss: { kcal: 1800, protein: 70, carbs: 200, fat: 55 },
  gain: { kcal: 2400, protein: 110, carbs: 280, fat: 70 },
  maintain: { kcal: 2100, protein: 80, carbs: 250, fat: 65 },
  highprotein: { kcal: 2200, protein: 120, carbs: 250, fat: 70 },
};

function logEvent(level, message, meta = {}) {
  const entry = { ts: new Date().toISOString(), level, message, ...meta };
  const out = JSON.stringify(entry);
  if (level === 'error') {
    console.error(out);
  } else if (level === 'warn') {
    console.warn(out);
  } else {
    console.log(out);
  }
}

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - start;
    if (req.path.startsWith('/api/')) {
      logEvent('info', 'request', { method: req.method, path: req.path, status: res.statusCode, durationMs });
    }
  });
  next();
});

app.post('/api/mealplan', (req, res) => {
  try {
    const v = validateMealPlanRequest(req.body);
    const week = [];
    const usedHistory = new Set(v.excludeIds);

    for (let d = 0; d < v.days; d++) {
      const prevDay = week[d - 1];
      const ban = new Set(usedHistory);
      if (prevDay && Array.isArray(prevDay.meals)) prevDay.meals.forEach(m => ban.add(m.id));

      const dayPlan = optimizeDay(recipes, v.budget, v.diet, v.goal, ban, Date.now() + d * 7919);

      if (v.pantry && v.pantry.length) {
        dayPlan.meals = dayPlan.meals.map(m => {
          const matches = (m.ingredients || []).filter(i =>
            v.pantry.some(p => String(p).toLowerCase() === String(i.name).toLowerCase())
          );
          return { ...m, pantryMatches: matches.map(x => x.name) };
        });
      }

      dayPlan.day = d + 1;
      dayPlan.label = `Day ${d + 1}`;
      week.push(dayPlan);
      dayPlan.meals.forEach(m => usedHistory.add(m.id));
    }

    const grocery = buildGrocery(week, v.pantry);
    const weeklyCost = week.reduce((s, d) => s + (d.totals?.cost || 0), 0);

    logEvent('info', 'mealplan_generated', { diet: v.diet, goal: v.goal, days: v.days, budget: v.budget, weeklyCost });

    res.json({
      week,
      grocery,
      weeklyCost,
      dailyBudget: v.budget,
      diet: v.diet,
      goal: v.goal,
      targets: GOAL_TARGETS[v.goal] || GOAL_TARGETS.maintain,
    });
  } catch (err) {
    const status = err.statusCode || 500;
    logEvent(status >= 500 ? 'error' : 'warn', 'mealplan_error', {
      message: err.message,
      details: err.details || null,
      status,
    });
    res.status(status).json({ error: err.message || 'Failed to generate meal plan', details: err.details || undefined });
  }
});

app.post('/api/swap', (req, res) => {
  try {
    const v = validateSwapRequest(req.body);
    const data = swapMeal(recipes, {
      mealId: v.mealId,
      budget: v.budget,
      diet: v.diet,
      goal: v.goal,
      avoidIds: v.avoidIds,
    });
    logEvent('info', 'swap_done', { mealId: v.mealId, swapTo: data.swap?.name });
    res.json(data);
  } catch (err) {
    const status = err.message === 'Meal not found' ? 404 : (err.message === 'No alternative found' ? 404 : (err.statusCode || 500));
    logEvent(status >= 500 ? 'error' : 'warn', 'swap_error', { message: err.message, status });
    res.status(status).json({ error: err.message || 'Swap failed' });
  }
});

app.get('/api/recipes', (req, res) => {
  try {
    const { diet, type, q } = req.query;
    let list = recipes;
    if (diet && ['veg', 'nonveg', 'vegan'].includes(diet)) {
      const df = { veg: r => r.diet.includes('veg'), nonveg: () => true, vegan: r => r.diet.includes('vegan') }[diet];
      list = list.filter(df);
    }
    if (type && typeof type === 'string') {
      list = list.filter(r => r.type === type);
    }
    if (q && typeof q === 'string' && q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter(r => String(r.name).toLowerCase().includes(s));
    }
    res.json(list);
  } catch (err) {
    logEvent('error', 'recipes_error', { message: err.message });
    res.status(500).json({ error: 'Failed to list recipes' });
  }
});

app.post('/api/grocery', (req, res) => {
  try {
    const v = validateGroceryRequest(req.body);
    res.json(buildGrocery(v.week, []));
  } catch (err) {
    const status = err.statusCode || 500;
    logEvent(status >= 500 ? 'error' : 'warn', 'grocery_error', { message: err.message, status });
    res.status(status).json({ error: err.message || 'Failed to build grocery list' });
  }
});

app.post('/api/mess', (req, res) => {
  try {
    const body = req.body || {};
    const messMenu = Array.isArray(body.messMenu) ? body.messMenu : [];
    const budget = Number(body.budget) || 120;
    const diet = body.diet || 'nonveg';
    const goal = body.goal || 'maintain';

    if (!['veg', 'nonveg', 'vegan'].includes(diet)) {
      return res.status(400).json({ error: 'Invalid diet' });
    }
    if (!['loss', 'gain', 'maintain', 'highprotein'].includes(goal)) {
      return res.status(400).json({ error: 'Invalid goal' });
    }
    if (!Number.isFinite(budget) || budget < 40 || budget > 500) {
      return res.status(400).json({ error: 'budget must be between ₹40 and ₹500' });
    }

    const menu = messMenu.map(m => {
      const name = String(m?.name || '');
      const match = recipes.find(r => r.name.toLowerCase().includes(name.toLowerCase()));
      return match ? { ...m, ...match, source: 'mess' } : { ...m, id: null, source: 'mess', name: name || 'Unknown', cost: Number(m?.cost) || 0 };
    });

    const sorted = menu.slice().sort((a, b) => ((b.protein || 0) / Math.max(b.cost || 1, 1)) - ((a.protein || 0) / Math.max(a.cost || 1, 1)));
    const messBudget = Math.floor(budget * 0.6);
    const picks = [];
    let spent = 0;
    for (const m of sorted) {
      if (spent + (Number(m.cost) || 0) <= messBudget) {
        picks.push(m);
        spent += Number(m.cost) || 0;
      }
    }
    const remaining = budget - spent;
    const df = { veg: r => r.diet.includes('veg'), nonveg: () => true, vegan: r => r.diet.includes('vegan') }[diet];
    const supplements = recipes
      .filter(r => df(r) && (r.tags || []).includes('high-protein') && r.cost <= remaining)
      .sort((a, b) => (b.protein / b.cost) - (a.protein / a.cost))
      .slice(0, 3);

    res.json({ messPicks: picks, messSpent: spent, supplements, outsideBudget: remaining, total: spent + (supplements[0]?.cost || 0) });
  } catch (err) {
    logEvent('error', 'mess_error', { message: err.message });
    res.status(500).json({ error: 'Mess analysis failed' });
  }
});

app.get('/api/targets', (req, res) => res.json(GOAL_TARGETS));

app.use((err, req, res, next) => {
  logEvent('error', 'unhandled_error', { message: err?.message, stack: err?.stack });
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    logEvent('info', 'server_started', { port: PORT });
  });
}

module.exports = { app };
