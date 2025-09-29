/**
 * fts-advanced-selftest.ts
 * ---------------------------------------------------------------------------
 * Suite de tests complète pour les fonctionnalités FTS avancées :
 * - Opérateurs OR, AND explicites  
 * - Recherche de phrases avec guillemets
 * - Système de highlight avec positions
 * - Test de performance et cas limites
 */
import { createInMemoryIndexer } from '../kernel/indexer/Indexer.js';
import { QueryParser } from '../kernel/indexer/QueryParser.js';
import type { Resource } from '../kernel/domain/Resource.js';

interface TestResource extends Resource {
  id: string;
  type: string;
  workspaceId: string;
  createdAt: number;
  updatedAt: number;
  version: number;
  schemaVersion: number;
  payload: any;
  metadata?: any;
}

async function main() {
  console.log('🔍 Démarrage des tests FTS avancés...');
  
  // Setup des données de test
  const testResources: TestResource[] = [
    {
      id: 'r1', type: 'note', workspaceId: 'w1', 
      createdAt: Date.now(), updatedAt: Date.now(), version: 1, schemaVersion: 1,
      payload: { text: 'mur isolant thermique construction' }
    },
    {
      id: 'r2', type: 'note', workspaceId: 'w1',
      createdAt: Date.now(), updatedAt: Date.now(), version: 1, schemaVersion: 1,
      payload: { text: 'isolation phonique mur intérieur' }
    },
    {
      id: 'r3', type: 'task', workspaceId: 'w1',
      createdAt: Date.now(), updatedAt: Date.now(), version: 1, schemaVersion: 1,
      payload: { title: 'Poser isolation', description: 'isolant laine de roche' }
    },
    {
      id: 'r4', type: 'note', workspaceId: 'w1',
      createdAt: Date.now(), updatedAt: Date.now(), version: 1, schemaVersion: 1,
      payload: { text: 'chantier avancement "isolation thermique" terminée' }
    },
    {
      id: 'r5', type: 'note', workspaceId: 'w1',
      createdAt: Date.now(), updatedAt: Date.now(), version: 1, schemaVersion: 1,
      payload: { text: 'matériaux livraison plancher béton' }
    }
  ];

  const resourceMap = new Map(testResources.map(r => [r.id, r]));
  const resourceGetter = async (id: string) => resourceMap.get(id) || null;
  
  const indexer = createInMemoryIndexer(resourceGetter);
  
  // Indexer toutes les resources (avec la nouvelle normalisation)
  for (const resource of testResources) {
    await indexer.index(resource);
  }
  
  console.log(`📊 ${indexer.size()} resources indexées`);
  
  // Test 1: Recherche basique (legacy)
  await testBasicSearch(indexer);
  
  // Test 2: Opérateur OR
  await testOrOperator(indexer, testResources);
  
  // Test 3: Recherche de phrases
  await testPhraseSearch(indexer);
  
  // Test 4: Combinaisons complexes
  await testComplexQueries(indexer);
  
  // Test 5: Highlight
  await testHighlight(indexer);
  
  // Test 6: Parser direct
  await testQueryParser();
  
  // Test 7: Cas limites
  await testEdgeCases(indexer);
  
  console.log('✅ Tous les tests FTS avancés sont passés!');
}

async function testBasicSearch(indexer: any) {
  console.log('\n📝 Test 1: Recherche basique (AND implicite)');
  
  const results1 = await indexer.search('w1', 'mur isolant');
  if (results1.length !== 1 || results1[0].id !== 'r1') {
    throw new Error(`Expected r1 for "mur isolant", got: ${results1.map((r: any) => r.id)}`);
  }
  
  const results2 = await indexer.search('w1', 'isolation');
  if (results2.length !== 3) { // r2, r3, r4 contiennent isolation/isolant
    throw new Error(`Expected 3 results for "isolation", got: ${results2.length}`);
  }
  
  console.log('✓ Recherche basique OK');
}

async function testOrOperator(indexer: any, testResources: TestResource[]) {
  console.log('\n📝 Test 2: Opérateur OR');
  
  // Debug : vérifier toutes les resources
  console.log('Debug: Toutes les resources:');
  for (const r of testResources) {
    console.log(`${r.id}: ${JSON.stringify(r.payload)}`);
  }
  
  // Test simple d'abord : béton seul
  const resultsBeton = await indexer.searchAdvanced('w1', 'béton');
  console.log(`Debug: "béton" seul returned ${resultsBeton.resources.length} results:`, resultsBeton.resources.map((r: any) => r.id));
  
  // Test avec normalisation manuelle
  const resultsBeton2 = await indexer.searchAdvanced('w1', 'beton');
  console.log(`Debug: "beton" (sans accent) returned ${resultsBeton2.resources.length} results:`, resultsBeton2.resources.map((r: any) => r.id));
  
  const results1 = await indexer.searchAdvanced('w1', 'béton OR thermique');
  console.log(`Debug: "béton OR thermique" returned ${results1.resources.length} results:`, results1.resources.map((r: any) => `${r.id}: ${JSON.stringify(r.payload)}`));
  if (results1.resources.length !== 3) { // r1 (thermique), r4 (thermique), r5 (béton)
    throw new Error(`Expected 3 results for "béton OR thermique", got: ${results1.resources.length}`);
  }
  
  const foundIds = results1.resources.map((r: any) => r.id).sort();
  const expectedIds = ['r1', 'r4', 'r5'].sort();
  if (JSON.stringify(foundIds) !== JSON.stringify(expectedIds)) {
    throw new Error(`Expected [r1,r4,r5] for OR query, got: ${foundIds}`);
  }
  
  // Test OR avec AND
  const results2 = await indexer.searchAdvanced('w1', 'mur AND (thermique OR phonique)');
  if (results2.resources.length !== 2) { // r1 (mur + thermique), r2 (mur + phonique)
    throw new Error(`Expected 2 results for complex AND/OR, got: ${results2.resources.length}`);
  }
  
  console.log('✓ Opérateur OR OK');
}

async function testPhraseSearch(indexer: any) {
  console.log('\n📝 Test 3: Recherche de phrases');
  
  const results1 = await indexer.searchAdvanced('w1', '"isolation thermique"');
  if (results1.resources.length !== 1 || results1.resources[0].id !== 'r4') {
    throw new Error(`Expected r4 for phrase "isolation thermique", got: ${results1.resources.map((r: any) => r.id)}`);
  }
  
  // Phrase qui n'existe pas exactement
  const results2 = await indexer.searchAdvanced('w1', '"thermique isolation"');
  if (results2.resources.length !== 0) {
    throw new Error(`Expected 0 results for reversed phrase, got: ${results2.resources.length}`);
  }
  
  // Phrase partielle
  const results3 = await indexer.searchAdvanced('w1', '"laine de"');
  if (results3.resources.length !== 1 || results3.resources[0].id !== 'r3') {
    throw new Error(`Expected r3 for "laine de", got: ${results3.resources.map((r: any) => r.id)}`);
  }
  
  console.log('✓ Recherche de phrases OK');
}

async function testComplexQueries(indexer: any) {
  console.log('\n📝 Test 4: Requêtes complexes');
  
  // Combinaisons parenthèses
  const results1 = await indexer.searchAdvanced('w1', '(mur OR plancher) AND (isolation OR béton)');
  // r1 contient "isolant" (pas "isolation") et pas "béton" -> ne doit pas matcher le second groupe.
  // Résultats attendus : r2 (mur + isolation) et r5 (plancher + béton).
  if (results1.resources.length !== 2) {
    console.log('Debug complex parentheses ids=', results1.resources.map((r:any)=>r.id));
    throw new Error(`Expected 2 results for complex parentheses query, got: ${results1.resources.length}`);
  }
  
  // Mélange phrases et termes
  const results2 = await indexer.searchAdvanced('w1', '"isolation thermique" OR matériaux');
  if (results2.resources.length !== 2) { // r4 (phrase), r5 (matériaux)
    throw new Error(`Expected 2 results for phrase OR term, got: ${results2.resources.length}`);
  }
  
  console.log('✓ Requêtes complexes OK');
}

async function testHighlight(indexer: any) {
  console.log('\n📝 Test 5: Système de highlight');
  
  const results = await indexer.searchAdvanced('w1', 'isolation thermique', { enableHighlight: true });
  
  if (!results.highlights) {
    throw new Error('Expected highlights to be present');
  }
  
  // Vérifier qu'on a des highlights pour au moins une resource
  const resourcesWithHighlights = Object.keys(results.highlights);
  if (resourcesWithHighlights.length === 0) {
    throw new Error('Expected at least one resource with highlights');
  }
  
  // Vérifier la structure des highlights
  const firstResourceHighlights = results.highlights[resourcesWithHighlights[0]];
  if (!Array.isArray(firstResourceHighlights)) {
    throw new Error('Expected highlights to be an array');
  }
  
  const firstHighlight = firstResourceHighlights[0];
  if (!firstHighlight || typeof firstHighlight.start !== 'number' || typeof firstHighlight.end !== 'number') {
    throw new Error('Expected highlight to have start and end positions');
  }
  
  console.log('✓ Système de highlight OK');
}

async function testQueryParser() {
  console.log('\n📝 Test 6: Parser de requêtes direct');
  
  const parser = new QueryParser();
  
  // Test parsing phrase
  const query1 = parser.parse('"hello world"');
  if (query1.nodes.length !== 1 || query1.nodes[0].type !== 'phrase') {
    throw new Error('Expected single phrase node');
  }
  
  // Test parsing OR
  const query2 = parser.parse('term1 OR term2');
  if (query2.nodes.length !== 3) { // term1, OR, term2
    throw new Error('Expected 3 nodes for OR query');
  }
  
  // Test parsing parenthèses
  const query3 = parser.parse('(term1 OR term2) AND term3');
  if (query3.nodes.length !== 3) { // group, AND, term3
    throw new Error('Expected 3 nodes for parentheses query');
  }
  
  console.log('✓ Parser de requêtes OK');
}

async function testEdgeCases(indexer: any) {
  console.log('\n📝 Test 7: Cas limites');
  
  // Requête vide
  const results1 = await indexer.searchAdvanced('w1', '');
  if (results1.resources.length !== 0) {
    throw new Error('Expected 0 results for empty query');
  }
  
  // Requête avec caractères spéciaux
  const results2 = await indexer.searchAdvanced('w1', 'mur!@#$%^&*()');
  // Devrait rechercher "mur" et ignorer les caractères spéciaux
  if (results2.resources.length < 1) {
    throw new Error('Expected at least 1 result for query with special chars');
  }
  
  // Requête très longue
  const longQuery = 'mur '.repeat(100);
  const results3 = await indexer.searchAdvanced('w1', longQuery);
  if (results3.resources.length < 1) {
    throw new Error('Expected results for long query');
  }
  
  // Workspace inexistant
  const results4 = await indexer.searchAdvanced('nonexistent', 'mur');
  if (results4.resources.length !== 0) {
    throw new Error('Expected 0 results for nonexistent workspace');
  }
  
  console.log('✓ Cas limites OK');
}

main().catch(e => {
  console.error('❌ Test échoué:', e.message);
  throw e;
});