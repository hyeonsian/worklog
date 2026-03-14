import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, done, dueDate, tagIds, priority } = body;

  const existing = await prisma.todo.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (tagIds !== undefined) {
    await prisma.todoTag.deleteMany({ where: { todoId: params.id } });
  }

  const todo = await prisma.todo.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined && { title }),
      ...(done !== undefined && { done }),
      ...(dueDate !== undefined && {
        dueDate: dueDate ? new Date(dueDate) : null,
      }),
      ...(priority !== undefined && { priority }),
      ...(tagIds !== undefined && tagIds.length > 0
        ? {
            tags: {
              create: tagIds.map((tagId: string) => ({
                tag: { connect: { id: tagId } },
              })),
            },
          }
        : {}),
    },
    include: {
      tags: {
        include: { tag: true },
      },
    },
  });

  return NextResponse.json(todo);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.todo.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.todo.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
