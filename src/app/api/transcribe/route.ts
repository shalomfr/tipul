import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { transcribeAudio } from "@/lib/google-ai";
import { readFile } from "fs/promises";
import { join } from "path";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "לא מורשה" }, { status: 401 });
    }

    const body = await request.json();
    const { recordingId } = body;

    if (!recordingId) {
      return NextResponse.json(
        { message: "נא לספק מזהה הקלטה" },
        { status: 400 }
      );
    }

    // Get recording
    const recording = await prisma.recording.findFirst({
      where: {
        id: recordingId,
        OR: [
          { client: { therapistId: session.user.id } },
          { session: { therapistId: session.user.id } },
        ],
      },
    });

    if (!recording) {
      return NextResponse.json({ message: "הקלטה לא נמצאה" }, { status: 404 });
    }

    // Update status to transcribing
    await prisma.recording.update({
      where: { id: recordingId },
      data: { status: "TRANSCRIBING" },
    });

    try {
      // Read audio file
      const filePath = join(process.cwd(), recording.audioUrl);
      const audioBuffer = await readFile(filePath);
      const audioBase64 = audioBuffer.toString("base64");
      
      // Determine mime type
      const mimeType = recording.audioUrl.endsWith(".webm")
        ? "audio/webm"
        : "audio/mp3";

      // Transcribe with Google AI Studio
      const result = await transcribeAudio(audioBase64, mimeType);

      // Save transcription
      const transcription = await prisma.transcription.create({
        data: {
          recordingId,
          content: result.text,
          language: "he",
          confidence: result.confidence,
        },
      });

      // Update recording status
      await prisma.recording.update({
        where: { id: recordingId },
        data: { status: "TRANSCRIBED" },
      });

      return NextResponse.json(transcription, { status: 201 });
    } catch (transcriptionError) {
      console.error("Transcription failed:", transcriptionError);
      
      // Update status to error
      await prisma.recording.update({
        where: { id: recordingId },
        data: { status: "ERROR" },
      });

      return NextResponse.json(
        { message: "שגיאה בתמלול ההקלטה" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Transcribe error:", error);
    return NextResponse.json(
      { message: "אירעה שגיאה בתמלול" },
      { status: 500 }
    );
  }
}


