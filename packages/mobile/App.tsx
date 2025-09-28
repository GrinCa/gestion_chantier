/**
 * GESTION CHANTIER MOBILE - App principale
 * ========================================
 * Application React Native + Expo utilisant la logique métier du core
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Providers
import { MobileDataEngineProvider } from './src/hooks/useMobileDataEngine';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import CalculatriceScreen from './src/screens/CalculatriceScreen';
import ProjectsScreen from './src/screens/ProjectsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Navigation
const Tab = createBottomTabNavigator();

// Theme Material Design
const theme = {
  colors: {
    primary: '#2563eb',
    secondary: '#64748b',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#1e293b',
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <MobileDataEngineProvider apiUrl="http://localhost:3001">
          <NavigationContainer>
            <Tab.Navigator
              screenOptions={({ route }: any) => ({
                tabBarIcon: ({ focused, color, size }: any) => {
                  let iconName: keyof typeof Ionicons.glyphMap;

                  if (route.name === 'Accueil') {
                    iconName = focused ? 'home' : 'home-outline';
                  } else if (route.name === 'Calculatrice') {
                    iconName = focused ? 'calculator' : 'calculator-outline';
                  } else if (route.name === 'Projets') {
                    iconName = focused ? 'folder' : 'folder-outline';
                  } else if (route.name === 'Paramètres') {
                    iconName = focused ? 'settings' : 'settings-outline';
                  } else {
                    iconName = 'help-outline';
                  }

                  return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.secondary,
                headerStyle: {
                  backgroundColor: theme.colors.primary,
                },
                headerTintColor: '#ffffff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              })}
            >
              <Tab.Screen 
                name="Accueil" 
                component={HomeScreen} 
                options={{
                  title: '🏠 Gestion Chantier',
                }}
              />
              <Tab.Screen 
                name="Calculatrice" 
                component={CalculatriceScreen} 
                options={{
                  title: '📐 Calculatrice',
                }}
              />
              <Tab.Screen 
                name="Projets" 
                component={ProjectsScreen} 
                options={{
                  title: '📁 Projets',
                }}
              />
              <Tab.Screen 
                name="Paramètres" 
                component={SettingsScreen} 
                options={{
                  title: '⚙️ Paramètres',
                }}
              />
            </Tab.Navigator>
          </NavigationContainer>
          <StatusBar style="light" />
        </MobileDataEngineProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}