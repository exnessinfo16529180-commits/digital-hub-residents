import { handleSubmission } from '@/lib/submission-handler';
export const runtime='nodejs';
export const maxDuration=30;
export async function POST(request:Request){return handleSubmission(request,{url:process.env.GOOGLE_SHEETS_WEBHOOK_URL,secret:process.env.GOOGLE_SHEETS_WEBHOOK_SECRET});}
