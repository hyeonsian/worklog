import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listCalendars } from "@/lib/caldav";

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
  try {
    await listCalendars({ serverUrl, username, password });
  } catch (e) {
    console.error("CalDAV connection test failed:", e);
    return NextResponse.json(
      {
        error:
          "iCloud 연결에 실패했습니다. Apple ID와 앱 전용 비밀번호를 확인해주세요.",
      },
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
