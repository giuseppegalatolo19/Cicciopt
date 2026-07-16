import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok", timezone: "Europe/Rome", timestamp: new Date().toISOString() });
}
