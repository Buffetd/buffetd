import { NextResponse } from 'next/server'

export const GET = (): NextResponse => {
  return NextResponse.json({
    message: 'Enjoy your meal from buffetd API! 🍽️',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    environment: process.env.APP_ENV || process.env.NODE_ENV || 'development',
    uptime: process.uptime().toFixed(2),
  })
}
