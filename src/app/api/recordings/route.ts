import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "לא מורשה" }, { status: 401 });
    }

    const recordings = await prisma.recording.findMany({
      where: {
        OR: [
          { client: { therapistId: session.user.id } },
          { session: { therapistId: session.user.id } },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true } },
        session: { select: { id: true, startTime: true } },
        transcription: {
          include: { analysis: true },
        },
      },
    });

    return NextResponse.json(recordings);
  } catch (error) {
    console.error("Get recordings error:", error);
    return NextResponse.json(
      { message: "אירעה שגיאה בטעינת ההקלטות" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "לא מורשה" }, { status: 401 });
    }

    const body = await request.json();
    const { audioData, mimeType, durationSeconds, type, clientId, sessionId } = body;

    if (!audioData || !durationSeconds) {
      return NextResponse.json(
        { message: "נתוני הקלטה חסרים" },
        { status: 400 }
      );
    }

    // Verify client/session ownership
    if (clientId) {
      const client = await prisma.client.findFirst({
        where: { id: clientId, therapistId: session.user.id },
      });
      if (!client) {
        return NextResponse.json({ message: "מטופל לא נמצא" }, { status: 404 });
      }
    }

    if (sessionId) {
      const therapySession = await prisma.therapySession.findFirst({
        where: { id: sessionId, therapistId: session.user.id },
      });
      if (!therapySession) {
        return NextResponse.json({ message: "פגישה לא נמצאה" }, { status: 404 });
      }
    }

    // Save audio file
    const fileExtension = mimeType?.includes("webm") ? "webm" : "mp3";
    const fileName = `${uuidv4()}.${fileExtension}`;
    const uploadsDir = join(process.cwd(), "uploads", "recordings");
    
    // Create directory if it doesn't exist
    await mkdir(uploadsDir, { recursive: true });
    
    const filePath = join(uploadsDir, fileName);
    const buffer = Buffer.from(audioData, "base64");
    await writeFile(filePath, buffer);

    // Create recording record
    const recording = await prisma.recording.create({
      data: {
        audioUrl: `/uploads/recordings/${fileName}`,
        durationSeconds,
        type: type || "SESSION",
        status: "PENDING",
        clientId: clientId || null,
        sessionId: sessionId || null,
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    });

    // Create task for transcription review
    if (clientId) {
      const client = await prisma.client.findUnique({ where: { id: clientId } });
      await prisma.task.create({
        data: {
          userId: session.user.id,
          type: "REVIEW_TRANSCRIPTION",
          title: `סקור תמלול הקלטה - ${client?.name}`,
          status: "PENDING",
          priority: "MEDIUM",
          relatedEntityId: recording.id,
          relatedEntity: "Recording",
        },
      });
    }

    return NextResponse.json(recording, { status: 201 });
  } catch (error) {
    console.error("Create recording error:", error);
    return NextResponse.json(
      { message: "אירעה שגיאה בשמירת ההקלטה" },
      { status: 500 }
    );
  }
}

