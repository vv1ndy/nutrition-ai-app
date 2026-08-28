import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ProgressBar({ label, current, target, color = '#2e7d32' }) {
  const progress = Math.min((current / target) * 100, 100);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.percent}>{current} / {target}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 10 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 14, color: '#333', fontWeight: 'bold' },
  percent: { fontSize: 13, color: '#666' },
  track: { height: 10, backgroundColor: '#eee', borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 }
});