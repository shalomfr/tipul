import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "לא מורשה" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = { therapistId: session.user.id };
    
    if (clientId) {
      where.clientId = clientId;
    }
    
    if (startDate && endDate) {
      where.startTime = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const sessions = await prisma.therapySession.findMany({
      where,
      orderBy: { startTime: "asc" },
      include: {
        client: {
          select: { id: true, name: true },
        },
        sessionNote: true,
        payment: true,
      },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Get sessions error:", error);
    return NextResponse.json(
      { message: "אירעה שגיאה בטעינת הפגישות" },
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
    const { clientId, startTime, endTime, type, price, location, notes, isRecurring } = body;

    if (!clientId || !startTime || !endTime) {
      return NextResponse.json(
        { message: "נא למלא את כל השדות הנדרשים" },
        { status: 400 }
      );
    }

    // Verify client belongs to therapist
    const client = await prisma.client.findFirst({
      where: { id: clientId, therapistId: session.user.id },
    });

    if (!client) {
      return NextResponse.json(
        { message: "מטופל לא נמצא" },
        { status: 404 }
      );
    }

    // Check for conflicts
    const conflict = await prisma.therapySession.findFirst({
      where: {
        therapistId: session.user.id,
        status: { not: "CANCELLED" },
        OR: [
          {
            AND: [
              { startTime: { lte: new Date(startTime) } },
              { endTime: { gt: new Date(startTime) } },
            ],
          },
          {
            AND: [
              { startTime: { lt: new Date(endTime) } },
              { endTime: { gte: new Date(endTime) } },
            ],
          },
          {
            AND: [
              { startTime: { gte: new Date(startTime) } },
              { endTime: { lte: new Date(endTime) } },
            ],
          },
        ],
      },
    });

    if (conflict) {
      return NextResponse.json(
        { message: "יש התנגשות עם פגישה קיימת" },
        { status: 400 }
      );
    }

    const therapySession = await prisma.therapySession.create({
      data: {
        therapistId: session.user.id,
        clientId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        type: type || "IN_PERSON",
        price: price || 0,
        location: location || null,
        notes: notes || null,
        isRecurring: isRecurring || false,
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
      },
    });

    // Create a task to write summary after session
    await prisma.task.create({
      data: {
        userId: session.user.id,
        type: "WRITE_SUMMARY",
        title: `כתוב סיכום לפגישה עם ${client.name}`,
        status: "PENDING",
        priority: "MEDIUM",
        dueDate: new Date(endTime),
        relatedEntityId: therapySession.id,
        relatedEntity: "TherapySession",
      },
    });

    return NextResponse.json(therapySession, { status: 201 });
  } catch (error) {
    console.error("Create session error:", error);
    return NextResponse.json(
      { message: "אירעה שגיאה ביצירת הפגישה" },
      { status: 500 }
    );
  }
}




