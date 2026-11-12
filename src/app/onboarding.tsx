import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useGoal, type Goal, type GoalType } from '@/context/goal-context';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type GoalField = {
  key: string;
  label: string;
  numeric?: boolean;
  options?: string[];
};

const goalOptions: { type: GoalType; title: string; description: string }[] = [
  {
    type: 'fitness',
    title: 'Fitness & Nutrition',
    description: 'Build healthier habits and work toward your target weight.',
  },
  {
    type: 'book',
    title: 'Read a Book',
    description: 'Make a practical daily reading plan.',
  },
  {
    type: 'finance',
    title: 'Finance',
    description: 'Build mindful spending and savings habits.',
  },
  {
    type: 'habit',
    title: 'Quit a Habit',
    description: 'Take one day at a time as you leave a habit behind.',
  },
];

const fieldsByGoal: Record<GoalType, GoalField[]> = {
  fitness: [
    { key: 'currentWeightKg', label: 'Current weight (kg)', numeric: true },
    { key: 'targetWeightKg', label: 'Target weight (kg)', numeric: true },
    { key: 'heightCm', label: 'Height (cm)', numeric: true },
    { key: 'age', label: 'Age', numeric: true },
    { key: 'sex', label: 'Sex', options: ['male', 'female'] },
    { key: 'activityLevel', label: 'Activity level', options: ['low', 'medium', 'high'] },
    { key: 'deadlineWeeks', label: 'Deadline (weeks)', numeric: true },
  ],
  book: [
    { key: 'bookTitle', label: 'Book title' },
    { key: 'totalPages', label: 'Total pages', numeric: true },
    { key: 'deadlineDays', label: 'Deadline (days)', numeric: true },
  ],
  finance: [
    { key: 'monthlyIncome', label: 'Monthly income', numeric: true },
    { key: 'mainSpendingProblem', label: 'Main spending problem' },
    { key: 'savingsGoal', label: 'Savings goal', numeric: true },
  ],
  habit: [
    { key: 'habitName', label: 'Habit name' },
    { key: 'daysClean', label: 'Days already clean', numeric: true },
    { key: 'reason', label: 'Your reason for quitting' },
  ],
};

const numericFields = new Set([
  'currentWeightKg',
  'targetWeightKg',
  'heightCm',
  'age',
  'deadlineWeeks',
  'totalPages',
  'deadlineDays',
  'monthlyIncome',
  'savingsGoal',
  'daysClean',
]);

export default function OnboardingScreen() {
  const { saveGoal, isGoalLoaded } = useGoal();
  const [selectedGoal, setSelectedGoal] = useState<GoalType | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function selectGoal(type: GoalType) {
    setSelectedGoal(type);
    setValues({});
    setError('');
  }

  function updateValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setError('');
  }

  async function submitGoal() {
    if (!selectedGoal) return;

    const fields = fieldsByGoal[selectedGoal];
    const missingField = fields.find((field) => !values[field.key]?.trim());
    if (missingField) {
      setError(`Please enter ${missingField.label.toLowerCase()}.`);
      return;
    }

    const goal: Goal = { type: selectedGoal };
    for (const field of fields) {
      const value = values[field.key].trim();
      if (numericFields.has(field.key)) {
        const number = Number(value);
        if (!Number.isFinite(number) || number < 0 || (number === 0 && field.key !== 'daysClean')) {
          setError(`${field.label} must be a valid positive number.`);
          return;
        }
        goal[field.key] = number;
      } else {
        goal[field.key] = value;
      }
    }

    setIsSubmitting(true);
    try {
      await saveGoal(goal);
      router.replace('/explore');
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save your goal. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardArea}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <ThemedText style={styles.eyebrow}>YOUR NEXT LEVEL</ThemedText>
            <ThemedText style={styles.heading}>
              {selectedGoal ? 'Tell us about your goal' : 'Choose your goal'}
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {selectedGoal
                ? 'We’ll turn your goal into achievable daily challenges.'
                : 'Pick one area to focus on first.'}
            </ThemedText>

            {!selectedGoal ? (
              <View style={styles.options}>
                {goalOptions.map((option) => (
                  <TouchableOpacity
                    key={option.type}
                    style={styles.goalCard}
                    onPress={() => selectGoal(option.type)}
                    accessibilityRole="button"
                  >
                    <ThemedText style={styles.goalTitle}>{option.title}</ThemedText>
                    <ThemedText style={styles.goalDescription}>{option.description}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.form}>
                <TouchableOpacity
                  onPress={() => setSelectedGoal(null)}
                  style={styles.backButton}
                  accessibilityRole="button"
                >
                  <ThemedText style={styles.backText}>‹ Choose a different goal</ThemedText>
                </TouchableOpacity>
                {fieldsByGoal[selectedGoal].map((field) => (
                  <View key={field.key} style={styles.fieldGroup}>
                    <ThemedText style={styles.label}>{field.label}</ThemedText>
                    {field.options ? (
                      <View style={styles.choices}>
                        {field.options.map((option) => {
                          const isSelected = values[field.key] === option;
                          return (
                            <TouchableOpacity
                              key={option}
                              style={[styles.choice, isSelected && styles.choiceSelected]}
                              onPress={() => updateValue(field.key, option)}
                              accessibilityRole="button"
                              accessibilityState={{ selected: isSelected }}
                            >
                              <ThemedText
                                style={[styles.choiceText, isSelected && styles.choiceTextSelected]}
                              >
                                {option}
                              </ThemedText>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ) : (
                      <TextInput
                        style={styles.input}
                        value={values[field.key] ?? ''}
                        onChangeText={(value) => updateValue(field.key, value)}
                        placeholder={field.label}
                        placeholderTextColor="#777"
                        keyboardType={field.numeric ? 'decimal-pad' : 'default'}
                        autoCapitalize={field.numeric ? 'none' : 'sentences'}
                      />
                    )}
                  </View>
                ))}

                {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
                <TouchableOpacity
                  style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                  onPress={submitGoal}
                  disabled={isSubmitting || !isGoalLoaded}
                  accessibilityRole="button"
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <ThemedText style={styles.submitText}>CREATE MY CHALLENGES</ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardArea: {
    flex: 1,
  },
  content: {
    paddingTop: 36,
    paddingBottom: 32,
  },
  eyebrow: {
    color: '#00C896',
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: 'bold',
  },
  heading: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 36,
    fontWeight: 'bold',
    marginTop: 8,
  },
  subtitle: {
    color: '#aaa',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
    marginBottom: 24,
  },
  options: {
    gap: 14,
  },
  goalCard: {
    backgroundColor: '#111130',
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: '#222244',
    gap: 8,
    minHeight: 112,
    justifyContent: 'center',
  },
  goalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  goalDescription: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    gap: 18,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  backText: {
    color: '#00C896',
    fontSize: 14,
    fontWeight: 'bold',
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#111130',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222244',
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
  },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  choice: {
    backgroundColor: '#111130',
    borderColor: '#222244',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
  },
  choiceSelected: {
    backgroundColor: '#003d31',
    borderColor: '#00C896',
  },
  choiceText: {
    color: '#aaa',
    textTransform: 'capitalize',
    fontSize: 14,
  },
  choiceTextSelected: {
    color: '#00C896',
    fontWeight: 'bold',
  },
  error: {
    color: '#FF6B6B',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#00C896',
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
