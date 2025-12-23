module.exports = {
  expo: {
    name: 'Market Signal',
    slug: 'market-signal-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'marketsignal',
    userInterfaceStyle: 'dark',
    newArchEnabled: true,
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#0B0D11'
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.marketsignal.mobile',
      infoPlist: {
        UIBackgroundModes: ['remote-notification'],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#0B0D11'
      },
      package: 'com.marketsignal.mobile'
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png'
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      [
        'expo-notifications',
        {
          icon: './assets/images/icon.png',
          color: '#3B82F6',
          defaultChannel: 'default',
        },
      ],
    ],
    notification: {
      icon: './assets/images/icon.png',
      color: '#3B82F6',
      androidMode: 'default',
      androidCollapsedTitle: 'Market Signal',
    },
    experiments: {
      typedRoutes: true
    },
    extra: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      // ❌ NEVER add SERVICE_ROLE key here - not safe for mobile apps
      eas: {
        projectId: 'your-project-id' // Update this when setting up EAS
      }
    }
  }
}

