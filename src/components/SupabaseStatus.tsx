import { StyleSheet, Text, View } from 'react-native';
import { hasSupabaseConfig } from '../lib/env';
import { theme } from '../constants/theme';

export function SupabaseStatus() {
  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: hasSupabaseConfig ? theme.colors.success : theme.colors.accent }]} />
      <Text style={styles.text}>
        {hasSupabaseConfig ? 'Cloud services connected' : 'Demo mode · cloud setup pending'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  text: { color: theme.colors.muted, fontSize: 13 },
});
