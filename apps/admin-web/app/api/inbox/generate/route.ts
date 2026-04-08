import { NextResponse } from 'next/server';
import { generateInboxItems } from '@/lib/inbox/generator';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const result = await generateInboxItems();
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    console.error('[inbox/generate]', e);
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 });
  }
}
