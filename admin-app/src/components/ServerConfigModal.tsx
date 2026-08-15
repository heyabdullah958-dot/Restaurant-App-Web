import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';
import {
  getActiveBaseUrl,
  setActiveBaseUrl,
  resetBaseUrlToDefault,
  getAvailablePresets,
  testApiConnectivity,
  ConnectivityTestResult,
  PRODUCTION_API_URL,
} from '../services/api';

interface ServerConfigModalProps {
  visible: boolean;
  onClose: () => void;
  onServerChanged?: (newUrl: string) => void;
}

export const ServerConfigModal: React.FC<ServerConfigModalProps> = ({
  visible,
  onClose,
  onServerChanged,
}) => {
  const [selectedUrl, setSelectedUrl] = useState<string>(getActiveBaseUrl());
  const [customInput, setCustomInput] = useState<string>('');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<ConnectivityTestResult | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const presets = getAvailablePresets();

  useEffect(() => {
    if (visible) {
      const current = getActiveBaseUrl();
      setSelectedUrl(current);
      setCustomInput(current);
      // Auto-test current server upon opening
      handleTest(current);
    }
  }, [visible]);

  const handleTest = async (urlToTest: string) => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testApiConnectivity(urlToTest);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        success: false,
        latencyMs: 0,
        message: err?.message || 'Connection test failed',
        url: urlToTest,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSelectPreset = (url: string) => {
    setSelectedUrl(url);
    setCustomInput(url);
    handleTest(url);
  };

  const handleSave = async () => {
    const target = customInput.trim() || selectedUrl;
    if (!target) {
      Alert.alert('Error', 'Please enter a valid API URL');
      return;
    }

    setIsSaving(true);
    try {
      const applied = await setActiveBaseUrl(target);
      if (onServerChanged) {
        onServerChanged(applied);
      }
      onClose();
    } catch (err: any) {
      Alert.alert('Error Saving Server', err?.message || 'Failed to save server URL');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    try {
      const defaultUrl = await resetBaseUrlToDefault();
      setSelectedUrl(defaultUrl);
      setCustomInput(defaultUrl);
      if (onServerChanged) {
        onServerChanged(defaultUrl);
      }
      handleTest(defaultUrl);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>⚙️ Server Configuration</Text>
            </View>
            <Text style={styles.headerSubtitle}>
              Switch API environments & test network connectivity
            </Text>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {/* Live Connection Status Banner */}
            <View
              style={[
                styles.statusBanner,
                testResult?.success ? styles.statusBannerSuccess : styles.statusBannerError,
                isTesting && styles.statusBannerTesting,
              ]}
            >
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusDot,
                    testResult?.success ? styles.statusDotSuccess : styles.statusDotError,
                    isTesting && styles.statusDotTesting,
                  ]}
                />
                <Text style={styles.statusLabel}>
                  {isTesting
                    ? 'Testing connection...'
                    : testResult?.success
                    ? `ONLINE (${testResult.latencyMs}ms latency)`
                    : 'OFFLINE / UNREACHABLE'}
                </Text>
              </View>
              {testResult?.message && (
                <Text style={styles.statusDetailText}>{testResult.message}</Text>
              )}
            </View>

            {/* Presets List */}
            <Text style={styles.sectionLabel}>Available Presets</Text>
            {presets.map((preset) => {
              const isSelected = selectedUrl === preset.url;
              return (
                <TouchableOpacity
                  key={preset.id}
                  style={[styles.presetCard, isSelected && styles.presetCardSelected]}
                  onPress={() => handleSelectPreset(preset.url)}
                  activeOpacity={0.7}
                >
                  <View style={styles.presetHeader}>
                    <Text style={[styles.presetLabel, isSelected && styles.presetLabelSelected]}>
                      {preset.label}
                    </Text>
                    {isSelected && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>ACTIVE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.presetUrl} numberOfLines={1}>
                    {preset.url}
                  </Text>
                  <Text style={styles.presetDescription}>{preset.description}</Text>
                </TouchableOpacity>
              );
            })}

            {/* Custom URL Input */}
            <Text style={styles.sectionLabel}>Custom API URL</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={customInput}
                onChangeText={(text) => {
                  setCustomInput(text);
                  setSelectedUrl(text);
                }}
                placeholder="https://your-api-domain.com/api"
                placeholderTextColor={COLORS.neutral400}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.testButton, isTesting && styles.testButtonDisabled]}
                onPress={() => handleTest(customInput)}
                disabled={isTesting}
              >
                {isTesting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.testButtonText}>Test</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleReset}
              disabled={isSaving}
            >
              <Text style={styles.resetButtonText}>Default</Text>
            </TouchableOpacity>

            <View style={styles.footerRight}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                disabled={isSaving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save & Apply</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  modalCard: {
    backgroundColor: COLORS.superAdmin.card,
    borderRadius: RADIUS.lg,
    borderColor: COLORS.superAdmin.border,
    borderWidth: 1,
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    ...SHADOWS.large,
  },
  header: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.superAdmin.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.superAdmin.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: COLORS.superAdmin.muted,
    fontSize: 12,
    marginTop: 4,
  },
  body: {
    padding: SPACING.md,
    maxHeight: 400,
  },
  statusBanner: {
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 2,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  statusBannerSuccess: {
    backgroundColor: 'rgba(0, 196, 140, 0.15)',
    borderColor: COLORS.success,
  },
  statusBannerError: {
    backgroundColor: 'rgba(255, 71, 87, 0.15)',
    borderColor: COLORS.danger,
  },
  statusBannerTesting: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: COLORS.accent,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.xs + 2,
  },
  statusDotSuccess: {
    backgroundColor: COLORS.success,
  },
  statusDotError: {
    backgroundColor: COLORS.danger,
  },
  statusDotTesting: {
    backgroundColor: COLORS.accent,
  },
  statusLabel: {
    color: COLORS.superAdmin.text,
    fontSize: 13,
    fontWeight: '700',
  },
  statusDetailText: {
    color: COLORS.superAdmin.muted,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
  },
  sectionLabel: {
    color: COLORS.superAdmin.muted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs + 2,
    marginTop: SPACING.xs,
  },
  presetCard: {
    backgroundColor: COLORS.superAdmin.bg,
    borderRadius: RADIUS.sm,
    borderColor: COLORS.superAdmin.border,
    borderWidth: 1,
    padding: SPACING.sm + 2,
    marginBottom: SPACING.sm,
  },
  presetCardSelected: {
    borderColor: COLORS.superAdmin.primary,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
  },
  presetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  presetLabel: {
    color: COLORS.superAdmin.text,
    fontSize: 14,
    fontWeight: '600',
  },
  presetLabelSelected: {
    color: COLORS.superAdmin.accent,
  },
  activeBadge: {
    backgroundColor: COLORS.superAdmin.primary,
    borderRadius: RADIUS.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  presetUrl: {
    color: COLORS.superAdmin.muted,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
  presetDescription: {
    color: COLORS.neutral400,
    fontSize: 11,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.superAdmin.bg,
    borderColor: COLORS.superAdmin.border,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    color: COLORS.superAdmin.text,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.sm,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  testButton: {
    backgroundColor: COLORS.superAdmin.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 64,
  },
  testButtonDisabled: {
    opacity: 0.5,
  },
  testButtonText: {
    color: COLORS.superAdmin.text,
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.superAdmin.border,
  },
  resetButton: {
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.sm,
  },
  resetButtonText: {
    color: COLORS.superAdmin.muted,
    fontSize: 13,
  },
  footerRight: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  cancelButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
  },
  cancelButtonText: {
    color: COLORS.superAdmin.muted,
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: COLORS.superAdmin.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md + 4,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
