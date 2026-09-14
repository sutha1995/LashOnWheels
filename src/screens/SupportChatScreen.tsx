import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '../constants/theme';
import { askSupportAssistant } from '../lib/ai';
import { createSupportTicket } from '../lib/supportTickets';

type Message = { id: number; sender: 'assistant' | 'user'; text: string };
export function SupportChatScreen() {
  const [question, setQuestion] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [ticketStatus, setTicketStatus] = useState('');
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, sender: 'assistant', text: 'Hi! I can help with bookings, travel fees, freelancer onboarding, services, availability, and notifications. What would you like to know?' },
  ]);

  const sendQuestion = async () => {
    const text = question.trim();
    if (!text || isSending) return;
    setError('');
    setQuestion('');
    setMessages((current) => [...current, { id: Date.now(), sender: 'user', text }]);
    setIsSending(true);
    const result = await askSupportAssistant(text);
    setIsSending(false);
    if (result.error || !result.answer) {
      setError(result.error?.message ?? "I couldn't answer that right now. Create a support ticket and our team can help.");
      return;
    }
    setMessages((current) => [...current, { id: Date.now() + 1, sender: 'assistant', text: result.answer }]);
  };

  const createTicket = async () => {
    const latestUserMessage = [...messages].reverse().find((message) => message.sender === 'user');
    if (!latestUserMessage || isCreatingTicket) {
      setError('Ask a question first, then create a ticket if you still need help.');
      return;
    }
    setError('');
    setTicketStatus('');
    setIsCreatingTicket(true);
    const result = await createSupportTicket(
      latestUserMessage.text,
      messages.map(({ sender, text }) => ({ sender, text })),
    );
    setIsCreatingTicket(false);
    if (result.error || !result.ticketId) {
      setError(result.error?.message ?? 'Unable to create a support ticket.');
      return;
    }
    setTicketStatus(`Ticket created: ${result.ticketId.slice(0, 8).toUpperCase()}. Our support team will review it.`);
  };

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>AI support can explain how Lash On Wheels works. If your issue needs a person, create a ticket below.</Text>
        {messages.map((message) => (
          <View key={message.id} style={[styles.message, message.sender === 'user' ? styles.userMessage : styles.assistantMessage]}>
            <Text style={[styles.messageText, message.sender === 'user' && styles.userMessageText]}>{message.text}</Text>
          </View>
        ))}
        {!!error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>
      <View style={styles.composer}>
        <TextInput value={question} onChangeText={setQuestion} placeholder="Ask about Lash On Wheels" multiline style={styles.input} />
        <Pressable style={[styles.sendButton, isSending && styles.disabled]} disabled={isSending} onPress={() => void sendQuestion()}>
          <Text style={styles.sendText}>{isSending ? 'Thinking…' : 'Send'}</Text>
        </Pressable>
        {!!ticketStatus && <Text style={styles.ticketStatus}>{ticketStatus}</Text>}
        <Pressable style={[styles.ticketButton, isCreatingTicket && styles.disabled]} disabled={isCreatingTicket} onPress={() => void createTicket()}>
          <Text style={styles.ticketButtonText}>{isCreatingTicket ? 'Creating ticket…' : 'Create support ticket'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  messages: { gap: 12, padding: 20 },
  intro: { color: theme.colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 4 },
  message: { borderRadius: 16, maxWidth: '88%', padding: 14 },
  assistantMessage: { alignSelf: 'flex-start', backgroundColor: theme.colors.white, borderColor: theme.colors.border, borderWidth: 1 },
  userMessage: { alignSelf: 'flex-end', backgroundColor: theme.colors.ink },
  messageText: { color: theme.colors.ink, lineHeight: 20 },
  userMessageText: { color: theme.colors.white },
  composer: { backgroundColor: theme.colors.white, borderTopColor: theme.colors.border, borderTopWidth: 1, padding: 16 },
  input: { borderColor: theme.colors.border, borderRadius: 12, borderWidth: 1, color: theme.colors.ink, minHeight: 52, padding: 12, textAlignVertical: 'top' },
  sendButton: { backgroundColor: theme.colors.ink, borderRadius: 12, marginTop: 10, padding: 14 },
  sendText: { color: theme.colors.white, fontWeight: '700', textAlign: 'center' },
  disabled: { opacity: 0.6 },
  ticketStatus: { color: '#067647', fontSize: 13, marginTop: 12, textAlign: 'center' },
  ticketButton: { borderColor: theme.colors.ink, borderRadius: 12, borderWidth: 1, marginTop: 12, padding: 13 },
  ticketButtonText: { color: theme.colors.ink, fontWeight: '700', textAlign: 'center' },
  errorText: { color: '#B42318', textAlign: 'center' },
});
