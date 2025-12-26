import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { readFile, stat } from "fs/promises";
import { join } from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "לא מורשה" }, { status: 401 });
    }

    const { path } = await params;
    const filePath = join(process.cwd(), "uploads", ...path);

    // Security: Prevent directory traversal
    if (!filePath.startsWith(join(process.cwd(), "uploads"))) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    try {
      await stat(filePath);
    } catch {
      return NextResponse.json({ message: "File not found" }, { status: 404 });
    }

    const file = await readFile(filePath);
    
    // Determine content type based on extension
    const extension = filePath.split(".").pop()?.toLowerCase();
    let contentType = "application/octet-stream";
    
    switch (extension) {
      case "webm":
        contentType = "audio/webm";
        break;
      case "mp3":
        contentType = "audio/mpeg";
        break;
      case "wav":
        contentType = "audio/wav";
        break;
      case "ogg":
        contentType = "audio/ogg";
        break;
      case "pdf":
        contentType = "application/pdf";
        break;
      case "jpg":
      case "jpeg":
        contentType = "image/jpeg";
        break;
      case "png":
        contentType = "image/png";
        break;
    }

    return new NextResponse(file, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": file.length.toString(),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("File serve error:", error);
    return NextResponse.json(
      { message: "Error serving file" },
      { status: 500 }
    );
  }
}


