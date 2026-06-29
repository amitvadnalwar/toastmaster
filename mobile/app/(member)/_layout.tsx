import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '@/store';

export default function MemberLayout() {
  const { session, isGuest } = useAuthStore();

  if (!session || isGuest) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#8B1A1A',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#f3f4f6',
          height: 64,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="meetings"
        options={{
          title: 'Meetings',
          tabBarIcon: ({ color, size }) => <Feather name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="members"
        options={{
          title: 'Members',
          tabBarIcon: ({ color, size }) => <Feather name="users" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
        }}
      />
      {/* Meeting detail — full screen, no tab bar */}
      <Tabs.Screen
        name="meeting/[id]"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      {/* Apply for role — full screen, no tab bar */}
      <Tabs.Screen
        name="apply-role/[id]"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      {/* QR scan — full screen, no tab bar */}
      <Tabs.Screen
        name="scan"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      {/* Speaker feedback — full screen, no tab bar */}
      <Tabs.Screen
        name="meeting/feedback/[id]"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      {/* Hide legacy dashboard route from tabs */}
      <Tabs.Screen name="dashboard" options={{ href: null }} />
    </Tabs>
  );
}
