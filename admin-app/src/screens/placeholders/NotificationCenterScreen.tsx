import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../theme';
import { sendPushBroadcast, fetchRestaurants } from '../../services/api';

export const NotificationCenterScreen = () => {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<'all' | number>('all');
  const [isSending, setIsSending] = useState(false);
  const [recentDispatches, setRecentDispatches] = useState<
    { id: string; title: string; body: string; target: string; time: string }[]
  >([]);

  useEffect(() => {
    fetchRestaurants().then((res) => {
      const list = Array.isArray(res) ? res : res?.results || [];
      setRestaurants(list);
    });
  }, []);

  const handleSendBroadcast = () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Validation Error', 'Please enter both notification title and message body.');
      return;
    }

    const targetLabel =
      selectedTarget === 'all'
        ? 'All Platform Users'
        : restaurants.find((r) => r.id === selectedTarget)?.name || 'Selected Restaurant';

    Alert.alert(
      'Confirm Push Dispatch',
      `Are you sure you want to broadcast this push notification to: ${targetLabel}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '🚀 Dispatch Push Now',
          onPress: async () => {
            setIsSending(true);
            try {
              await sendPushBroadcast({
                title: title.trim(),
                body: body.trim(),
                target: selectedTarget,
              });

              const newLog = {
                id: String(Date.now()),
                title: title.trim(),
                body: body.trim(),
                target: targetLabel,
                time: new Date().toLocaleTimeString(),
              };

              setRecentDispatches((prev) => [newLog, ...prev]);
              Alert.alert('Success', 'Push broadcast dispatched successfully!');
              setTitle('');
              setBody('');
            } catch (err: any) {
              Alert.alert('Dispatch Error', err?.response?.data?.detail || err?.message || 'Failed to send push broadcast');
            } finally {
              setIsSending(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.superAdmin.bg} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>FCM Push Center</Text>
          <Text style={styles.subtitle}>Targeted Push Notifications & Customer Broadcasts</Text>
        </View>

        {/* Composer Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📣 Compose Push Broadcast</Text>

          <Text style={styles.inputLabel}>Notification Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 🔥 Weekend Special 20% OFF!"
            placeholderTextColor={COLORS.superAdmin.muted}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.inputLabel}>Message Body</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Order your favorite Desi BBQ from SeenBanao tonight!"
            placeholderTextColor={COLORS.superAdmin.muted}
            value={body}
            onChangeText={setBody}
            multiline
            numberOfLines={4}
          />

          <Text style={styles.inputLabel}>Target Audience</Text>
          <View style={styles.targetContainer}>
            <TouchableOpacity
              style={[
                styles.targetOption,
                selectedTarget === 'all' && styles.targetOptionActive,
              ]}
              onPress={() => setSelectedTarget('all')}
            >
              <Text
                style={[
                  styles.targetOptionText,
                  selectedTarget === 'all' && styles.targetOptionTextActive,
                ]}
              >
                🌐 All Platform Users
              </Text>
            </TouchableOpacity>

            {restaurants.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[
                  styles.targetOption,
                  selectedTarget === r.id && styles.targetOptionActive,
                ]}
                onPress={() => setSelectedTarget(r.id)}
              >
                <Text
                  style={[
                    styles.targetOptionText,
                    selectedTarget === r.id && styles.targetOptionTextActive,
                  ]}
                >
                  🍽️ {r.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSendBroadcast}
            disabled={isSending}
          >
            {isSending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.sendButtonText}>🚀 Dispatch Push Notification</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Dispatch Log Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Recent Dispatch Session Log</Text>
          {recentDispatches.length === 0 ? (
            <Text style={styles.emptyLogText}>No notifications sent in this session yet.</Text>
          ) : (
            recentDispatches.map((log) => (
              <View key={log.id} style={styles.logItem}>
                <View style={styles.logHeader}>
                  <Text style={styles.logTitle}>{log.title}</Text>
                  <Text style={styles.logTime}>{log.time}</Text>
                </View>
                <Text style={styles.logBody}>{log.body}</Text>
                <Text style={styles.logTarget}>Audience: {log.target}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.superAdmin.bg,
  },
  content: {
    padding: SPACING.md,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  title: {
    color: COLORS.superAdmin.text,
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    color: COLORS.superAdmin.muted,
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.superAdmin.card,
    borderColor: COLORS.superAdmin.border,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.medium,
  },
  cardTitle: {
    color: COLORS.superAdmin.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  inputLabel: {
    color: COLORS.superAdmin.muted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 4,
  },
  input: {
    backgroundColor: COLORS.superAdmin.bg,
    borderColor: COLORS.superAdmin.border,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    color: COLORS.superAdmin.text,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 14,
    marginBottom: SPACING.sm,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  targetContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.lg,
  },
  targetOption: {
    backgroundColor: COLORS.superAdmin.bg,
    borderColor: COLORS.superAdmin.border,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  targetOptionActive: {
    backgroundColor: COLORS.superAdmin.accent,
    borderColor: COLORS.superAdmin.accent,
  },
  targetOptionText: {
    color: COLORS.superAdmin.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  targetOptionTextActive: {
    color: '#FFF',
  },
  sendButton: {
    backgroundColor: '#10B981',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  sendButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  emptyLogText: {
    color: COLORS.superAdmin.muted,
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: SPACING.md,
  },
  logItem: {
    backgroundColor: COLORS.superAdmin.bg,
    borderColor: COLORS.superAdmin.border,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logTitle: {
    color: COLORS.superAdmin.text,
    fontSize: 13,
    fontWeight: 'bold',
  },
  logTime: {
    color: COLORS.superAdmin.muted,
    fontSize: 10,
  },
  logBody: {
    color: COLORS.superAdmin.muted,
    fontSize: 12,
    marginBottom: 4,
  },
  logTarget: {
    color: COLORS.superAdmin.accent,
    fontSize: 11,
    fontWeight: '600',
  },
});
