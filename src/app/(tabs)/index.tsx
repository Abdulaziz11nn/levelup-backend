import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import Avatar2D from '@/components/Avatar2D';
import { useGoal } from '@/context/goal-context';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { goal, isGoalLoaded, persistenceError } = useGoal();

  useEffect(() => {
    if (isGoalLoaded && goal) {
      router.replace('/explore');
    }
  }, [goal, isGoalLoaded]);

  if (!isGoalLoaded) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ActivityIndicator color="#00C896" />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>

        <View style={styles.hero}>
          <ThemedText style={styles.emoji}>⚡</ThemedText>
          <Avatar2D size={128} />
          <ThemedText style={styles.title}>LEVELUP</ThemedText>
          <ThemedText style={styles.subtitle}>YOUR AI LIFE CHALLENGE</ThemedText>
        </View>

        <View style={styles.badges}>
          <View style={styles.badge}>
            <ThemedText style={styles.badgeText}>🏃 SPORT</ThemedText>
          </View>
          <View style={styles.badge}>
            <ThemedText style={styles.badgeText}>🧠 MIND</ThemedText>
          </View>
          <View style={styles.badge}>
            <ThemedText style={styles.badgeText}>🥗 FOOD</ThemedText>
          </View>
        </View>

        <ThemedText style={styles.tagline}>
          Beat yesterday&apos;s version of yourself
        </ThemedText>

        {persistenceError ? (
          <ThemedText style={styles.persistenceError}>{persistenceError}</ThemedText>
        ) : null}

        <TouchableOpacity style={styles.button} onPress={() => router.push('/onboarding')}>
          <ThemedText style={styles.buttonText}>GET STARTED</ThemedText>
        </TouchableOpacity>

      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 24,
  },
  hero: {
    alignItems: 'center',
    gap: 10,
  },
  emoji: {
    fontSize: 56,
  },
  title: {
    fontSize: 52,
    fontWeight: 'bold',
    letterSpacing: 6,
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 11,
    letterSpacing: 4,
    color: '#00C896',
    textAlign: 'center',
  },
  badges: {
    flexDirection: 'row',
    gap: 12,
  },
  badge: {
    backgroundColor: '#111130',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#00C896',
  },
  badgeText: {
    color: '#00C896',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tagline: {
    fontSize: 13,
    color: '#888',
    letterSpacing: 1,
    textAlign: 'center',
  },
  persistenceError: {
    color: '#FF8A8A',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#00C896',
    paddingHorizontal: 52,
    paddingVertical: 18,
    borderRadius: 32,
    marginTop: 8,
  },
  buttonText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 2,
  },
});