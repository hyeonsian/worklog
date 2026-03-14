import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/daily-reflections?weekStart=yyyy-MM-dd&weekEnd=yyyy-MM-dd
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const weekStart = request.nextUrl.searchParams.get("weekStart");
  const weekEnd   = request.nextUrl.searchParams.get("weekEnd");

  // dateStr 문자열 범위 비교 ("2024-03-11" <= dateStr <= "2024-03-17")
  const where: Record<string, unknown> = { userId: session.user.id };
  if (weekStart && weekEnd) {
    where.dateStr = { gte: weekStart, lte: weekEnd };
  }

  const reflections = await prisma.dailyReflection.findMany({ where });
  return NextResponse.json(reflections);
}

// POST /api/daily-reflections  { date: "yyyy-MM-dd", content }
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { date, content } = await request.json();
    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    // dateStr은 "yyyy-MM-dd" 문자열 그대로 저장
    const dateStr: string = date;

    const existing = await prisma.dailyReflection.findFirst({
      where: { userId: session.user.id, dateStr },
    });

    let reflection;
    if (existing) {
      reflection = await prisma.dailyReflection.update({
        where: { id: existing.id },
        data: { content: content ?? "" },
      });
    } else {
      reflection = await prisma.dailyReflection.create({
        data: { dateStr, content: content ?? "", userId: session.user.id },
      });
    }

    return NextResponse.json(reflection);
  } catch (e) {
    console.error("[daily-reflections POST]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
