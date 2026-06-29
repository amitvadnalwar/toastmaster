import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StayConnectedScreen() {
  function openUrl(url: string) {
    Linking.openURL(url).catch(() => null);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.title}>Thank you for voting!</Text>
        <Text style={styles.subtitle}>
          Stay connected with our Toastmasters club on social media.
        </Text>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.socialBtn, { backgroundColor: '#E1306C' }]}
            onPress={() => openUrl('https://instagram.com')}
          >
            <Text style={styles.socialBtnText}>Instagram</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialBtn, { backgroundColor: '#0A66C2' }]}
            onPress={() => openUrl('https://linkedin.com')}
          >
            <Text style={styles.socialBtnText}>LinkedIn</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialBtn, { backgroundColor: '#25D366' }]}
            onPress={() => openUrl('https://wa.me')}
          >
            <Text style={styles.socialBtnText}>WhatsApp Group</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emoji: { fontSize: 64, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 12 },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
  },
  buttons: { width: '100%', gap: 12 },
  socialBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  socialBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});