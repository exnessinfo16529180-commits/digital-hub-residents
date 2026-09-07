import Assessment from '@/components/assessment';
export const dynamic = 'force-dynamic';
export default function QuestionnairePage() {
  const ready = Boolean(process.env.GOOGLE_SHEETS_WEBHOOK_URL && process.env.GOOGLE_SHEETS_WEBHOOK_SECRET);
  return <Assessment collectionReady={ready}/>;
}
