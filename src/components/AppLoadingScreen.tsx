import { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import logo from '../../assets/lash-on-wheels-logo.png';
import { theme } from '../constants/theme';

type Props = { error?: string; onRetry?: () => void; onSignIn?: () => void };

export function AppLoadingScreen({ error, onRetry, onSignIn }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.72)).current;
  useEffect(() => {
    if (error) return;
    const animation = Animated.loop(Animated.parallel([
      Animated.sequence([Animated.timing(scale, { toValue: 1.07, duration: 850, useNativeDriver: true }), Animated.timing(scale, { toValue: 1, duration: 850, useNativeDriver: true })]),
      Animated.sequence([Animated.timing(opacity, { toValue: 1, duration: 850, useNativeDriver: true }), Animated.timing(opacity, { toValue: 0.72, duration: 850, useNativeDriver: true })]),
    ]));
    animation.start();
    return () => animation.stop();
  }, [error, opacity, scale]);
  return <View style={styles.container}>
    <Animated.View style={[styles.logoHalo, { opacity, transform: [{ scale }] }]}><Image source={logo} resizeMode="contain" style={styles.logo} /></Animated.View>
    <Text style={styles.title}>Lash On Wheels</Text>
    {error ? <>
      <Text style={styles.errorTitle}>We couldn’t finish loading</Text>
      <Text style={styles.body}>{error}</Text>
      {!!onRetry && <Pressable style={styles.primaryButton} onPress={onRetry}><Text style={styles.primaryText}>Try again</Text></Pressable>}
      {!!onSignIn && <Pressable style={styles.secondaryButton} onPress={onSignIn}><Text style={styles.secondaryText}>Back to sign in</Text></Pressable>}
    </> : <>
      <Text style={styles.body}>Getting your beauty experience ready…</Text>
      <Text style={styles.tagline}>ELEVATING YOUR ARTISTRY</Text>
    </>}
  </View>;
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', backgroundColor: theme.colors.blush, flex: 1, justifyContent: 'center', padding: 28 },
  logoHalo: { alignItems: 'center', backgroundColor: '#FCECF5', borderRadius: 104, elevation: 5, height: 208, justifyContent: 'center', shadowColor: '#5B3A4C', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 18, width: 208 },
  logo: { height: 152, width: 152 }, title: { color: theme.colors.ink, fontSize: 26, fontWeight: '800', marginTop: 28 }, body: { color: theme.colors.muted, fontSize: 15, lineHeight: 22, marginTop: 12, maxWidth: 310, textAlign: 'center' }, tagline: { color: theme.colors.ink, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginTop: 78 },
  errorTitle: { color: theme.colors.ink, fontSize: 19, fontWeight: '800', marginTop: 28 }, primaryButton: { backgroundColor: theme.colors.ink, borderRadius: 14, marginTop: 24, padding: 16, width: '100%' }, primaryText: { color: theme.colors.white, fontWeight: '700', textAlign: 'center' }, secondaryButton: { borderColor: theme.colors.border, borderRadius: 14, borderWidth: 1, marginTop: 12, padding: 16, width: '100%' }, secondaryText: { color: theme.colors.accent, fontWeight: '700', textAlign: 'center' },
});
