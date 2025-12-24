import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "לא מורשה" }, { status: 401 });
    }

    const settings = await prisma.notificationSetting.findMany({
      where: { userId: session.user.id },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Get notification settings error:", error);
    return NextResponse.json(
      { message: "אירעה שגיאה בטעינת ההגדרות" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "לא מורשה" }, { status: 401 });
    }

    const body = await request.json();
    const { emailEnabled, pushEnabled, morningTime, eveningTime, debtThresholdDays } = body;

    // Update or create email settings
    await prisma.notificationSetting.upsert({
      where: {
        id: (await prisma.notificationSetting.findFirst({
          where: { userId: session.user.id, channel: "email" },
        }))?.id || "new-email",
      },
      create: {
        userId: session.user.id,
        channel: "email",
        enabled: emailEnabled,
        morningTime,
        eveningTime,
        debtThresholdDays,
      },
      update: {
        enabled: emailEnabled,
        morningTime,
        eveningTime,
        debtThresholdDays,
      },
    });

    // Update or create push settings
    await prisma.notificationSetting.upsert({
      where: {
        id: (await prisma.notificationSetting.findFirst({
          where: { userId: session.user.id, channel: "push" },
        }))?.id || "new-push",
      },
      create: {
        userId: session.user.id,
        channel: "push",
        enabled: pushEnabled,
        morningTime,
        eveningTime,
        debtThresholdDays,
      },
      update: {
        enabled: pushEnabled,
        morningTime,
        eveningTime,
        debtThresholdDays,
      },
    });

    const settings = await prisma.notificationSetting.findMany({
      where: { userId: session.user.id },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Update notification settings error:", error);
    return NextResponse.json(
      { message: "אירעה שגיאה בעדכון ההגדרות" },
      { status: 500 }
    );
  }
}




