import React from 'react';
import { Tabs } from 'expo-router';
import { View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../src/store/appStore';
import { useTheme } from '../../src/constants/theme';

function TabIcon({ focused, name }: { focused: boolean; name: 'search-outline' | 'time-outline' | 'settings-outline' }) {
  const { isDark, c } = useTheme();
  const filledName = name === 'search-outline' ? 'search' : name === 'time-outline' ? 'time' : 'settings';

  return (
    <View style={{
      width: 56, height: 38, borderRadius: 19,
      backgroundColor: focused ? c.primaryLight : 'transparent',
      alignItems: 'center', justifyContent: 'center',
      borderWidth: focused ? 1 : 0,
      borderColor: c.primary + '40',
    }}>
      <Ionicons
        name={focused ? filledName : name}
        size={focused ? 22 : 21}
        color={focused ? c.primary : c.textMuted}
      />
    </View>
  );
}

export default function TabLayout() {
  const { c } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: c.tabBar,
          borderTopColor: c.tabBarBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 66,
          paddingBottom: Platform.OS === 'ios' ? 26 : 10,
          paddingTop: 10,
        },
        tabBarItemStyle: {
          height: 52,
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
      <Tabs.Screen
        name="settings"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="settings-outline" /> }}
      />
    </Tabs>
  );
}
