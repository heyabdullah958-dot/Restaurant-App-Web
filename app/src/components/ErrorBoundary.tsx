import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught unhandled customer app error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRestart = async () => {
    try {
      this.setState({ hasError: false, error: null, errorInfo: null });
    } catch (e) {
      if (__DEV__) console.warn('[ErrorBoundary] Restart error:', e);
    }
  };

  handleResetStorage = async () => {
    try {
      await AsyncStorage.clear();
      this.setState({ hasError: false, error: null, errorInfo: null });
    } catch (e) {
      if (__DEV__) console.warn('[ErrorBoundary] Reset storage error:', e);
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>🍽️</Text>
            </View>

            <Text style={styles.title}>Something Went Wrong</Text>
            <Text style={styles.subtitle}>
              GetFood encountered an unexpected issue while loading. You can reload the application or reset local cache.
            </Text>

            {this.state.error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorLabel}>Diagnostic Details:</Text>
                <Text style={styles.errorMessage}>{this.state.error.message || String(this.state.error)}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={this.handleRestart}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>🔄 Reload GetFood</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={this.handleResetStorage}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryButtonText}>🧹 Reset Local Cache & Restart</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(233, 65, 36, 0.12)',
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  iconText: {
    fontSize: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.dark,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.neutral600,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  errorBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.small,
  },
  errorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.danger,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  errorMessage: {
    fontSize: 12,
    color: COLORS.neutral700,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 18,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.sm,
    ...SHADOWS.colored,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderColor: COLORS.neutral300,
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: COLORS.neutral600,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ErrorBoundary;
