import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store';

export default function Index() {
  const { session, isGuest, appRole, mustChangePassword } = useAuthStore();
  const hydrated = useAuthStore((s) => s._hydrated);

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#8B1A1A" />
      </View>
    );
  }

  if (!session && !isGuest) return <Redirect href="/(auth)/login" />;
  if (mustChangePassword) return <Redirect href="/change-password" />;
  if (appRole === 'admin' || appRole === 'super_admin') return <Redirect href="/(admin)/" />;
  if (isGuest) return <Redirect href="/(guest)/register" />;
  return <Redirect href="/(member)/" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});