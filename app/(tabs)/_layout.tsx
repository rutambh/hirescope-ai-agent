import React from 'react';
import { Tabs } from 'expo-router';
import { View, useColorScheme, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/appStore';
import { LightColors, DarkColors, Radius } from '../../src/constants/theme';

function TabIcon({ focused, name }: { focused: boolean; name: 'search-outline' | 'time-outline' }) {
  const { theme } = useAppStore();
  const systemColorScheme = useColorScheme();
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const c = isDark ? DarkColors : LightColors;

  const filledName = name === 'search-outline' ? 'search' : 'time';

  return (
    <View style={{
      width: 44, height: 32, borderRadius: Radius.lg,
      backgroundColor: focused ? c.primaryLight : 'transparent',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Ionicons
        name={focused ? filledName : name}
        size={21}
        color={focused ? c.primary : c.textMuted}
      />
    </View>
  );
}

export default function TabLayout() {
  const { theme } = useAppStore();
  const systemColorScheme = useColorScheme();
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const c = isDark ? DarkColors : LightColors;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: c.tabBar,
          borderTopColor: c.tabBarBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 82 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="search-outline" /> }}
      />
      <Tabs.Screen
        name="history"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="time-outline" /> }}
      />
    </Tabs>
  );
}
