import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Calendar, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { he } from "date-fns/locale";

async function getSessions(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.therapySession.findMany({
    where: { therapistId: userId },
    orderBy: { startTime: "desc" },
    take: 50,
    include: {
      client: { select: { id: true, name: true } },
      sessionNote: true,
      payment: true,
    },
  });
}

export default async function SessionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const sessions = await getSessions(session.user.id);
  
  const completedWithNotes = sessions.filter(
    (s) => s.status === "COMPLETED" && s.sessionNote
  );
  const completedWithoutNotes = sessions.filter(
    (s) => s.status === "COMPLETED" && !s.sessionNote
  );
  const upcoming = sessions.filter((s) => s.status === "SCHEDULED");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">פגישות וסיכומים</h1>
          <p className="text-muted-foreground">
            ניהול פגישות וכתיבת סיכומי טיפול
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedWithNotes.length}</p>
                <p className="text-sm text-muted-foreground">עם סיכום</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedWithoutNotes.length}</p>
                <p className="text-sm text-muted-foreground">ממתינים לסיכום</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcoming.length}</p>
                <p className="text-sm text-muted-foreground">פגישות קרובות</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <AlertCircle className="h-4 w-4" />
            ממתינים לסיכום ({completedWithoutNotes.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            עם סיכום ({completedWithNotes.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-2">
            <Calendar className="h-4 w-4" />
            קרובות ({upcoming.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>פגישות ממתינות לסיכום</CardTitle>
              <CardDescription>
                פגישות שהסתיימו וטרם נכתב להן סיכום
              </CardDescription>
            </CardHeader>
            <CardContent>
              {completedWithoutNotes.length > 0 ? (
                <div className="space-y-3">
                  {completedWithoutNotes.map((therapySession) => (
                    <div
                      key={therapySession.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-amber-50 border border-amber-200"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[50px]">
                          <div className="text-xl font-bold">
                            {format(new Date(therapySession.startTime), "d")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(therapySession.startTime), "MMM", { locale: he })}
                          </div>
                        </div>
                        <div>
                          <p className="font-medium">{therapySession.client.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(therapySession.startTime), "HH:mm")} -{" "}
                            {format(new Date(therapySession.endTime), "HH:mm")}
                          </p>
                        </div>
                      </div>
                      <Button asChild>
                        <Link href={`/dashboard/sessions/${therapySession.id}`}>
                          <FileText className="ml-2 h-4 w-4" />
                          כתוב סיכום
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="mx-auto h-12 w-12 mb-3 text-primary opacity-50" />
                  <p>כל הפגישות מסוכמות!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>פגישות עם סיכום</CardTitle>
            </CardHeader>
            <CardContent>
              {completedWithNotes.length > 0 ? (
                <div className="space-y-3">
                  {completedWithNotes.map((therapySession) => (
                    <div
                      key={therapySession.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[50px]">
                          <div className="text-xl font-bold">
                            {format(new Date(therapySession.startTime), "d")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(therapySession.startTime), "MMM", { locale: he })}
                          </div>
                        </div>
                        <div>
                          <p className="font-medium">{therapySession.client.name}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {therapySession.sessionNote?.content.slice(0, 100)}...
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" asChild>
                        <Link href={`/dashboard/sessions/${therapySession.id}`}>
                          צפה וערוך
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="mx-auto h-12 w-12 mb-3 opacity-50" />
                  <p>אין פגישות עם סיכום עדיין</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>פגישות קרובות</CardTitle>
            </CardHeader>
            <CardContent>
              {upcoming.length > 0 ? (
                <div className="space-y-3">
                  {upcoming.map((therapySession) => (
                    <div
                      key={therapySession.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[50px]">
                          <div className="text-xl font-bold">
                            {format(new Date(therapySession.startTime), "d")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(therapySession.startTime), "MMM", { locale: he })}
                          </div>
                        </div>
                        <div>
                          <p className="font-medium">{therapySession.client.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(therapySession.startTime), "EEEE HH:mm", { locale: he })}
                            {" • "}
                            {therapySession.type === "ONLINE" ? "אונליין" : "פרונטלי"}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">מתוכנן</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="mx-auto h-12 w-12 mb-3 opacity-50" />
                  <p>אין פגישות קרובות</p>
                  <Button variant="link" asChild className="mt-2">
                    <Link href="/dashboard/calendar">קבע פגישה</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

