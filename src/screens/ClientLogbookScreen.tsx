import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { theme } from '../constants/theme';
import { captureClientLogPhoto, getClientLogPhotoUrl, getClientLogs, saveClientLog, type ClientLog } from '../lib/clientLogbook';
import { getFreelancerBookings, type Booking } from '../lib/bookings';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'ClientLogbook'>;
type Draft = Pick<ClientLog, 'extension_style' | 'curl' | 'length_mm' | 'diameter_mm' | 'mapping_notes' | 'treatment_notes' | 'photo_path' | 'before_photo_path' | 'after_photo_path'>;
const emptyDraft: Draft = { extension_style: '', curl: '', length_mm: '', diameter_mm: '', mapping_notes: '', treatment_notes: '', photo_path: null, before_photo_path: null, after_photo_path: null };
const prohibitedDetails = /(?:\+?\d[\d ()-]{6,}\d)|(?:\b(?:account|acc)\s*(?:number|no\.?)?\s*[:#-]?\s*\d{4,}\b)/i;

export function ClientLogbookScreen({ navigation }: Props) {
  const [freelancerId, setFreelancerId] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [logs, setLogs] = useState<Record<string, ClientLog>>({});
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [beforePhotoUrl, setBeforePhotoUrl] = useState<string | null>(null);
  const [afterPhotoUrl, setAfterPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let mounted = true;
    void (async () => {
      if (!supabase) { if (mounted) { setError('Connect Supabase before using your logbook.'); setLoading(false); } return; }
      const { data } = await supabase.auth.getUser();
      if (!data.user) { navigation.replace('Welcome'); return; }
      const [bookingsResult, logsResult] = await Promise.all([getFreelancerBookings(data.user.id), getClientLogs(data.user.id)]);
      if (!mounted) return;
      if (bookingsResult.error || logsResult.error) setError(bookingsResult.error?.message ?? logsResult.error?.message ?? 'Unable to load your logbook.');
      setFreelancerId(data.user.id);
      setBookings(bookingsResult.bookings.filter((booking) => booking.status === 'completed'));
      setLogs(Object.fromEntries(logsResult.logs.map((log) => [log.booking_id, log])));
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [navigation]);

  const selectBooking = async (bookingId: string) => {
    setError(''); setNotice(''); setSelectedBookingId(bookingId);
    const existing = logs[bookingId];
    setDraft(existing ? {
      extension_style: existing.extension_style, curl: existing.curl, length_mm: existing.length_mm, diameter_mm: existing.diameter_mm,
      mapping_notes: existing.mapping_notes, treatment_notes: existing.treatment_notes, photo_path: existing.photo_path,
      before_photo_path: existing.before_photo_path, after_photo_path: existing.after_photo_path,
    } : emptyDraft);
    setBeforePhotoUrl(existing?.before_photo_path ? await getClientLogPhotoUrl(existing.before_photo_path) : null);
    setAfterPhotoUrl(existing?.after_photo_path ? await getClientLogPhotoUrl(existing.after_photo_path) : null);
  };

  const capturePhoto = async (phase: 'before' | 'after') => {
    if (!freelancerId || !selectedBookingId) return;
    setError(''); setNotice('');
    const result = await captureClientLogPhoto(freelancerId, selectedBookingId, phase);
    if (result.error) { setError(result.error.message); return; }
    if (result.photoPath) {
      setDraft((current) => ({ ...current, [`${phase}_photo_path`]: result.photoPath }));
      const url = await getClientLogPhotoUrl(result.photoPath);
      if (phase === 'before') setBeforePhotoUrl(url); else setAfterPhotoUrl(url);
    }
  };

  const save = async () => {
    if (!selectedBookingId) return;
    if (!draft.before_photo_path || !draft.after_photo_path) { setError('Capture both the before and after photos before saving this treatment log.'); return; }
    if (prohibitedDetails.test(draft.mapping_notes) || prohibitedDetails.test(draft.treatment_notes)) {
      setError('Notes cannot contain phone numbers or bank/account details.'); return;
    }
    setError(''); setNotice(''); setSaving(true);
    const result = await saveClientLog(freelancerId, { booking_id: selectedBookingId, ...draft });
    setSaving(false);
    if (result.error || !result.log) { setError(result.error?.message ?? 'Unable to save this treatment log.'); return; }
    setLogs((current) => ({ ...current, [selectedBookingId]: result.log! }));
    setNotice('Private treatment log saved.');
  };

  if (loading) return <View style={styles.loading}><Text style={styles.body}>Loading your private logbook…</Text></View>;
  const selectedBooking = bookings.find((booking) => booking.id === selectedBookingId);
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>PRIVATE PRACTICE RECORDS</Text>
      <Text style={styles.title}>Client treatment logbook</Text>
      <Text style={styles.body}>Keep extension details, measurements and required before-and-after camera photos for completed appointments. Client contact, address and payment details are never collected here.</Text>
      <Text style={styles.consent}>Get the client’s permission before capturing either photo.</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {!!notice && <Text style={styles.notice}>{notice}</Text>}
      {bookings.length === 0 ? <View style={styles.card}><Text style={styles.cardTitle}>No completed appointments yet</Text><Text style={styles.body}>Completed appointments will be available here for private treatment notes.</Text></View> : bookings.map((booking) => (
        <Pressable key={booking.id} style={[styles.card, selectedBookingId === booking.id && styles.selectedCard]} onPress={() => void selectBooking(booking.id)}>
          <Text style={styles.cardTitle}>{booking.service_name}</Text>
          <Text style={styles.meta}>{booking.scheduled_date} · {booking.start_time}–{booking.end_time}</Text>
          <Text style={styles.link}>{logs[booking.id] ? 'Open saved treatment log' : 'Create treatment log'}</Text>
        </Pressable>
      ))}
      {!!selectedBooking && <View style={styles.form}>
        <Text style={styles.formTitle}>{selectedBooking.service_name} treatment record</Text>
        <TextInput value={draft.extension_style} onChangeText={(value) => setDraft((current) => ({ ...current, extension_style: value }))} placeholder="Extension style (e.g. Classic, Hybrid)" placeholderTextColor={theme.colors.muted} style={styles.input} />
        <TextInput value={draft.curl} onChangeText={(value) => setDraft((current) => ({ ...current, curl: value }))} placeholder="Curl used (e.g. C, CC, D)" placeholderTextColor={theme.colors.muted} style={styles.input} />
        <TextInput value={draft.length_mm} onChangeText={(value) => setDraft((current) => ({ ...current, length_mm: value }))} placeholder="Lengths used in mm (e.g. 8–12)" placeholderTextColor={theme.colors.muted} style={styles.input} />
        <TextInput value={draft.diameter_mm} onChangeText={(value) => setDraft((current) => ({ ...current, diameter_mm: value }))} placeholder="Diameter used in mm (e.g. 0.07)" placeholderTextColor={theme.colors.muted} style={styles.input} />
        <TextInput value={draft.mapping_notes} onChangeText={(value) => setDraft((current) => ({ ...current, mapping_notes: value }))} placeholder="Mapping / application notes — no contact details" placeholderTextColor={theme.colors.muted} multiline style={[styles.input, styles.notes]} />
        <TextInput value={draft.treatment_notes} onChangeText={(value) => setDraft((current) => ({ ...current, treatment_notes: value }))} placeholder="Treatment notes — no phone or account details" placeholderTextColor={theme.colors.muted} multiline style={[styles.input, styles.notes]} />
        <Text style={styles.photoLabel}>Required treatment photos</Text>
        <View style={styles.photoActions}>
          <Pressable style={styles.photoButton} onPress={() => void capturePhoto('before')}><Text style={styles.photoButtonText}>{draft.before_photo_path ? 'Retake before photo' : 'Take before photo'}</Text></Pressable>
          <Pressable style={styles.photoButton} onPress={() => void capturePhoto('after')}><Text style={styles.photoButtonText}>{draft.after_photo_path ? 'Retake after photo' : 'Take after photo'}</Text></Pressable>
        </View>
        {(!!beforePhotoUrl || !!afterPhotoUrl) && <View style={styles.photoRow}>{beforePhotoUrl && <Image source={{ uri: beforePhotoUrl }} style={styles.photo} />}{afterPhotoUrl && <Image source={{ uri: afterPhotoUrl }} style={styles.photo} />}</View>}
        <Pressable style={styles.saveButton} disabled={saving} onPress={() => void save()}><Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save private log'}</Text></Pressable>
      </View>}
      <Pressable style={styles.backButton} onPress={() => navigation.goBack()}><Text style={styles.link}>Back to profile</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 }, loading: { alignItems: 'center', backgroundColor: theme.colors.cream, flex: 1, justifyContent: 'center', padding: 24 },
  eyebrow: { color: theme.colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.4, marginTop: 16 }, title: { color: theme.colors.ink, fontSize: 30, fontWeight: '800', lineHeight: 36, marginTop: 10 }, body: { color: theme.colors.muted, fontSize: 15, lineHeight: 22, marginTop: 10 }, consent: { color: theme.colors.accent, fontSize: 13, fontWeight: '700', lineHeight: 19, marginTop: 10 },
  error: { color: '#B42318', marginTop: 14 }, notice: { color: '#067647', fontWeight: '700', marginTop: 14 }, card: { backgroundColor: theme.colors.white, borderColor: theme.colors.border, borderRadius: 16, borderWidth: 1, marginTop: 16, padding: 16 }, selectedCard: { borderColor: theme.colors.accent, borderWidth: 2 }, cardTitle: { color: theme.colors.ink, fontSize: 17, fontWeight: '800' }, meta: { color: theme.colors.muted, marginTop: 5 }, link: { color: theme.colors.accent, fontWeight: '700', marginTop: 12 },
  form: { backgroundColor: theme.colors.white, borderColor: theme.colors.border, borderRadius: 16, borderWidth: 1, marginTop: 20, padding: 16 }, formTitle: { color: theme.colors.ink, fontSize: 18, fontWeight: '800', marginBottom: 12 }, input: { borderColor: theme.colors.border, borderRadius: 10, borderWidth: 1, color: theme.colors.ink, marginTop: 10, padding: 12 }, notes: { minHeight: 84, textAlignVertical: 'top' }, photoLabel: { color: theme.colors.ink, fontWeight: '800', marginTop: 18 }, photoActions: { gap: 10, marginTop: 10 }, photoButton: { borderColor: theme.colors.border, borderRadius: 10, borderWidth: 1, padding: 13 }, photoButtonText: { color: theme.colors.accent, fontWeight: '700', textAlign: 'center' }, photoRow: { flexDirection: 'row', gap: 10, marginTop: 12 }, photo: { borderRadius: 10, height: 145, flex: 1 }, saveButton: { backgroundColor: theme.colors.ink, borderRadius: 12, marginTop: 16, padding: 15 }, saveButtonText: { color: theme.colors.white, fontWeight: '700', textAlign: 'center' }, backButton: { borderColor: theme.colors.border, borderRadius: 12, borderWidth: 1, marginTop: 20, padding: 15 },
});
