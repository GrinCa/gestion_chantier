import { describe, it, expect } from 'vitest';
import { AllowAllAccessPolicy, DenyAllAccessPolicy } from '../kernel/auth/AccessPolicy.js';

describe('AccessPolicy', () => {
  it('allow policy retourne true', () => {
    const p = new AllowAllAccessPolicy();
    expect(p.can()).toBe(true);
  });
  it('deny policy retourne false', () => {
    const p = new DenyAllAccessPolicy();
    expect(p.can()).toBe(false);
  });
});
