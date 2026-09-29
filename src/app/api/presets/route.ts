import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { CaptionStyle } from "@/types";

export async function GET() {
  const presets = await prisma.customPreset.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({
    presets: presets.map((p) => ({ id: p.id, name: p.name, style: JSON.parse(p.style) as CaptionStyle, createdAt: p.createdAt.toISOString() })),
  });
}

// Saves the currently-tuned CaptionStyle as a reusable, named preset -- not
// scoped to a project, so it shows up in every project's Style Gallery.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const name = (body.name as string | undefined)?.trim();
  const style = body.style as CaptionStyle | undefined;

  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  if (!style || typeof style !== "object") {
    return NextResponse.json({ error: "style is required." }, { status: 400 });
  }

  const created = await prisma.customPreset.create({ data: { name, style: JSON.stringify(style) } });
  return NextResponse.json(
    { preset: { id: created.id, name: created.name, style, createdAt: created.createdAt.toISOString() } },
    { status: 201 }
  );
}
