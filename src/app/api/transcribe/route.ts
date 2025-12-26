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
      // Check if API key is configured
      if (!process.env.GOOGLE_AI_API_KEY) {
        console.error("GOOGLE_AI_API_KEY is not set");
        throw new Error("API key not configured");
      }

      // Read audio file - remove leading slash if present
      const relativePath = recording.audioUrl.startsWith('/') 
        ? recording.audioUrl.slice(1) 
        : recording.audioUrl;
      
      // Use persistent disk on Render, fallback to local for development
      let filePath: string;
      if (process.env.UPLOADS_DIR) {
        // On Render with persistent disk
        // audioUrl is like: /uploads/recordings/xxx.webm
        // We need: /var/data/uploads/recordings/xxx.webm
        filePath = join(process.env.UPLOADS_DIR, relativePath.replace('uploads/', ''));
      } else {
        // Local development
        filePath = join(process.cwd(), relativePath);
      }
      
      console.log("Audio URL:", recording.audioUrl);
      console.log("UPLOADS_DIR:", process.env.UPLOADS_DIR);
      console.log("Attempting to read file from:", filePath);
      
      const audioBuffer = await readFile(filePath);
      console.log("File read successfully, size:", audioBuffer.length);
      
      const audioBase64 = audioBuffer.toString("base64");
      
      // Determine mime type
      const mimeType = recording.audioUrl.endsWith(".webm")
        ? "audio/webm"
        : recording.audioUrl.endsWith(".ogg")
        ? "audio/ogg"
        : "audio/mpeg";

      console.log("Calling Google AI with mimeType:", mimeType);
      
      // Transcribe with Google AI Studio
      const result = await transcribeAudio(audioBase64, mimeType);
      console.log("Transcription completed successfully");

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
    } catch (transcriptionError: unknown) {
      const errorMessage = transcriptionError instanceof Error 
        ? transcriptionError.message 
        : "Unknown error";
      console.error("Transcription failed:", errorMessage, transcriptionError);
      
      // Update status to error
      await prisma.recording.update({
        where: { id: recordingId },
        data: { status: "ERROR" },
      });

      return NextResponse.json(
        { message: `שגיאה בתמלול: ${errorMessage}` },
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








