import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeProject } from "@/lib/serializers";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if (typeof body.text === "string") data.text = body.text;
  if (Array.isArray(body.highlightedWords)) data.highlightedWords = JSON.stringify(body.highlightedWords);
  if (body.styleOverrides && typeof body.styleOverrides === "object") {
    data.styleOverrides = JSON.stringify(body.styleOverrides);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const caption = await prisma.caption.findUnique({ where: { id } });
  if (!caption) {
    return NextResponse.json({ error: "Caption not found." }, { status: 404 });
  }

  await prisma.caption.update({ where: { id }, data });

  const project = await prisma.project.findUniqueOrThrow({
    where: { id: caption.projectId },
    include: { video: true, transcript: true, captions: true },
  });

  return NextResponse.json({ project: serializeProject(project) });
}
