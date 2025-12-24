import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowRight, 
  Calendar, 
  CreditCard, 
  Edit, 
  FileText, 
  Mic, 
  Phone, 
  Mail, 
  MapPin,
  Cake,
  Plus
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { he } from "date-fns/locale";

async function getClient(clientId: string, userId: string) {
  return prisma.client.findFirst({
    where: { id: clientId, therapistId: userId },
    include: {
      therapySessions: {
        orderBy: { startTime: "desc" },
        take: 20,
        include: { sessionNote: true, payment: true },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      recordings: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { transcription: { include: { analysis: true } } },
      },
      documents: {
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: { therapySessions: true, payments: true, recordings: true },
      },
    },
  });
}

export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const { id } = await params;
  const client = await getClient(id, session.user.id);

  if (!client) {
    notFound();
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2);
  };

  const age = client.birthDate
    ? Math.floor(
        (new Date().getTime() - new Date(client.birthDate).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      )
    : null;

  const pendingPayments = client.payments.filter((p) => p.status === "PENDING");
  const totalDebt = pendingPayments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/clients">
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-medium">
              {getInitials(client.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
              <Badge
                variant={
                  client.status === "ACTIVE"
                    ? "default"
                    : client.status === "INACTIVE"
                    ? "secondary"
                    : "outline"
                }
              >
                {client.status === "ACTIVE"
                  ? "פעיל"
                  : client.status === "INACTIVE"
                  ? "לא פעיל"
                  : "בארכיון"}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {client._count.therapySessions} פגישות | מטופל מאז{" "}
              {format(new Date(client.createdAt), "MMMM yyyy", { locale: he })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/clients/${client.id}/edit`}>
              <Edit className="ml-2 h-4 w-4" />
              עריכה
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/dashboard/calendar?client=${client.id}`}>
              <Plus className="ml-2 h-4 w-4" />
              קבע פגישה
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">טלפון</p>
                <p className="font-medium" dir="ltr">
                  {client.phone || "לא צוין"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">אימייל</p>
                <p className="font-medium truncate" dir="ltr">
                  {client.email || "לא צוין"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Cake className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">גיל</p>
                <p className="font-medium">
                  {age ? `${age} שנים` : "לא צוין"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">חוב פתוח</p>
                <p className="font-medium">
                  {totalDebt > 0 ? `₪${totalDebt}` : "אין חוב"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sessions" className="w-full">
        <TabsList className="grid w-full grid-cols-5 max-w-xl">
          <TabsTrigger value="sessions" className="gap-2">
            <Calendar className="h-4 w-4" />
            פגישות
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2">
            <FileText className="h-4 w-4" />
            סיכומים
          </TabsTrigger>
          <TabsTrigger value="recordings" className="gap-2">
            <Mic className="h-4 w-4" />
            הקלטות
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="h-4 w-4" />
            תשלומים
          </TabsTrigger>
          <TabsTrigger value="info" className="gap-2">
            <MapPin className="h-4 w-4" />
            פרטים
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>היסטוריית פגישות</CardTitle>
              <CardDescription>
                {client._count.therapySessions} פגישות בסך הכל
              </CardDescription>
            </CardHeader>
            <CardContent>
              {client.therapySessions.length > 0 ? (
                <div className="space-y-3">
                  {client.therapySessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {format(new Date(session.startTime), "d")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(session.startTime), "MMM", {
                              locale: he,
                            })}
                          </div>
                        </div>
                        <div>
                          <p className="font-medium">
                            {format(new Date(session.startTime), "HH:mm")} -{" "}
                            {format(new Date(session.endTime), "HH:mm")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {session.type === "ONLINE"
                              ? "אונליין"
                              : session.type === "PHONE"
                              ? "טלפון"
                              : "פרונטלי"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {session.sessionNote && (
                          <Badge variant="outline">יש סיכום</Badge>
                        )}
                        <Badge
                          variant={
                            session.status === "COMPLETED"
                              ? "default"
                              : session.status === "CANCELLED"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {session.status === "SCHEDULED"
                            ? "מתוכנן"
                            : session.status === "COMPLETED"
                            ? "הושלם"
                            : session.status === "CANCELLED"
                            ? "בוטל"
                            : "לא הגיע"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="mx-auto h-12 w-12 mb-3 opacity-50" />
                  <p>אין פגישות עדיין</p>
                  <Button variant="link" asChild className="mt-2">
                    <Link href={`/dashboard/calendar?client=${client.id}`}>
                      קבע פגישה ראשונה
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>סיכומי טיפול</CardTitle>
            </CardHeader>
            <CardContent>
              {client.therapySessions.filter((s) => s.sessionNote).length > 0 ? (
                <div className="space-y-4">
                  {client.therapySessions
                    .filter((s) => s.sessionNote)
                    .map((session) => (
                      <div key={session.id} className="p-4 rounded-lg border">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-medium">
                              {format(
                                new Date(session.startTime),
                                "EEEE, d בMMMM yyyy",
                                { locale: he }
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              פגישה{" "}
                              {session.type === "ONLINE"
                                ? "אונליין"
                                : "פרונטלית"}
                            </p>
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <Link
                              href={`/dashboard/sessions/${session.id}`}
                            >
                              ערוך
                            </Link>
                          </Button>
                        </div>
                        <div className="prose prose-sm max-w-none text-muted-foreground">
                          {session.sessionNote?.content.slice(0, 300)}
                          {(session.sessionNote?.content.length || 0) > 300 &&
                            "..."}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="mx-auto h-12 w-12 mb-3 opacity-50" />
                  <p>אין סיכומי טיפול עדיין</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recordings" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>הקלטות</CardTitle>
                <CardDescription>
                  {client._count.recordings} הקלטות בסך הכל
                </CardDescription>
              </div>
              <Button asChild>
                <Link href={`/dashboard/recordings/new?client=${client.id}`}>
                  <Mic className="ml-2 h-4 w-4" />
                  הקלטה חדשה
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {client.recordings.length > 0 ? (
                <div className="space-y-3">
                  {client.recordings.map((recording) => (
                    <div
                      key={recording.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Mic className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {recording.type === "INTAKE"
                              ? "שיחת קבלה"
                              : "הקלטת פגישה"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(
                              new Date(recording.createdAt),
                              "d/M/yyyy HH:mm"
                            )}{" "}
                            • {Math.floor(recording.durationSeconds / 60)} דקות
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
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
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/recordings/${recording.id}`}>
                            צפה
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Mic className="mx-auto h-12 w-12 mb-3 opacity-50" />
                  <p>אין הקלטות עדיין</p>
                  <Button variant="link" asChild className="mt-2">
                    <Link href={`/dashboard/recordings/new?client=${client.id}`}>
                      הקלט שיחה ראשונה
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>היסטוריית תשלומים</CardTitle>
            </CardHeader>
            <CardContent>
              {client.payments.length > 0 ? (
                <div className="space-y-3">
                  {client.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">₪{Number(payment.amount)}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(payment.createdAt), "d/M/yyyy")} •{" "}
                          {payment.method === "CASH"
                            ? "מזומן"
                            : payment.method === "CREDIT_CARD"
                            ? "אשראי"
                            : payment.method === "BANK_TRANSFER"
                            ? "העברה"
                            : "צ׳ק"}
                        </p>
                      </div>
                      <Badge
                        variant={
                          payment.status === "PAID"
                            ? "default"
                            : payment.status === "PENDING"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {payment.status === "PAID"
                          ? "שולם"
                          : payment.status === "PENDING"
                          ? "ממתין"
                          : payment.status === "CANCELLED"
                          ? "בוטל"
                          : "הוחזר"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="mx-auto h-12 w-12 mb-3 opacity-50" />
                  <p>אין תשלומים עדיין</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>פרטים נוספים</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {client.address && (
                <div>
                  <p className="text-sm text-muted-foreground">כתובת</p>
                  <p className="font-medium">{client.address}</p>
                </div>
              )}
              {client.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">הערות</p>
                  <p className="font-medium whitespace-pre-wrap">
                    {client.notes}
                  </p>
                </div>
              )}
              {!client.address && !client.notes && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>אין פרטים נוספים</p>
                  <Button variant="link" asChild className="mt-2">
                    <Link href={`/dashboard/clients/${client.id}/edit`}>
                      הוסף פרטים
                    </Link>
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






