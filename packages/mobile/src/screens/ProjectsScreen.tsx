/**
 * PROJECTS SCREEN - Mobile
 * ========================
 * Écran de gestion des projets
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ProjectsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>📁 Projets</Text>
      <Text style={styles.subtitle}>Gestion des projets de chantier</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🚧 En cours de développement</Text>
        <Text style={styles.cardText}>
          Interface pour créer et gérer les projets via le DataEngine
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
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: '#4b5563',
  },
});