import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const recipes = JSON.parse(readFileSync(path.join(__dirname, '..', 'data', 'recipes.json'), 'utf8'));
const { optimizeDay, swapMeal, buildGrocery, categorize } = require('../lib/optimizer');
const { filterRecipes } = require('../lib/engine');

describe('categorize', () => {
  it('categorizes grains and others', () => {
    expect(categorize('Rice')).toBe('Grains & Cereals');
    expect(categorize('Toor Dal')).toBe('Lentils & Legumes');
    expect(categorize('Milk')).toBe('Dairy & Eggs');
    expect(categorize('Chicken')).toBe('Protein (Meat/Fish)');
    expect(categorize('Banana')).toBe('Fruits');
    expect(categorize('Salt')).toBe('Spices & Others');
  });
});

describe('filterRecipes', () => {
  it('filters veg diet (no nonveg-only meats)', () => {
    const v = filterRecipes(recipes, 'veg', 'maintain');
    expect(v.every(r => r.diet && r.diet.includes('veg'))).toBe(true);
  });
  it('filters vegan diet', () => {
    const v = filterRecipes(recipes, 'vegan', 'maintain');
    expect(v.every(r => r.diet && r.diet.includes('vegan'))).toBe(true);
  });
});

describe('optimizeDay', () => {
  it('produces a plan within budget for highprotein nonveg', () => {
    const plan = optimizeDay(recipes, 120, 'nonveg', 'highprotein', new Set(), 12345);
    expect(plan.totals.cost).toBeLessThanOrEqual(120);
    expect(plan.meals.length).toBeGreaterThanOrEqual(3);
    expect(plan.totals.kcal).toBeGreaterThan(0);
    expect(plan.totals.protein).toBeGreaterThan(0);
  });
  it('respects veg diet filter', () => {
    const plan = optimizeDay(recipes, 100, 'veg', 'maintain', new Set(), 54321);
    expect(plan.totals.cost).toBeLessThanOrEqual(100);
    for (const m of plan.meals) {
      if (m.type !== 'extra') {
        expect(m.diet.includes('veg')).toBe(true);
      }
    }
  });
  it('handles vegan diet', () => {
    const plan = optimizeDay(recipes, 150, 'vegan', 'gain', new Set(), 999);
    expect(plan.totals.cost).toBeLessThanOrEqual(150);
    for (const m of plan.meals) {
      const isVeganItem = m.diet && m.diet.includes('vegan');
      expect(isVeganItem).toBe(true);
    }
  });
});

describe('swapMeal', () => {
  it('swaps to a different meal of same type', () => {
    const plan = optimizeDay(recipes, 120, 'nonveg', 'highprotein', new Set(), 77);
    const meal = plan.meals.find(m => m.type !== 'extra') || plan.meals[0];
    const res = swapMeal(recipes, {
      mealId: meal.id,
      budget: 120,
      diet: 'nonveg',
      goal: 'highprotein',
      avoidIds: plan.meals.map(m => m.id),
    });
    expect(res.swap.id).not.toBe(meal.id);
    expect(res.swap.type).toBe(meal.type);
  });
});

describe('buildGrocery', () => {
  it('builds grocery from a week plan', () => {
    const d = optimizeDay(recipes, 120, 'nonveg', 'highprotein', new Set(), 1);
    const g = buildGrocery([{ meals: d.meals }], []);
    expect(g).toHaveProperty('categories');
    expect(typeof g.totalEst).toBe('number');
    expect(g.itemCount).toBeGreaterThanOrEqual(1);
  });
});
