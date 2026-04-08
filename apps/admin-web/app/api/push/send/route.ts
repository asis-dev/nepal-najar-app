import { NextRequest, NextResponse } from 'next/server';
import { sendPushToAll } from '@/lib/push/send';

export const runtime = 'nodejs';
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET || '';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const { title, body, url, icon } = await req.json();
    if (!title || !body) return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    const result = await sendPushToAll({ title, body, url, icon });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
