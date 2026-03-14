import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listCalendars } from "@/lib/caldav";

// Vercel serverless function timeout (iCloud CalDAV discovery can be slow)
export const maxDuration = 30;

// GET: 현재 CalDAV 설정 조회
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.calDAVSettings.findUnique({
    where: { userId: session.user.id },
  });

  if (!settings) return NextResponse.json(null);

  // Don't expose the password to the client
  return NextResponse.json({
    id: settings.id,
    serverUrl: settings.serverUrl,
    username: settings.username,
    calendarUrl: settings.calendarUrl,
    calendarName: settings.calendarName,
    enabled: settings.enabled,
    hasPassword: !!settings.password,
  });
}

// POST: CalDAV 설정 저장 (연결 테스트 포함)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      serverUrl = "https://caldav.icloud.com",
      username,
      password,
      calendarUrl,
      calendarName,
      enabled = true,
    } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Apple ID와 앱 전용 비밀번호를 입력해주세요." },
        { status: 400 }
      );
    }

    // Test connection first
    console.log("[CalDAV] Testing connection for:", username, "server:", serverUrl);
    try {
      const calendars = await listCalendars({ serverUrl, username, password });
      console.log("[CalDAV] Connection success, found", calendars.length, "calendars");
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error("[CalDAV] Connection test failed:", errMsg);
      return NextResponse.json(
        { error: `iCloud 연결 실패: ${errMsg}` },
        { status: 400 }
      );
    }

    const settings = await prisma.calDAVSettings.upsert({
      where: { userId: session.user.id },
      update: {
        serverUrl,
        username,
        password,
        calendarUrl: calendarUrl || null,
        calendarName: calendarName || null,
        enabled,
      },
      create: {
        userId: session.user.id,
        serverUrl,
        username,
        password,
        calendarUrl: calendarUrl || null,
        calendarName: calendarName || null,
        enabled,
      },
    });

    return NextResponse.json({
      id: settings.id,
      serverUrl: settings.serverUrl,
      username: settings.username,
      calendarUrl: settings.calendarUrl,
      calendarName: settings.calendarName,
      enabled: settings.enabled,
      hasPassword: true,
    });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error("[CalDAV] POST handler crash:", errMsg);
    return NextResponse.json(
      { error: `서버 오류: ${errMsg}` },
      { status: 500 }
    );
  }
}

// PATCH: 캘린더 선택만 변경 (연결 테스트 없이)
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { calendarUrl, calendarName } = body;

  const settings = await prisma.calDAVSettings.update({
    where: { userId: session.user.id },
    data: {
      calendarUrl: calendarUrl || null,
      calendarName: calendarName || null,
    },
  });

  return NextResponse.json({
    id: settings.id,
    serverUrl: settings.serverUrl,
    username: settings.username,
    calendarUrl: settings.calendarUrl,
    calendarName: settings.calendarName,
    enabled: settings.enabled,
    hasPassword: true,
  });
}

// DELETE: CalDAV 설정 삭제
export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.calDAVSettings.deleteMany({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
