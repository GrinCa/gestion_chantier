/**
 * HOME SCREEN - Mobile
 * ====================
 * Écran d'accueil de l'application mobile
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏠 Gestion Chantier Mobile</Text>
      <Text style={styles.subtitle}>Architecture Universelle</Text>
      
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>✅ Core Package</Text>
        <Text style={styles.infoText}>
          Logique métier partagée entre Web et Mobile
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>📐 Calculatrice</Text>
        <Text style={styles.infoText}>
          Interface mobile utilisant les mêmes calculs que le Web
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>💾 DataEngine</Text>
        <Text style={styles.infoText}>
          Synchronisation offline/online avec le serveur
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
  infoCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
});