import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Calendar, CreditCard, Mic, Clock, Plus } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { he } from "date-fns/locale";

async function getDashboardStats(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    totalClients,
    activeClients,
    sessionsThisWeek,
    sessionsThisMonth,
    pendingPayments,
    pendingTasks,
    todaySessions,
    recentRecordings,
  ] = await Promise.all([
    prisma.client.count({ where: { therapistId: userId } }),
    prisma.client.count({ where: { therapistId: userId, status: "ACTIVE" } }),
    prisma.therapySession.count({
      where: { therapistId: userId, startTime: { gte: weekStart } },
    }),
    prisma.therapySession.count({
      where: { therapistId: userId, startTime: { gte: monthStart } },
    }),
    prisma.payment.count({
      where: { client: { therapistId: userId }, status: "PENDING" },
    }),
    prisma.task.count({
      where: { userId, status: { in: ["PENDING", "IN_PROGRESS"] } },
    }),
    prisma.therapySession.findMany({
      where: {
        therapistId: userId,
        startTime: { gte: today, lt: tomorrow },
      },
      include: { client: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.recording.findMany({
      where: { client: { therapistId: userId } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { client: true, transcription: true },
    }),
  ]);

  return {
    totalClients,
    activeClients,
    sessionsThisWeek,
    sessionsThisMonth,
    pendingPayments,
    pendingTasks,
    todaySessions,
    recentRecordings,
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const stats = await getDashboardStats(session.user.id);

  const statCards = [
    {
      title: "מטופלים פעילים",
      value: stats.activeClients,
      description: `מתוך ${stats.totalClients} סה״כ`,
      icon: Users,
      href: "/dashboard/clients",
    },
    {
      title: "פגישות השבוע",
      value: stats.sessionsThisWeek,
      description: `${stats.sessionsThisMonth} החודש`,
      icon: Calendar,
      href: "/dashboard/calendar",
    },
    {
      title: "תשלומים ממתינים",
      value: stats.pendingPayments,
      description: "לגבייה",
      icon: CreditCard,
      href: "/dashboard/payments",
    },
    {
      title: "משימות פתוחות",
      value: stats.pendingTasks,
      description: "ממתינות לטיפול",
      icon: Clock,
      href: "/dashboard/tasks",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            שלום, {session.user.name?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, d בMMMM yyyy", { locale: he })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/dashboard/clients/new">
              <Plus className="ml-2 h-4 w-4" />
              מטופל חדש
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Sessions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>פגישות היום</CardTitle>
              <CardDescription>
                {stats.todaySessions.length > 0
                  ? `${stats.todaySessions.length} פגישות מתוכננות`
                  : "אין פגישות מתוכננות להיום"}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/calendar">לוח שנה</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {stats.todaySessions.length > 0 ? (
              <div className="space-y-3">
                {stats.todaySessions.map((therapySession) => (
                  <div
                    key={therapySession.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary">
                        <span className="text-sm font-bold">
                          {format(new Date(therapySession.startTime), "HH:mm")}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{therapySession.client.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {therapySession.type === "ONLINE" ? "אונליין" : "פרונטלי"}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        therapySession.status === "COMPLETED"
                          ? "default"
                          : therapySession.status === "CANCELLED"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {therapySession.status === "SCHEDULED"
                        ? "מתוכנן"
                        : therapySession.status === "COMPLETED"
                        ? "הושלם"
                        : therapySession.status === "CANCELLED"
                        ? "בוטל"
                        : "לא הגיע"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="mx-auto h-12 w-12 mb-3 opacity-50" />
                <p>אין פגישות מתוכננות להיום</p>
                <Button variant="link" asChild className="mt-2">
                  <Link href="/dashboard/calendar">קבע פגישה חדשה</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Recordings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>הקלטות אחרונות</CardTitle>
              <CardDescription>הקלטות שהועלו לאחרונה</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/recordings">כל ההקלטות</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {stats.recentRecordings.length > 0 ? (
              <div className="space-y-3">
                {stats.recentRecordings.map((recording) => (
                  <div
                    key={recording.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                        <Mic className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{recording.client?.name || "לא משויך"}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(recording.createdAt), "d/M/yyyy HH:mm")}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        recording.status === "ANALYZED"
                          ? "default"
                          : recording.status === "ERROR"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {recording.status === "PENDING"
                        ? "ממתין"
                        : recording.status === "TRANSCRIBING"
                        ? "מתמלל"
                        : recording.status === "TRANSCRIBED"
                        ? "תומלל"
                        : recording.status === "ANALYZED"
                        ? "נותח"
                        : "שגיאה"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Mic className="mx-auto h-12 w-12 mb-3 opacity-50" />
                <p>אין הקלטות עדיין</p>
                <Button variant="link" asChild className="mt-2">
                  <Link href="/dashboard/recordings/new">הקלט שיחה חדשה</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}






