import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchEvents, createEvent } from "@/lib/caldav";

// GET: 특정 기간의 캘린더 이벤트 조회
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const startStr = searchParams.get("start");
  const endStr = searchParams.get("end");

  if (!startStr || !endStr) {
    return NextResponse.json(
      { error: "start, end 파라미터가 필요합니다." },
      { status: 400 }
    );
  }

  const settings = await prisma.calDAVSettings.findUnique({
    where: { userId: session.user.id },
  });

  if (!settings?.calendarUrl || !settings.enabled) {
    return NextResponse.json([]);
  }

  try {
    const events = await fetchEvents(
      {
        serverUrl: settings.serverUrl,
        username: settings.username,
        password: settings.password,
      },
      settings.calendarUrl,
      new Date(startStr),
      new Date(endStr),
      undefined // color will be set client-side
    );

    return NextResponse.json(events);
  } catch (e) {
    console.error("Failed to fetch events:", e);
    return NextResponse.json(
      { error: "이벤트를 가져오는데 실패했습니다." },
      { status: 500 }
    );
  }
}

// POST: 캘린더에 새 이벤트 생성
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.calDAVSettings.findUnique({
    where: { userId: session.user.id },
  });

  if (!settings?.calendarUrl || !settings.enabled) {
    return NextResponse.json(
      { error: "CalDAV 캘린더가 설정되지 않았습니다." },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { title, description, location, start, end, allDay } = body;

  if (!title || !start || !end) {
    return NextResponse.json(
      { error: "title, start, end가 필요합니다." },
      { status: 400 }
    );
  }

  try {
    const result = await createEvent(
      {
        serverUrl: settings.serverUrl,
        username: settings.username,
        password: settings.password,
      },
      settings.calendarUrl,
      { title, description, location, start, end, allDay }
    );

    return NextResponse.json(result);
  } catch (e) {
    console.error("Failed to create event:", e);
    return NextResponse.json(
      { error: "이벤트 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
