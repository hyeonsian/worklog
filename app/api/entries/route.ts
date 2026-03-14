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
  const type = searchParams.get("type");
  const date = searchParams.get("date");
  const search = searchParams.get("search");
  const tags = searchParams.get("tags");

  const where: Record<string, unknown> = {
    userId: session.user.id,
  };

  if (type) {
    where.type = type;
  }

  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    where.date = {
      gte: startOfDay,
      lte: endOfDay,
    };
  }

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { content: { contains: search } },
    ];
  }

  if (tags) {
    const tagNames = tags.split(",");
    where.tags = {
      some: {
        tag: {
          name: { in: tagNames },
        },
      },
    };
  }

  const entries = await prisma.entry.findMany({
    where,
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(entries);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, content, type, date, tagIds } = body;

  if (!title || !type || !date) {
    return NextResponse.json(
      { error: "title, type, date are required" },
      { status: 400 }
    );
  }

  const entry = await prisma.entry.create({
    data: {
      title,
      content: content || "",
      type,
      date: new Date(date),
      userId: session.user.id,
      tags: tagIds?.length
        ? {
            create: tagIds.map((tagId: string) => ({
              tag: { connect: { id: tagId } },
            })),
          }
        : undefined,
    },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
