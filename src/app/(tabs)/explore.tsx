import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import Avatar2D, { type Avatar2DHandle } from '@/components/Avatar2D';
import { useGoal } from '@/context/goal-context';
import { API_URL } from '@/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Challenge = {
  id: number;
  category: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  xp: number;
  done: boolean;
};

const difficultyColor: Record<string, string> = {
  Easy: '#00C896',
  Medium: '#FFA500',
  Hard: '#FF4444',
};
const COMPLETED_COUNT_STORAGE_KEY = '@levelup/completed-challenge-count';

function isChallenge(value: unknown): value is Challenge {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const challenge = value as Record<string, unknown>;
  return (
    typeof challenge.id === 'number' &&
    typeof challenge.category === 'string' &&
    typeof challenge.title === 'string' &&
    typeof challenge.description === 'string' &&
    ['Easy', 'Medium', 'Hard'].includes(String(challenge.difficulty)) &&
    typeof challenge.xp === 'number' &&
    typeof challenge.done === 'boolean'
  );
}

async function generateChallenges(goal: object): Promise<Challenge[]> {
  const response = await fetch(`${API_URL}/api/challenges`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ goal }),
  });

  if (!response.ok) {
    throw new Error(`Challenge request failed with status ${response.status}.`);
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data) || !data.every(isChallenge)) {
    throw new Error('The challenge response has an invalid format.');
  }
  return data;
}

export default function ChallengesScreen() {
  const { goal, isGoalLoaded, persistenceError } = useGoal();
  const avatarRef = useRef<Avatar2DHandle>(null);
  const completedChallengeIds = useRef(new Set<number>());
  const completedCountRef = useRef(0);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const challengeStorageKey = goal
    ? `@levelup/challenges/${encodeURIComponent(JSON.stringify(goal))}`
    : null;
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  const earnedXp = challenges.reduce(
    (total, challenge) => total + (challenge.done ? challenge.xp : 0),
    0,
  );

  useEffect(() => {
    let isActive = true;

    if (!isGoalLoaded) {
      return () => {
        isActive = false;
      };
    }

    if (!goal) {
      router.replace('/onboarding');
      return () => {
        isActive = false;
      };
    }
    const selectedGoal = goal;

    async function loadChallenges() {
      try {
        if (persistenceError) {
          throw new Error(persistenceError);
        }

        const [cached, storedCompletedCount] = await Promise.all([
          AsyncStorage.getItem(challengeStorageKey!),
          AsyncStorage.getItem(COMPLETED_COUNT_STORAGE_KEY),
        ]);
        let data: Challenge[];
        if (cached !== null) {
          const parsed: unknown = JSON.parse(cached);
          if (!Array.isArray(parsed) || !parsed.every(isChallenge)) {
            throw new Error('Saved challenges have an invalid format.');
          }
          data = parsed;
        } else {
          data = await generateChallenges(selectedGoal);
          if (isActive) {
            setChallenges(data);
          }
          await AsyncStorage.setItem(challengeStorageKey!, JSON.stringify(data));
        }

        const parsedCompletedCount =
          storedCompletedCount === null ? 0 : Number(storedCompletedCount);
        if (
          !Number.isSafeInteger(parsedCompletedCount) ||
          parsedCompletedCount < 0
        ) {
          throw new Error('Saved challenge progress has an invalid format.');
        }
        const savedDoneCount = data.filter((challenge) => challenge.done).length;
        const nextCompletedCount = Math.max(parsedCompletedCount, savedDoneCount);
        completedCountRef.current = nextCompletedCount;
        completedChallengeIds.current = new Set(
          data.filter((challenge) => challenge.done).map((challenge) => challenge.id),
        );
        if (nextCompletedCount !== parsedCompletedCount) {
          await AsyncStorage.setItem(
            COMPLETED_COUNT_STORAGE_KEY,
            String(nextCompletedCount),
          );
        }

        if (isActive) {
          setErrorMessage(null);
          setChallenges(data);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load challenges. Please try again.',
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadChallenges();

    return () => {
      isActive = false;
    };
  }, [goal, isGoalLoaded, persistenceError, challengeStorageKey]);

  async function refreshChallenges() {
    if (!goal || !challengeStorageKey) return;

    setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const nextChallenges = await generateChallenges(goal);
      setChallenges(nextChallenges);
      await AsyncStorage.setItem(challengeStorageKey, JSON.stringify(nextChallenges));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to refresh challenges.',
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  async function markChallengeDone(id: number) {
    if (!challengeStorageKey) return;
    if (!challenges.some((challenge) => challenge.id === id && !challenge.done)) return;
    if (completedChallengeIds.current.has(id)) return;

    completedChallengeIds.current.add(id);
    avatarRef.current?.play();
    const nextCompletedCount = completedCountRef.current + 1;
    completedCountRef.current = nextCompletedCount;
    const updatedChallenges = challenges.map((challenge) =>
      challenge.id === id ? { ...challenge, done: true } : challenge,
    );
    setChallenges(updatedChallenges);
    try {
      await Promise.all([
        AsyncStorage.setItem(challengeStorageKey, JSON.stringify(updatedChallenges)),
        AsyncStorage.setItem(
          COMPLETED_COUNT_STORAGE_KEY,
          String(nextCompletedCount),
        ),
      ]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to save challenge progress.',
      );
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>

        <View style={styles.header}>
          <ThemedText style={styles.date}>{today}</ThemedText>
          <ThemedText style={styles.heading}>Today&apos;s Challenges</ThemedText>
          <View style={styles.xpBar}>
            <ThemedText style={styles.xpText}>⚡ {earnedXp} XP earned today</ThemedText>
          </View>
          <Avatar2D
            ref={avatarRef}
            size={72}
          />
          <TouchableOpacity
            style={[styles.refreshButton, isRefreshing && styles.refreshButtonDisabled]}
            onPress={refreshChallenges}
            disabled={isLoading || isRefreshing || !goal}
            accessibilityRole="button"
          >
            {isRefreshing ? (
              <ActivityIndicator color="#000" />
            ) : (
              <ThemedText style={styles.refreshButtonText}>Refresh challenges</ThemedText>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <ActivityIndicator />
          ) : (
            <>
              {errorMessage ? (
                <ThemedText style={styles.errorMessage}>
                  {`Could not load challenges from the server: ${errorMessage}`}
                </ThemedText>
              ) : null}
              {challenges.length === 0 ? (
                <ThemedText style={styles.errorMessage}>No challenges are available.</ThemedText>
              ) : null}
              {challenges.map((c) => (
              <View
                key={c.id}
                style={[styles.card, c.done === true && styles.cardDone]}
              >
                <View style={styles.cardTop}>
                  <ThemedText style={styles.category}>{c.category}</ThemedText>
                  <ThemedText style={[styles.difficulty, { color: difficultyColor[c.difficulty] }]}>
                    {c.difficulty} · +{c.xp} XP
                  </ThemedText>
                </View>
                <ThemedText
                  style={[styles.cardTitle, c.done === true && styles.textDone]}
                >
                  {c.title}
                </ThemedText>
                <ThemedText style={styles.cardDesc}>{c.description}</ThemedText>
                <TouchableOpacity
                  style={[styles.doneBtn, c.done === true && styles.doneBtnDone]}
                  onPress={() => markChallengeDone(c.id)}
                  disabled={c.done}
                >
                  <ThemedText style={styles.doneBtnText}>
                    {c.done ? '✅ Done' : 'Mark as Done'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
              ))}
            </>
          )}
        </ScrollView>

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
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 8,
    gap: 6,
  },
  date: {
    fontSize: 12,
    color: '#888',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  xpBar: {
    backgroundColor: '#111130',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00C896',
    alignSelf: 'flex-start',
  },
  xpText: {
    color: '#00C896',
    fontSize: 13,
    fontWeight: 'bold',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 96,
  },
  errorMessage: {
    color: '#FF8A8A',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  refreshButton: {
    backgroundColor: '#00C896',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  refreshButtonDisabled: {
    opacity: 0.6,
  },
  refreshButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  card: {
    flexDirection: 'column',
    alignSelf: 'stretch',
    backgroundColor: '#111130',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#222244',
    gap: 8,
  },
  cardDone: {
    opacity: 0.5,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  category: {
    fontSize: 11,
    color: '#888',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  difficulty: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  textDone: {
    textDecorationLine: 'line-through',
  },
  cardDesc: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 20,
  },
  doneBtn: {
    alignSelf: 'stretch',
    backgroundColor: '#00C896',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  doneBtnDone: {
    backgroundColor: '#222244',
  },
  doneBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
});