import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../../theme';

interface DateTimePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (isoString: string) => void;
  initialDate?: string | null;
  mode?: 'date' | 'datetime';
  title?: string;
  themeMode?: 'super' | 'branch';
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const DateTimePickerModal: React.FC<DateTimePickerModalProps> = ({
  visible,
  onClose,
  onSelect,
  initialDate,
  mode = 'datetime',
  title = 'Select Date & Time',
  themeMode = 'super',
}) => {
  const isSuper = themeMode === 'super';
  const themeCard = isSuper ? COLORS.superAdmin.card : COLORS.branchManager.card;
  const themeText = isSuper ? COLORS.superAdmin.text : COLORS.branchManager.text;
  const themeMuted = isSuper ? COLORS.superAdmin.muted : COLORS.branchManager.muted;
  const themeAccent = isSuper ? COLORS.superAdmin.accent : COLORS.branchManager.primary;
  const themeBorder = isSuper ? COLORS.superAdmin.border : COLORS.branchManager.border;

  // Selected state
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (initialDate) {
      const parsed = new Date(initialDate);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  });

  const [viewYear, setViewYear] = useState<number>(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(selectedDate.getMonth());
  const [selectedHour, setSelectedHour] = useState<number>(selectedDate.getHours());
  const [selectedMinute, setSelectedMinute] = useState<number>(selectedDate.getMinutes());

  useEffect(() => {
    if (visible) {
      const base = initialDate ? new Date(initialDate) : new Date();
      const valid = !isNaN(base.getTime()) ? base : new Date();
      setSelectedDate(valid);
      setViewYear(valid.getFullYear());
      setViewMonth(valid.getMonth());
      setSelectedHour(valid.getHours());
      setSelectedMinute(valid.getMinutes());
    }
  }, [visible, initialDate]);

  // Calendar Day Generation
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun

  const now = new Date();
  const isPastMonth = viewYear < now.getFullYear() || (viewYear === now.getFullYear() && viewMonth < now.getMonth());
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
  const isPrevMonthDisabled = viewYear < now.getFullYear() || (viewYear === now.getFullYear() && viewMonth <= now.getMonth());

  const handlePrevMonth = () => {
    if (isPrevMonthDisabled) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleDaySelect = (day: number) => {
    const isDayInPast = isPastMonth || (isCurrentMonth && day < now.getDate());
    if (isDayInPast) return;
    const nextDate = new Date(viewYear, viewMonth, day, selectedHour, selectedMinute, 0);
    setSelectedDate(nextDate);
  };

  // Quick Duration Presets
  const applyPreset = (hoursOffset: number, isEndOfDay = false) => {
    const d = new Date();
    d.setHours(d.getHours() + hoursOffset);
    if (isEndOfDay) {
      d.setHours(23, 59, 59, 0);
    }
    setSelectedDate(d);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setSelectedHour(d.getHours());
    setSelectedMinute(d.getMinutes());
  };

  const applyEndOfMonth = () => {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    setSelectedDate(d);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setSelectedHour(23);
    setSelectedMinute(59);
  };

  const applyEndOfYear = () => {
    const d = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    setSelectedDate(d);
    setViewYear(d.getFullYear());
    setViewMonth(11);
    setSelectedHour(23);
    setSelectedMinute(59);
  };

  const handleConfirm = () => {
    const finalDate = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      mode === 'datetime' ? selectedHour : 0,
      mode === 'datetime' ? selectedMinute : 0,
      0
    );

    if (mode === 'date') {
      const yearStr = finalDate.getFullYear();
      const monthStr = String(finalDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(finalDate.getDate()).padStart(2, '0');
      onSelect(`${yearStr}-${monthStr}-${dayStr}`);
    } else {
      onSelect(finalDate.toISOString());
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: themeCard, borderColor: themeBorder }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: themeText }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: themeMuted, fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Preset Buttons */}
          <Text style={[styles.sectionLabel, { color: themeMuted }]}>⚡ Quick Presets</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.presetsScroll}
            contentContainerStyle={styles.presetsContainer}
          >
            <TouchableOpacity
              style={[styles.presetChip, { borderColor: themeBorder }]}
              onPress={() => applyPreset(24)}
            >
              <Text style={[styles.presetText, { color: themeText }]}>+24 Hours</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.presetChip, { borderColor: themeBorder }]}
              onPress={() => applyPreset(72, true)}
            >
              <Text style={[styles.presetText, { color: themeText }]}>+3 Days (Weekend)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.presetChip, { borderColor: themeBorder }]}
              onPress={() => applyPreset(24 * 7, true)}
            >
              <Text style={[styles.presetText, { color: themeText }]}>+7 Days</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.presetChip, { borderColor: themeBorder }]}
              onPress={applyEndOfMonth}
            >
              <Text style={[styles.presetText, { color: themeText }]}>End of Month</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.presetChip, { borderColor: themeBorder }]}
              onPress={applyEndOfYear}
            >
              <Text style={[styles.presetText, { color: themeText }]}>End of Year</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Month / Year Navigator */}
          <View style={styles.monthNavRow}>
            <TouchableOpacity
              onPress={handlePrevMonth}
              disabled={isPrevMonthDisabled}
              style={[styles.navBtn, isPrevMonthDisabled && { opacity: 0.3 }]}
            >
              <Text style={[styles.navBtnText, { color: isPrevMonthDisabled ? themeMuted : themeAccent }]}>◀</Text>
            </TouchableOpacity>
            <Text style={[styles.monthTitle, { color: themeText }]}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
              <Text style={[styles.navBtnText, { color: themeAccent }]}>▶</Text>
            </TouchableOpacity>
          </View>

          {/* Days of Week Header */}
          <View style={styles.weekHeader}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((w) => (
              <Text key={w} style={[styles.weekDayText, { color: themeMuted }]}>
                {w}
              </Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.grid}>
            {/* Empty slots for start of month */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.daySlot} />
            ))}

            {/* Actual Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isDayInPast = isPastMonth || (isCurrentMonth && day < now.getDate());
              const isSelected =
                !isDayInPast &&
                selectedDate.getDate() === day &&
                selectedDate.getMonth() === viewMonth &&
                selectedDate.getFullYear() === viewYear;

              return (
                <TouchableOpacity
                  key={`day-${day}`}
                  disabled={isDayInPast}
                  style={[
                    styles.daySlot,
                    isSelected && { backgroundColor: themeAccent, borderRadius: RADIUS.round },
                    isDayInPast && { opacity: 0.25 },
                  ]}
                  onPress={() => handleDaySelect(day)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: isSelected ? '#FFFFFF' : isDayInPast ? themeMuted : themeText },
                      isSelected && { fontWeight: '700' },
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Time Picker (for datetime mode) */}
          {mode === 'datetime' ? (
            <View style={styles.timeSection}>
              <Text style={[styles.sectionLabel, { color: themeMuted }]}>⏰ Time (24-Hour)</Text>
              <View style={styles.timePickerRow}>
                {/* Hour Selector */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScroll}>
                  {Array.from({ length: 24 }).map((_, h) => (
                    <TouchableOpacity
                      key={`h-${h}`}
                      style={[
                        styles.timeChip,
                        selectedHour === h && { backgroundColor: themeAccent },
                      ]}
                      onPress={() => setSelectedHour(h)}
                    >
                      <Text
                        style={[
                          styles.timeChipText,
                          { color: selectedHour === h ? '#FFF' : themeText },
                        ]}
                      >
                        {String(h).padStart(2, '0')}h
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Minute Selector Presets */}
              <View style={styles.minuteRow}>
                {[0, 15, 30, 45, 59].map((m) => (
                  <TouchableOpacity
                    key={`m-${m}`}
                    style={[
                      styles.minuteChip,
                      selectedMinute === m && { backgroundColor: themeAccent },
                    ]}
                    onPress={() => setSelectedMinute(m)}
                  >
                    <Text
                      style={[
                        styles.minuteText,
                        { color: selectedMinute === m ? '#FFF' : themeText },
                      ]}
                    >
                      :{String(m).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}

          {/* Current Selection Display & Confirm Actions */}
          <View style={styles.footer}>
            <View style={styles.selectedDisplay}>
              <Text style={[styles.selectedLabel, { color: themeMuted }]}>Selected Value:</Text>
              <Text style={[styles.selectedValue, { color: themeAccent }]}>
                {mode === 'date'
                  ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                  : selectedDate.toLocaleString()}
              </Text>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={{ color: themeMuted, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.applyBtn, { backgroundColor: themeAccent }]}
                onPress={handleConfirm}
              >
                <Text style={styles.applyBtnText}>Set DateTime</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    ...SHADOWS.large,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.h3,
  },
  closeBtn: {
    padding: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  presetsScroll: {
    marginBottom: SPACING.sm,
  },
  presetsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  presetText: {
    fontSize: 11,
    fontWeight: '600',
  },
  monthNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  navBtn: {
    padding: SPACING.xs,
  },
  navBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  weekDayText: {
    fontSize: 11,
    fontWeight: '600',
    width: 38,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: SPACING.sm,
  },
  daySlot: {
    width: '14.28%',
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '500',
  },
  timeSection: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  timePickerRow: {
    marginBottom: 6,
  },
  timeScroll: {
    flexDirection: 'row',
  },
  timeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
    marginRight: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  timeChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  minuteRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  minuteChip: {
    flex: 1,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  minuteText: {
    fontSize: 11,
    fontWeight: '600',
  },
  footer: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  selectedDisplay: {
    marginBottom: SPACING.sm,
  },
  selectedLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
  },
  selectedValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
  },
  applyBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
