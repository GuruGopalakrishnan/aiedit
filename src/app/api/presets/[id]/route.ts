import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.customPreset.delete({ where: { id } }).catch(() => null);
  await prisma.favorite.delete({ where: { presetId: id } }).catch(() => null);
  return NextResponse.json({ success: true });
}
