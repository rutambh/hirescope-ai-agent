import React from 'react';
import { Tabs } from 'expo-router';
import { View, useColorScheme, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/appStore';
import { LightColors, DarkColors, Radius, Shadows } from '../../src/constants/theme';

type TabIconProps = { focused: boolean; name: any };

function TabBarIcon({ focused, name }: TabIconProps) {
  const { theme } = useAppStore();
  const systemColorScheme = useColorScheme();
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const c = isDark ? DarkColors : LightColors;

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        width: 48,
        height: 32,
        borderRadius: Radius.lg,
        backgroundColor: focused ? c.primaryLight : 'transparent',
      }}
    >
      <Ionicons
        name={focused ? (name.includes('outline') ? name.replace('-outline', '') : name) : name}
        size={22}
        color={focused ? c.primary : c.textMuted}
        style={{ opacity: focused ? 1 : 0.6 }}
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
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: {
          backgroundColor: c.tabBar,
          borderTopColor: c.tabBarBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 82 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
          ...(Platform.OS === 'ios' ? {} : Shadows.sm),
        },
        tabBarItemStyle: {
          height: 32,
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarIconStyle: {
          width: 48,
          height: 32,
          justifyContent: 'center',
          alignItems: 'center',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon focused={focused} name={focused ? 'search' : 'search-outline'} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon focused={focused} name={focused ? 'time' : 'time-outline'} />
          ),
        }}
      />
    </Tabs>
  );
}
