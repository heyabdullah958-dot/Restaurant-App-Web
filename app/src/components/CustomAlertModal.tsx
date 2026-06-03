import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { COLORS, FONTS, SHADOWS, SPACING } from '../theme';

interface AlertAction {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  actions?: AlertAction[];
  onDismiss?: () => void;
}

export default function CustomAlertModal({
  visible,
  title,
  message,
  actions,
  onDismiss,
}: CustomAlertModalProps) {
  const defaultActions: AlertAction[] = [
    { text: 'OK', onPress: onDismiss, style: 'default' },
  ];

  const renderActions = actions || defaultActions;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.alertBox, SHADOWS.medium]}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>
              <View style={styles.actionsContainer}>
                {renderActions.map((action, index) => {
                  const isCancel = action.style === 'cancel';
                  const isDestructive = action.style === 'destructive';
                  return (
                    <TouchableOpacity
                      key={index}
                      activeOpacity={0.7}
                      style={[
                        styles.actionButton,
                        isCancel && styles.cancelButton,
                        isDestructive && styles.destructiveButton,
                      ]}
                      onPress={() => {
                        if (action.onPress) action.onPress();
                        if (onDismiss) onDismiss();
                      }}
                    >
                      <Text
                        style={[
                          styles.actionText,
                          isCancel && styles.cancelText,
                          isDestructive && styles.destructiveText,
                        ]}
                      >
                        {action.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Using a slightly lighter overlay
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  alertBox: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: COLORS.light,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  cancelText: {
    color: COLORS.dark,
  },
  destructiveButton: {
    backgroundColor: COLORS.danger,
  },
  destructiveText: {
    color: COLORS.white,
  },
});
