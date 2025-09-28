// Test import du core
import { calculatriceTool } from '@gestion-chantier/core';

export function TestCore() {
  const tool = calculatriceTool;
  return <div>Core loaded: {tool ? 'OK' : 'FAIL'}</div>;
}