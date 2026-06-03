import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

interface LocationPromptModalProps {
  visible: boolean;
  onAllow: () => void;
  onDeny: () => void;
}

export default function LocationPromptModal({ visible, onAllow, onDeny }: LocationPromptModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="location" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Enable Location</Text>
          <Text style={styles.subtitle}>
            We need your location to find the best restaurants and ensure accurate delivery near you.
          </Text>

          <TouchableOpacity style={styles.allowButton} onPress={onAllow}>
            <Text style={styles.allowButtonText}>Allow Location Access</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.denyButton} onPress={onDeny}>
            <Text style={styles.denyButtonText}>Not Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: 'center',
    paddingBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF3E0', // Light primary tint
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  allowButton: {
    backgroundColor: COLORS.primary,
    width: '100%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  allowButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  denyButton: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  denyButtonText: {
    color: COLORS.gray,
    fontSize: 16,
    fontWeight: '600',
  },
});
