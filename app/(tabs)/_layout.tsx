import React from 'react';
import { Tabs } from 'expo-router';
import { View, useColorScheme, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/appStore';
import { LightColors, DarkColors } from '../../src/constants/theme';

type TabIconProps = { focused: boolean; name: any; };

function TabBarIcon({ focused, name }: TabIconProps) {
  const { theme } = useAppStore();
  const systemColorScheme = useColorScheme();
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const c = isDark ? DarkColors : LightColors;

  return (
    <View style={{
      alignItems: 'center',
      justifyContent: 'center',
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: focused ? c.primaryLight : 'transparent',
    }}>
      <Ionicons name={name} size={22} color={focused ? c.primary : c.textMuted} />
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
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          borderTopWidth: 1,
          height: 64,
        },
        tabBarItemStyle: {
          height: 64,
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarIconStyle: {
          width: 44,
          height: 44,
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: Platform.OS === 'ios' ? 0 : 4, // adjust Android vertical centering
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabBarIcon focused={focused} name={focused ? "search" : "search-outline"} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarIcon: ({ focused }) => <TabBarIcon focused={focused} name={focused ? "briefcase" : "briefcase-outline"} />,
        }}
      />
    </Tabs>
  );
}
