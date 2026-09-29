import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const favorites = await prisma.favorite.findMany();
  return NextResponse.json({ presetIds: favorites.map((f) => f.presetId) });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const presetId = body.presetId as string | undefined;
  if (!presetId) {
    return NextResponse.json({ error: "presetId is required." }, { status: 400 });
  }
  await prisma.favorite.upsert({ where: { presetId }, create: { presetId }, update: {} });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const presetId = body.presetId as string | undefined;
  if (!presetId) {
    return NextResponse.json({ error: "presetId is required." }, { status: 400 });
  }
  await prisma.favorite.delete({ where: { presetId } }).catch(() => null);
  return NextResponse.json({ success: true });
}
