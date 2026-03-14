import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { orders } = body as { orders: { id: string; order: number }[] };

  if (!Array.isArray(orders) || orders.length === 0) {
    return NextResponse.json({ error: "orders array required" }, { status: 400 });
  }

  await prisma.$transaction(
    orders.map(({ id, order }) =>
      prisma.dailyCard.updateMany({
        where: { id, userId: session.user.id },
        data: { order },
      })
    )
  );

  return NextResponse.json({ success: true });
}
