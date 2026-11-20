/**
 * Simple validation helpers (no external deps) to keep server robust.
 */
function isObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function validateMealPlanRequest(body) {
  const b = isObject(body) ? body : {};
  const errors = [];

  if (b.budget == null || b.budget === '') errors.push('budget is required');
  const budget = Number(b.budget);
  if (!Number.isFinite(budget)) errors.push('budget must be a number');
  else if (budget < 40 || budget > 500) errors.push('budget must be between ₹40 and ₹500 per day');

  const diet = b.diet ?? 'nonveg';
  if (!['veg', 'nonveg', 'vegan'].includes(diet)) errors.push("diet must be one of: veg, nonveg, vegan");

  const goal = b.goal ?? 'maintain';
  if (!['loss', 'gain', 'maintain', 'highprotein'].includes(goal)) errors.push("goal must be one of: loss, gain, maintain, highprotein");

  const days = b.days == null ? 7 : Number(b.days);
  if (!Number.isInteger(days) || days < 1 || days > 14) errors.push('days must be an integer between 1 and 14');

  if (b.excludeIds != null && !Array.isArray(b.excludeIds)) errors.push('excludeIds must be an array of numbers');
  if (b.pantry != null && !Array.isArray(b.pantry)) errors.push('pantry must be an array of strings');

  if (errors.length) {
    const err = new Error(errors.join('; '));
    err.statusCode = 400;
    err.details = errors;
    throw err;
  }

  return {
    budget,
    diet,
    goal,
    days,
    excludeIds: Array.isArray(b.excludeIds) ? b.excludeIds.map(Number).filter(Number.isInteger) : [],
    pantry: Array.isArray(b.pantry) ? b.pantry.map(x => String(x)).slice(0, 100) : [],
  };
}

function validateSwapRequest(body) {
  const b = isObject(body) ? body : {};
  const errors = [];

  if (b.mealId == null) errors.push('mealId is required');
  const mealId = Number(b.mealId);
  if (!Number.isInteger(mealId)) errors.push('mealId must be an integer');

  const budget = b.budget == null ? 120 : Number(b.budget);
  if (!Number.isFinite(budget) || budget < 40 || budget > 500) errors.push('budget must be between ₹40 and ₹500');

  const diet = b.diet ?? 'nonveg';
  if (!['veg', 'nonveg', 'vegan'].includes(diet)) errors.push("diet must be one of: veg, nonveg, vegan");

  const goal = b.goal ?? 'maintain';
  if (!['loss', 'gain', 'maintain', 'highprotein'].includes(goal)) errors.push("goal must be one of: loss, gain, maintain, highprotein");

  if (b.avoidIds != null && !Array.isArray(b.avoidIds)) errors.push('avoidIds must be an array');

  if (errors.length) {
    const err = new Error(errors.join('; '));
    err.statusCode = 400;
    err.details = errors;
    throw err;
  }

  return {
    mealId,
    budget,
    diet,
    goal,
    avoidIds: Array.isArray(b.avoidIds) ? b.avoidIds.map(Number).filter(Number.isInteger) : [],
  };
}

function validateGroceryRequest(body) {
  const b = isObject(body) ? body : {};
  if (!Array.isArray(b.week)) {
    const err = new Error('week must be an array');
    err.statusCode = 400;
    throw err;
  }
  return { week: b.week };
}

module.exports = { validateMealPlanRequest, validateSwapRequest, validateGroceryRequest };
