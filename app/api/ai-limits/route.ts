import { NextResponse } from 'next/server'
import { RATE_LIMIT } from '@/lib/rateLimitConfig'

export function GET() {
  return NextResponse.json(Object.fromEntries([
    ['study', RATE_LIMIT.ai['study-assist']], ['coach', RATE_LIMIT.ai.tutor],
    ['generate', RATE_LIMIT.ai.generate], ['planner', RATE_LIMIT.ai.planner],
  ].map(([key, value]) => { const limit = value as typeof RATE_LIMIT.ai.tutor; return [key, { perMinute: limit.sessionMinute, perDay: limit.sessionDaily }] })), { headers: { 'Cache-Control': 'no-store' } })
}
