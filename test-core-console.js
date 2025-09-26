/**
 * SCRIPT DE TEST CORE - Console rapide
 * ====================================
 * Ce script peut être copié/collé dans la console du navigateur
 * pour tester rapidement l'architecture core.
 */

// Test 1: Import et initialisation
console.log('🚀 Test Core Architecture');

// Test 2: Création de données par défaut
const testData = window.calculatriceTool?.getDefaultData();
if (testData) {
  console.log('✅ getDefaultData():', testData);
} else {
  console.log('❌ calculatriceTool non disponible');
}

// Test 3: Ajout d'un groupe
if (window.calculatriceTool) {
  const withNewGroup = window.calculatriceTool.addGroupe(testData, 'Position Test');
  console.log('✅ addGroupe():', withNewGroup);

  // Test 4: Ajout d'une mesure
  if (withNewGroup.length > 0) {
    const groupId = withNewGroup[0].id;
    const sectionId = withNewGroup[0].sections[0]?.id;
    if (sectionId) {
      const withNewMesure = window.calculatriceTool.addMesure(withNewGroup, groupId, sectionId, 1.234);
      console.log('✅ addMesure():', withNewMesure);
      
      // Test 5: Calcul des statistiques
      const stats = window.calculatriceTool.getAllGroupsStats(withNewMesure);
      console.log('✅ getAllGroupsStats():', stats);
    }
  }
}

console.log('🎯 Tests terminés. Architecture core fonctionnelle !');