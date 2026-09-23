import React from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { LoginScreen } from '../screens/LoginScreen';
import { ScannerScreen } from '../screens/ScannerScreen';
import { ReviewCropScreen } from '../screens/ReviewCropScreen';
import { DocumentMetaScreen } from '../screens/DocumentMetaScreen';
import { UploadProgressScreen } from '../screens/UploadProgressScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { Colors, BorderRadius, Typography } from '../constants/theme';
import { useApp } from '../context/AppContext';

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  ReviewCrop: undefined;
  DocumentMeta: undefined;
  UploadProgress: {
    title: string;
    docType: string;
    phoneNumber: string;
  };
};

export type MainTabParamList = {
  ScannerTab: undefined;
  HistoryTab: undefined;
  SettingsTab: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primaryLight,
        tabBarInactiveTintColor: Colors.textMutedDark,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="ScannerTab"
        component={ScannerScreen}
        options={{
          tabBarLabel: 'Escanear',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.scannerIconWrapper, focused && styles.scannerIconFocused]}>
              <Ionicons
                name={focused ? 'scan' : 'scan-outline'}
                size={24}
                color={focused ? Colors.white : color}
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={HistoryScreen}
        options={{
          tabBarLabel: 'Historial',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'folder' : 'folder-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Ajustes',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'settings' : 'settings-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { isAuthenticated, isLoading } = useApp();

  if (isLoading) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isAuthenticated ? 'MainTabs' : 'Login'}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.bgDark },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen
          name="ReviewCrop"
          component={ReviewCropScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="DocumentMeta" component={DocumentMetaScreen} />
        <Stack.Screen
          name="UploadProgress"
          component={UploadProgressScreen}
          options={{ gestureEnabled: false, animation: 'fade' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.bgCardDark,
    borderTopColor: Colors.borderDark,
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  scannerIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerIconFocused: {
    backgroundColor: Colors.primary,
  },
});
