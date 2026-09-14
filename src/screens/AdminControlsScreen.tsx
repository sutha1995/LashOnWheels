import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../constants/theme';
import {
  getAdminAccounts,
  getAdminVerificationDocuments,
  getAdminMetrics,
  getAdminServices,
  setAccountSuspension,
  setFreelancerVerification,
  setServiceActive,
  type AdminAccount,
  type AdminMetrics,
  type AdminService,
} from '../lib/admin';
import { getVerificationDocumentUrl, type VerificationDocument } from '../lib/verificationDocuments';

export function AdminControlsScreen() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [services, setServices] = useState<AdminService[]>([]);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [documentsByFreelancer, setDocumentsByFreelancer] = useState<Record<string, VerificationDocument[]>>({});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    const [accountsResult, servicesResult, metricsResult] = await Promise.all([getAdminAccounts(), getAdminServices(), getAdminMetrics()]);
    setAccounts(accountsResult.accounts);
    setServices(servicesResult.services);
    setMetrics(metricsResult.metrics);
    setError(accountsResult.error?.message ?? servicesResult.error?.message ?? metricsResult.error?.message ?? '');
    const documentResults = await Promise.all(accountsResult.accounts.filter((account) => account.requested_role === 'freelancer').map(async (account) => [account.id, await getAdminVerificationDocuments(account.id)] as const));
    setDocumentsByFreelancer(Object.fromEntries(documentResults.map(([id, result]) => [id, result.documents])));
    setIsLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const update = async (action: () => Promise<{ error: Error | null }>) => {
    setError('');
    const { error: actionError } = await action();
    if (actionError) { setError(actionError.message); return; }
    await load();
  };

  const viewDocument = async (document: VerificationDocument) => {
    const result = await getVerificationDocumentUrl(document.storage_path);
    if (result.error || !result.url) { setError(result.error?.message ?? 'Unable to open this verification document.'); return; }
    await Linking.openURL(result.url);
  };

  if (isLoading) return <View style={styles.loading}><Text style={styles.muted}>Loading admin controls…</Text></View>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>ADMIN CONTROLS</Text>
      <Text style={styles.title}>Platform operations</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.metrics}>
        <Metric label="Accounts" value={metrics?.users_count ?? 0} />
        <Metric label="Pending verification" value={metrics?.freelancers_pending ?? 0} />
        <Metric label="Bookings" value={metrics?.bookings_count ?? 0} />
        <Metric label="Paid booking value" value={`RM${Number(metrics?.gross_booking_value ?? 0).toFixed(2)}`} />
      </View>
      <Text style={styles.section}>Freelancer verification and accounts</Text>
      {accounts.map((account) => (
        <View style={styles.card} key={account.id}>
          <Text style={styles.cardTitle}>{account.full_name || 'Unnamed account'}</Text>
          <Text style={styles.muted}>{account.requested_role} · {account.suspended_at ? 'Suspended' : 'Active'}</Text>
          {account.requested_role === 'freelancer' && (
            <>
              <View style={styles.actionRow}>
                <Text style={styles.status}>Verification: {account.verification_status ?? 'pending'}</Text>
                <Pressable style={styles.smallButton} onPress={() => void update(() => setFreelancerVerification(account.id, 'approved'))}><Text style={styles.smallButtonText}>Approve</Text></Pressable>
                <Pressable style={styles.outlineButton} onPress={() => void update(() => setFreelancerVerification(account.id, 'rejected'))}><Text style={styles.outlineButtonText}>Reject</Text></Pressable>
              </View>
              <Text style={styles.documentStatus}>IC: {documentsByFreelancer[account.id]?.some((document) => document.document_type === 'government_id') ? 'uploaded' : 'missing'} · Certificate: {documentsByFreelancer[account.id]?.some((document) => document.document_type === 'certificate') ? 'uploaded' : 'missing'}</Text>
              {documentsByFreelancer[account.id]?.map((document) => <Pressable key={document.id} style={styles.documentButton} onPress={() => void viewDocument(document)}><Text style={styles.outlineButtonText}>View {document.document_type === 'government_id' ? 'IC' : 'certificate'}</Text></Pressable>)}
            </>
          )}
          <Pressable style={styles.outlineButton} onPress={() => void update(() => setAccountSuspension(account.id, !account.suspended_at))}>
            <Text style={styles.outlineButtonText}>{account.suspended_at ? 'Restore account' : 'Suspend account'}</Text>
          </Pressable>
        </View>
      ))}
      <Text style={styles.section}>Service management</Text>
      {services.map((service) => (
        <View style={styles.card} key={service.id}>
          <Text style={styles.cardTitle}>{service.name}</Text>
          <Text style={styles.muted}>RM{Number(service.base_price).toFixed(2)} · {service.duration_minutes} min · {service.active ? 'Published' : 'Hidden'}</Text>
          <Pressable style={styles.outlineButton} onPress={() => void update(() => setServiceActive(service.id, !service.active))}>
            <Text style={styles.outlineButtonText}>{service.active ? 'Hide service' : 'Publish service'}</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 48 }, loading: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  eyebrow: { color: theme.colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginTop: 16 },
  title: { color: theme.colors.ink, fontSize: 30, fontWeight: '800', marginTop: 10 }, section: { color: theme.colors.ink, fontSize: 18, fontWeight: '800', marginTop: 26 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 }, metric: { backgroundColor: theme.colors.white, borderColor: theme.colors.border, borderRadius: 12, borderWidth: 1, flexGrow: 1, minWidth: '45%', padding: 14 },
  metricValue: { color: theme.colors.ink, fontSize: 18, fontWeight: '800' }, metricLabel: { color: theme.colors.muted, fontSize: 12, marginTop: 4 },
  card: { backgroundColor: theme.colors.white, borderColor: theme.colors.border, borderRadius: 14, borderWidth: 1, marginTop: 10, padding: 14 }, cardTitle: { color: theme.colors.ink, fontSize: 16, fontWeight: '800' },
  muted: { color: theme.colors.muted, marginTop: 5 }, status: { color: theme.colors.accent, fontSize: 13, fontWeight: '700', marginRight: 'auto' }, actionRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  smallButton: { backgroundColor: theme.colors.ink, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 }, smallButtonText: { color: theme.colors.white, fontWeight: '700' },
  documentStatus: { color: theme.colors.muted, fontSize: 12, marginTop: 12 }, documentButton: { borderColor: theme.colors.border, borderRadius: 8, borderWidth: 1, marginTop: 8, padding: 10 },
  outlineButton: { borderColor: theme.colors.border, borderRadius: 8, borderWidth: 1, marginTop: 10, padding: 10 }, outlineButtonText: { color: theme.colors.accent, fontWeight: '700', textAlign: 'center' }, error: { color: '#B42318', marginTop: 12 },
});
