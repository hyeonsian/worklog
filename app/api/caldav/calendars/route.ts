import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listCalendars } from "@/lib/caldav";

// GET: CalDAV 캘린더 목록 조회
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.calDAVSettings.findUnique({
    where: { userId: session.user.id },
  });

  if (!settings) {
    return NextResponse.json(
      { error: "CalDAV 설정이 없습니다." },
      { status: 404 }
    );
  }

  try {
    const calendars = await listCalendars({
      serverUrl: settings.serverUrl,
      username: settings.username,
      password: settings.password,
    });

    return NextResponse.json(calendars);
  } catch (e) {
    console.error("Failed to list calendars:", e);
    return NextResponse.json(
      { error: "캘린더 목록을 가져오는데 실패했습니다." },
      { status: 500 }
    );
  }
}
