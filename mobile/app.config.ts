import { ConfigContext, ExpoConfig } from 'expo/config';

const IS_PROD = process.env.APP_ENV === 'production';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_PROD ? 'Toastmaster PSE' : 'Toastmaster PSE (Dev)',
  slug: 'toastmasters-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: IS_PROD ? 'com.toastmasters.app' : 'com.toastmasters.app.dev',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#ffffff',
    },
    package: IS_PROD ? 'com.toastmasters.app' : 'com.toastmasters.app.dev',
  },
  scheme: 'toastmasters',
  plugins: [
    'expo-router',
    'expo-secure-store',
    '@react-native-community/datetimepicker',
    [
      'expo-camera',
      {
        cameraPermission: 'Allow $(PRODUCT_NAME) to access your camera to scan meeting QR codes.',
      },
    ],
  ],
  extra: {
    appEnv: process.env.APP_ENV ?? 'development',
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  },
});
