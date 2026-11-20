import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';

describe('API /api/targets', () => {
  it('returns targets', async () => {
    const res = await request(app).get('/api/targets');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('highprotein');
  });
});

describe('API /api/mealplan', () => {
  it('rejects invalid budget', async () => {
    const res = await request(app).post('/api/mealplan').send({ budget: 5, diet: 'veg', goal: 'maintain' });
    expect(res.status).toBe(400);
  });
  it('generates a plan for valid input', async () => {
    const res = await request(app).post('/api/mealplan').send({ budget: 120, diet: 'nonveg', goal: 'highprotein', days: 1 });
    expect(res.status).toBe(200);
    expect(res.body.week).toHaveLength(1);
    expect(res.body.week[0].totals.cost).toBeLessThanOrEqual(120);
  });
});

describe('API /api/swap', () => {
  it('returns 400 for bad body', async () => {
    const res = await request(app).post('/api/swap').send({});
    expect(res.status).toBe(400);
  });
});
