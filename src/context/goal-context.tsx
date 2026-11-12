import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type GoalType = 'fitness' | 'book' | 'finance' | 'habit';

export type Goal = {
  type: GoalType;
  [field: string]: number | string;
};

type GoalContextValue = {
  goal: Goal | null;
  isGoalLoaded: boolean;
  persistenceError: string | null;
  saveGoal: (goal: Goal) => Promise<void>;
};

const GoalContext = createContext<GoalContextValue | undefined>(undefined);
const GOAL_STORAGE_KEY = '@levelup/goal';

function isGoal(value: unknown): value is Goal {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    ['fitness', 'book', 'finance', 'habit'].includes(String(candidate.type)) &&
    Object.values(candidate).every(
      (field) => typeof field === 'string' || typeof field === 'number',
    )
  );
}

export function GoalProvider({ children }: { children: ReactNode }) {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [isGoalLoaded, setIsGoalLoaded] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(GOAL_STORAGE_KEY)
      .then((storedGoal) => {
        if (storedGoal) {
          const parsed: unknown = JSON.parse(storedGoal);
          if (!isGoal(parsed)) {
            throw new Error('Saved goal has an invalid format.');
          }
          if (active) {
            setGoal(parsed);
          }
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setPersistenceError(
            error instanceof Error ? error.message : 'Unable to load the saved goal.',
          );
        }
      })
      .finally(() => {
        if (active) {
          setIsGoalLoaded(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function saveGoal(nextGoal: Goal) {
    setGoal(nextGoal);
    setPersistenceError(null);
    try {
      await AsyncStorage.setItem(GOAL_STORAGE_KEY, JSON.stringify(nextGoal));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to save the selected goal.';
      setPersistenceError(message);
      throw new Error(message);
    }
  }

  return (
    <GoalContext.Provider
      value={{ goal, isGoalLoaded, persistenceError, saveGoal }}
    >
      {children}
    </GoalContext.Provider>
  );
}

export function useGoal() {
  const context = useContext(GoalContext);
  if (!context) {
    throw new Error('useGoal must be used within a GoalProvider.');
  }
  return context;
}
