import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function NutritionCard({ title, value, unit, color = '#333' }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.value, { color }]}>{value} <Text style={styles.unit}>{unit}</Text></Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 12, alignItems: 'center', flex: 1, margin: 5, borderWidth: 1, borderColor: '#eee' },
  title: { fontSize: 12, color: '#666', marginBottom: 4 },
  value: { fontSize: 16, fontWeight: 'bold' },
  unit: { fontSize: 12, fontWeight: 'normal' }
});