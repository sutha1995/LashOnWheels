import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { theme } from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'TermsConditions'>;
const Section = ({ title, children }: { title: string; children: string }) => <><Text style={styles.heading}>{title}</Text><Text style={styles.body}>{children}</Text></>;

export function TermsConditionsScreen({ navigation }: Props) {
  return <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.title}>Terms and Conditions</Text>
    <Text style={styles.updated}>Last updated: 14 October 2026</Text>
    <Text style={styles.body}>These terms govern Lash On Wheels, a marketplace that helps customers discover and book independent mobile lash technicians. By creating an account, booking, or offering services, you agree to them.</Text>
    <Section title="1. Marketplace role" children="Lash On Wheels provides the platform, account tools, booking records, and support flow. Freelancers are independent service providers, not employees, agents, or partners of Lash On Wheels. Each freelancer is responsible for their own qualifications, services, conduct, insurance, tax, and legal obligations." />
    <Section title="2. Customer bookings" children="Customers must provide accurate booking, location, and treatment information; attend or cancel according to the booking options shown; and pay applicable service and travel fees through the approved payment flow. A freelancer may accept, decline, stop, or reschedule a request where availability, safety, or service suitability requires it." />
    <Section title="3. Safety and treatment consent" children="Lash services are cosmetic services, not medical care. Customers must disclose relevant allergies, medications, prior reactions, or changes that may affect treatment, and should seek qualified medical advice where appropriate. Freelancers must review disclosed information, follow safe professional practice, and not provide medical advice." />
    <Section title="4. Photos and client records" children="Freelancers may keep private before-and-after treatment records only with the customer’s permission and only for legitimate service, safety, and record-keeping purposes. They must not publish, sell, or share client images or records without separate appropriate consent." />
    <Section title="5. Conduct and privacy" children="All users must act respectfully, lawfully, and without harassment, fraud, discrimination, unsafe conduct, or misuse of another person’s data. Do not exchange bank details, personal contact details, or payment instructions through the platform. Health details are collected only with explicit consent and restricted to the relevant appointment." />
    <Section title="6. Cancellations, disputes, and support" children="Use the in-app cancellation, rescheduling, review, and support options. We may investigate reports, restrict access, or take action where there is a safety, fraud, or policy concern. For complex cases, submit a support ticket so the platform can review the matter." />
    <Section title="7. Platform limits" children="To the maximum extent permitted by applicable law, Lash On Wheels does not guarantee any freelancer’s availability, service outcome, or suitability. Nothing in these terms excludes rights or liabilities that cannot lawfully be excluded. Users remain responsible for decisions, conduct, and arrangements made in connection with a booking." />
    <Section title="8. Changes and contact" children="We may update these terms as the service develops. Continued use after an updated version takes effect means acceptance of the updated terms. Questions or reports can be submitted through in-app support or sent to info@astramartechlab.com." />
    <Text style={styles.note}>This is a practical product terms draft, not legal advice. Have a qualified Malaysian lawyer review it before public launch.</Text>
    <Pressable style={styles.button} onPress={() => navigation.goBack()}><Text style={styles.buttonText}>Back</Text></Pressable>
  </ScrollView>;
}

const styles = StyleSheet.create({ container: { padding: 24, paddingBottom: 48 }, title: { color: theme.colors.ink, fontSize: 30, fontWeight: '800', marginTop: 12 }, updated: { color: theme.colors.muted, marginTop: 6 }, heading: { color: theme.colors.ink, fontSize: 17, fontWeight: '800', marginTop: 22 }, body: { color: theme.colors.muted, fontSize: 15, lineHeight: 22, marginTop: 8 }, note: { color: theme.colors.accent, fontSize: 13, fontWeight: '700', lineHeight: 19, marginTop: 24 }, button: { backgroundColor: theme.colors.ink, borderRadius: 14, marginTop: 24, padding: 16 }, buttonText: { color: theme.colors.white, fontWeight: '700', textAlign: 'center' } });
