import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const weekStart = searchParams.get("weekStart");
  const weekEnd = searchParams.get("weekEnd");

  const where: Record<string, unknown> = { userId: session.user.id };

  if (weekStart && weekEnd) {
    const start = new Date(weekStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(weekEnd);
    end.setHours(23, 59, 59, 999);
    where.date = { gte: start, lte: end };
  }

  const cards = await prisma.dailyCard.findMany({
    where,
    include: { tags: { include: { tag: true } } },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(cards);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, content, slot, date, startTime, endTime, tagIds } = body;

  if (!title || !slot || !date) {
    return NextResponse.json(
      { error: "title, slot, date are required" },
      { status: 400 }
    );
  }

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  const maxOrderCard = await prisma.dailyCard.findFirst({
    where: { userId: session.user.id, slot, date: { gte: start, lte: end } },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const nextOrder = maxOrderCard ? maxOrderCard.order + 1 : 0;

  const card = await prisma.dailyCard.create({
    data: {
      title,
      content: content || "",
      slot,
      date: new Date(date),
      startTime: startTime || null,
      endTime: endTime || null,
      order: nextOrder,
      userId: session.user.id,
      tags: tagIds?.length
        ? { create: tagIds.map((tagId: string) => ({ tag: { connect: { id: tagId } } })) }
        : undefined,
    },
    include: { tags: { include: { tag: true } } },
  });

  return NextResponse.json(card, { status: 201 });
}
