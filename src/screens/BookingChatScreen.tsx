import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { theme } from '../constants/theme';
import { getBookingMessages, sendBookingMessage, type BookingMessage } from '../lib/chat';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'BookingChat'>;

const previewMessages: BookingMessage[] = [
  {
    id: 'preview-message-1',
    booking_id: 'preview-booking-1',
    sender_id: 'preview-freelancer',
    body: 'Hi! I will bring the brown tint you requested.',
    created_at: '2026-09-17T08:00:00Z',
  },
  {
    id: 'preview-message-2',
    booking_id: 'preview-booking-1',
    sender_id: 'preview-customer',
    body: 'Thank you. See you tomorrow!',
    created_at: '2026-09-17T08:10:00Z',
  },
];

function formatCreatedAt(createdAt: string) {
  return new Date(createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export function BookingChatScreen({ navigation, route }: Props) {
  const isPreview = route.params?.preview ?? false;
  const [messages, setMessages] = useState<BookingMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [userId, setUserId] = useState('');
  const [loadError, setLoadError] = useState('');
  const [sendError, setSendError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadMessages = async () => {
      if (isPreview) {
        setMessages(previewMessages);
        setIsLoading(false);
        return;
      }
      if (!supabase) {
        setLoadError('Connect Supabase before opening booking chat.');
        setIsLoading(false);
        return;
      }

      const { data } = await supabase.auth.getUser();
      if (!isMounted) {
        return;
      }
      if (!data.user) {
        navigation.replace('Welcome');
        return;
      }
      setUserId(data.user.id);
      const result = await getBookingMessages(route.params.bookingId);
      if (!isMounted) {
        return;
      }
      if (result.error) {
        setLoadError(result.error.message);
      } else {
        setMessages(result.messages);
      }
      setIsLoading(false);
    };

    void loadMessages();
    return () => {
      isMounted = false;
    };
  }, [isPreview, navigation, route.params.bookingId]);

  const handleSend = async () => {
    const body = draft.trim();
    if (!body || isPreview || isSending) {
      return;
    }
    setSendError('');
    setIsSending(true);
    const result = await sendBookingMessage(route.params.bookingId, body);
    setIsSending(false);
    if (result.error || !result.message) {
      setSendError(result.error?.message ?? 'Unable to send this message.');
      return;
    }
    setMessages((current) => [...current, result.message!]);
    setDraft('');
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>{isPreview ? 'BOOKING CHAT PREVIEW' : 'BOOKING CHAT'}</Text>
      <Text style={styles.title}>{route.params.serviceName}</Text>
      <Text style={styles.subtitle}>
        {isPreview
          ? 'See how customers and freelancers can coordinate an appointment.'
          : 'Message the other person about this appointment.'}
      </Text>
      {!!loadError && <Text style={styles.errorText}>{loadError}</Text>}
      {!!sendError && <Text style={styles.errorText}>{sendError}</Text>}
      {isLoading ? (
        <Text style={styles.loadingText}>Loading messages…</Text>
      ) : (
        <View style={styles.messageList}>
          {messages.length === 0 && <Text style={styles.emptyText}>No messages yet. Start the conversation.</Text>}
          {messages.map((message) => (
            <View key={message.id} style={[styles.messageCard, message.sender_id === userId && styles.ownMessage]}>
              <Text style={styles.messageBody}>{message.body}</Text>
              <Text style={styles.messageDate}>{formatCreatedAt(message.created_at)}</Text>
            </View>
          ))}
        </View>
      )}
      {!isPreview && !loadError && (
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            editable={!isSending}
            maxLength={2000}
            multiline
            placeholder="Write a message"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
          />
          <Pressable
            style={styles.primaryButton}
            disabled={isSending || !draft.trim()}
            onPress={() => void handleSend()}
          >
            <Text style={styles.primaryButtonText}>{isSending ? 'Sending…' : 'Send message'}</Text>
          </Pressable>
        </View>
      )}
      <Pressable style={styles.secondaryButton} onPress={() => navigation.goBack()}>
        <Text style={styles.secondaryButtonText}>{isPreview ? 'Back to preview' : 'Back to bookings'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  container: { padding: 24 },
  eyebrow: { color: theme.colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginTop: 16 },
  title: { color: theme.colors.ink, fontSize: 30, fontWeight: '800', marginTop: 12 },
  subtitle: { color: theme.colors.muted, fontSize: 16, lineHeight: 24, marginTop: 10 },
  loadingText: { color: theme.colors.muted, marginTop: 24 },
  errorText: { color: '#B42318', fontSize: 13, marginTop: 16 },
  messageList: { gap: 12, marginTop: 24 },
  emptyText: { color: theme.colors.muted, marginTop: 24 },
  messageCard: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: '90%',
    padding: 14,
  },
  ownMessage: { alignSelf: 'flex-end', backgroundColor: theme.colors.blush },
  messageBody: { color: theme.colors.ink, fontSize: 16, lineHeight: 22 },
  messageDate: { color: theme.colors.muted, fontSize: 11, marginTop: 8 },
  composer: { marginTop: 24 },
  input: {
    backgroundColor: theme.colors.white,
    borderColor: theme.colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: theme.colors.ink,
    minHeight: 90,
    padding: 14,
    textAlignVertical: 'top',
  },
  primaryButton: { backgroundColor: theme.colors.ink, borderRadius: 14, marginTop: 12, padding: 16 },
  primaryButtonText: { color: theme.colors.white, fontWeight: '700', textAlign: 'center' },
  secondaryButton: { borderColor: theme.colors.border, borderRadius: 14, borderWidth: 1, marginTop: 16, padding: 15 },
  secondaryButtonText: { color: theme.colors.accent, fontWeight: '700', textAlign: 'center' },
});
