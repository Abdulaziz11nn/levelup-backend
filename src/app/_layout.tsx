import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { GoalProvider } from '@/context/goal-context';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <GoalProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
    </GoalProvider>
  );
}
