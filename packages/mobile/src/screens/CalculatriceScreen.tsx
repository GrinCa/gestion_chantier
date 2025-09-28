/**
 * CALCULATRICE SCREEN - Mobile
 * ============================
 * Interface mobile pour la calculatrice utilisant la logique métier du core
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Card, Title, Button, Divider, ActivityIndicator } from 'react-native-paper';

// Import de la logique métier du core !
import { calculatriceTool, LABELS_PREDEFINIS, type GroupeMesures } from '@gestion-chantier/core';

// Hooks mobiles
import { useMobileCalculatrice } from '../hooks/useMobileDataEngine';

interface CalculatriceScreenProps {
  route?: { params?: { projectId?: string } };
}

export default function CalculatriceScreen({ route }: CalculatriceScreenProps) {
  const projectId = route?.params?.projectId;
  
  // State utilisant la logique métier du core
  const [groups, setGroups] = useState<GroupeMesures[]>(() => 
    calculatriceTool.getDefaultData()
  );
  const [loading, setLoading] = useState(false);

  // Hook pour sauvegarder dans le DataEngine
  const { saveCalculatriceData } = useMobileCalculatrice(projectId);

  // Calcul des statistiques via le core
  const allStats = calculatriceTool.getAllGroupsStats(groups);

  // Actions utilisant la logique métier du core
  const handleAddGroupe = () => {
    const updated = calculatriceTool.addGroupe(groups, `Position ${groups.length + 1}`);
    setGroups(updated);
  };

  const handleAddMesure = (groupId: string, sectionId: string) => {
    const updated = calculatriceTool.addMesure(groups, groupId, sectionId, 0);
    setGroups(updated);
  };

  const handleUpdateMesure = (groupId: string, mesureId: string, value: number) => {
    const updated = calculatriceTool.updateMesure(groups, groupId, mesureId, { raw: value });
    setGroups(updated);
  };

  const handleSave = async () => {
    if (!projectId) {
      Alert.alert('Erreur', 'Aucun projet sélectionné');
      return;
    }

    try {
      setLoading(true);
      await saveCalculatriceData(groups);
      Alert.alert('Succès', 'Données sauvegardées !');
    } catch (error) {
      Alert.alert('Erreur', 'Échec de la sauvegarde');
      console.error('Save error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header avec boutons d'action */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <Title>📐 Calculatrice Mobile</Title>
          <Text style={styles.subtitle}>Utilise la logique métier du core</Text>
          
          <View style={styles.buttonRow}>
            <Button 
              mode="contained" 
              onPress={handleAddGroupe}
              style={styles.button}
              icon="plus"
            >
              + Position
            </Button>
            
            {projectId && (
              <Button 
                mode="outlined" 
                onPress={handleSave}
                style={styles.button}
                loading={loading}
                icon="content-save"
              >
                Sauver
              </Button>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* Statistiques globales */}
      <Card style={styles.statsCard}>
        <Card.Content>
          <Title>📊 Statistiques</Title>
          <Divider style={styles.divider} />
          
          {allStats.map(stat => (
            <View key={stat.groupId} style={styles.statRow}>
              <Text style={styles.statLabel}>{stat.groupLabel}</Text>
              {stat.hasValidMesures ? (
                <View style={styles.statValues}>
                  <Text style={styles.statValue}>
                    Moy: {stat.calculation.moyenne.toFixed(3)}
                  </Text>
                  <Text style={styles.statCount}>
                    ({stat.calculation.count} mes.)
                  </Text>
                  {stat.reference.globalValue !== null && (
                    <Text style={styles.statGlobal}>
                      Global: {stat.reference.globalValue.toFixed(3)}
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={styles.noData}>Aucune mesure</Text>
              )}
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Groupes de mesures */}
      {groups.map((group, groupIndex) => (
        <Card key={group.id} style={styles.groupCard}>
          <Card.Content>
            <Title style={styles.groupTitle}>{group.label}</Title>
            
            {group.sections.map(section => (
              <View key={section.id} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{section.label}</Text>
                  <Button
                    mode="text"
                    onPress={() => handleAddMesure(group.id, section.id)}
                    compact
                    icon="plus"
                  >
                    Mesure
                  </Button>
                </View>
                
                {section.mesures.map(mesure => (
                  <View key={mesure.id} style={styles.mesureRow}>
                    <TextInput
                      style={styles.mesureInput}
                      value={mesure.raw.toString()}
                      onChangeText={(text: string) => {
                        const value = parseFloat(text) || 0;
                        handleUpdateMesure(group.id, mesure.id, value);
                      }}
                      keyboardType="numeric"
                      placeholder="0.000"
                    />
                    <Text style={styles.mesureLabel}>
                      {mesure.label || 'Sans label'}
                    </Text>
                    <Text style={styles.mesureId}>
                      ID: {mesure.id.slice(-4)}
                    </Text>
                  </View>
                ))}
              </View>
            ))}

            {groupIndex > 0 && (
              <Text style={styles.offsetInfo}>
                Offset: {group.storedRelOffset?.toFixed(3) || 'N/A'}
              </Text>
            )}
          </Card.Content>
        </Card>
      ))}

      {/* Debug info */}
      <Card style={styles.debugCard}>
        <Card.Content>
          <Text style={styles.debugTitle}>🔧 Debug Info</Text>
          <Text style={styles.debugText}>
            Groupes: {groups.length} | Stats: {allStats.length}
          </Text>
          <Text style={styles.debugText}>
            Labels disponibles: {Object.keys(LABELS_PREDEFINIS).length}
          </Text>
          <Text style={styles.debugText}>
            Architecture universelle: ✅ Core + Mobile
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  headerCard: {
    marginBottom: 16,
    elevation: 2,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 14,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
  },
  statsCard: {
    marginBottom: 16,
    elevation: 2,
    backgroundColor: '#f0f9ff',
  },
  divider: {
    marginVertical: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statLabel: {
    fontWeight: 'bold',
    flex: 1,
  },
  statValues: {
    alignItems: 'flex-end',
  },
  statValue: {
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#059669',
  },
  statCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  statGlobal: {
    fontFamily: 'monospace',
    color: '#dc2626',
    fontWeight: 'bold',
  },
  noData: {
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  groupCard: {
    marginBottom: 16,
    elevation: 2,
  },
  groupTitle: {
    fontSize: 18,
    color: '#1e40af',
    marginBottom: 12,
  },
  section: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  mesureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  mesureInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    padding: 8,
    width: 80,
    textAlign: 'center',
    fontFamily: 'monospace',
    backgroundColor: '#ffffff',
  },
  mesureLabel: {
    flex: 1,
    fontSize: 14,
  },
  mesureId: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  offsetInfo: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'right',
  },
  debugCard: {
    marginBottom: 16,
    elevation: 1,
    backgroundColor: '#f3f4f6',
  },
  debugTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  debugText: {
    fontSize: 12,
    color: '#4b5563',
    fontFamily: 'monospace',
  },
});