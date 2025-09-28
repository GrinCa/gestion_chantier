/**
 * SETTINGS SCREEN - Mobile
 * ========================
 * Écran de paramètres
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚙️ Paramètres</Text>
      <Text style={styles.subtitle}>Configuration de l'application</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🌐 Configuration API</Text>
        <Text style={styles.cardText}>
          URL: http://localhost:3001
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>💾 Stockage</Text>
        <Text style={styles.cardText}>
          AsyncStorage + DataEngine
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: '#4b5563',
  },
});