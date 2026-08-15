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
import { COLORS, SPACING, SHADOWS } from '../theme';
import {
  getActiveBaseUrl,
  setActiveBaseUrl,
  resetBaseUrlToDefault,
  getAvailablePresets,
  testApiConnectivity,
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
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latencyMs: number;
    message: string;
    url: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const presets = getAvailablePresets();

  useEffect(() => {
    if (visible) {
      const current = getActiveBaseUrl();
      setSelectedUrl(current);
      setCustomInput(current);
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
      const def = await resetBaseUrlToDefault();
      setSelectedUrl(def);
      setCustomInput(def);
      if (onServerChanged) {
        onServerChanged(def);
      }
      handleTest(def);
    } catch (err: any) {
      Alert.alert('Error Resetting', err?.message || 'Failed to reset default URL');
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
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.modalTitle}>⚙️ Backend Server Config</Text>
              <Text style={styles.modalSubtitle}>Select or test connection endpoint</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Active Server Info */}
            <View style={styles.activeBanner}>
              <Text style={styles.activeBannerLabel}>ACTIVE SERVER</Text>
              <Text style={styles.activeBannerUrl} numberOfLines={1}>
                {getActiveBaseUrl()}
              </Text>
            </View>

            {/* Presets List */}
            <Text style={styles.sectionLabel}>SERVER PRESETS</Text>
            {presets.map((preset) => {
              const isSelected = selectedUrl === preset.url;
              return (
                <TouchableOpacity
                  key={preset.id}
                  style={[styles.presetCard, isSelected && styles.presetCardSelected]}
                  onPress={() => handleSelectPreset(preset.url)}
                  activeOpacity={0.8}
                >
                  <View style={styles.presetHeader}>
                    <Text style={[styles.presetTitle, isSelected && styles.presetTitleSelected]}>
                      {preset.label}
                    </Text>
                    {isSelected && <Text style={styles.activeBadge}>SELECTED</Text>}
                  </View>
                  <Text style={styles.presetUrl}>{preset.url}</Text>
                  <Text style={styles.presetDescription}>{preset.description}</Text>
                </TouchableOpacity>
              );
            })}

            {/* Custom URL Input */}
            <Text style={styles.sectionLabel}>CUSTOM API URL</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={customInput}
                onChangeText={(val) => {
                  setCustomInput(val);
                  setSelectedUrl(val);
                }}
                placeholder="https://your-api.com/api"
                placeholderTextColor={COLORS.neutral400}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>

            {/* Test Connection Result Box */}
            <View style={styles.testSection}>
              <TouchableOpacity
                style={[styles.testButton, isTesting && styles.testButtonDisabled]}
                onPress={() => handleTest(customInput || selectedUrl)}
                disabled={isTesting}
                activeOpacity={0.8}
              >
                {isTesting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.testButtonText}>⚡ Test Connection</Text>
                )}
              </TouchableOpacity>

              {testResult && (
                <View
                  style={[
                    styles.resultCard,
                    testResult.success ? styles.resultSuccess : styles.resultError,
                  ]}
                >
                  <Text style={styles.resultTitle}>
                    {testResult.success ? '🟢 Reachable' : '🔴 Unreachable'}
                  </Text>
                  <Text style={styles.resultMessage}>{testResult.message}</Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleReset}
              disabled={isSaving}
              activeOpacity={0.7}
            >
              <Text style={styles.resetButtonText}>Reset Heroku</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Apply Server</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.neutral200,
    padding: SPACING.lg,
    ...SHADOWS.large,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.dark,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.neutral500,
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.neutral100,
  },
  closeButtonText: {
    fontSize: 14,
    color: COLORS.neutral600,
    fontWeight: 'bold',
  },
  scrollArea: {
    marginBottom: SPACING.md,
  },
  activeBanner: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.sm + 2,
    marginBottom: SPACING.md,
  },
  activeBannerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.5,
  },
  activeBannerUrl: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#1E40AF',
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.neutral500,
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
    marginTop: SPACING.xs,
  },
  presetCard: {
    backgroundColor: COLORS.neutral50,
    borderColor: COLORS.neutral200,
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.sm + 2,
    marginBottom: SPACING.xs + 2,
  },
  presetCardSelected: {
    backgroundColor: '#FFF1F2',
    borderColor: COLORS.primary,
  },
  presetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  presetTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.dark,
  },
  presetTitleSelected: {
    color: COLORS.primary,
  },
  activeBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.primary,
    backgroundColor: 'rgba(232, 54, 78, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  presetUrl: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: COLORS.neutral600,
    marginTop: 2,
  },
  presetDescription: {
    fontSize: 10,
    color: COLORS.neutral400,
    marginTop: 2,
  },
  inputContainer: {
    backgroundColor: COLORS.neutral50,
    borderColor: COLORS.neutral300,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: SPACING.sm + 2,
    marginBottom: SPACING.md,
  },
  textInput: {
    height: 40,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: COLORS.dark,
  },
  testSection: {
    marginBottom: SPACING.sm,
  },
  testButton: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButtonDisabled: {
    opacity: 0.6,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  resultCard: {
    marginTop: SPACING.xs + 2,
    borderRadius: 10,
    padding: SPACING.sm,
    borderWidth: 1,
  },
  resultSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  resultError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  resultTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  resultMessage: {
    fontSize: 11,
    color: COLORS.neutral600,
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  resetButton: {
    flex: 1,
    backgroundColor: COLORS.neutral100,
    borderColor: COLORS.neutral300,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetButtonText: {
    color: COLORS.neutral700,
    fontSize: 13,
    fontWeight: '700',
  },
  saveButton: {
    flex: 1.5,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default ServerConfigModal;
