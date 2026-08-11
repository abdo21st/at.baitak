import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ success: true, projects: [] });
}

export async function POST() {
  return NextResponse.json({ success: true });
}
