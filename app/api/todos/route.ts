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
  const done = searchParams.get("done");
  const tags = searchParams.get("tags");

  const where: Record<string, unknown> = {
    userId: session.user.id,
  };

  if (done !== null) {
    where.done = done === "true";
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

  const todos = await prisma.todo.findMany({
    where,
    include: {
      tags: {
        include: { tag: true },
      },
    },
    orderBy: [{ done: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(todos);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, dueDate, tagIds } = body;

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const todo = await prisma.todo.create({
    data: {
      title,
      dueDate: dueDate ? new Date(dueDate) : undefined,
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
        include: { tag: true },
      },
    },
  });

  return NextResponse.json(todo, { status: 201 });
}
