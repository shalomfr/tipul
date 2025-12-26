import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ListTodo, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

async function getTasks(userId: string) {
  return prisma.task.findMany({
    where: { userId },
    orderBy: [
      { priority: "desc" },
      { dueDate: "asc" },
      { createdAt: "desc" },
    ],
  });
}

export default async function TasksPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const tasks = await getTasks(session.user.id);
  
  const pendingTasks = tasks.filter((t) => t.status === "PENDING" || t.status === "IN_PROGRESS");
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED").slice(0, 10);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "WRITE_SUMMARY": return "כתיבת סיכום";
      case "COLLECT_PAYMENT": return "גביית תשלום";
      case "SIGN_DOCUMENT": return "חתימת מסמך";
      case "SCHEDULE_SESSION": return "קביעת פגישה";
      case "REVIEW_TRANSCRIPTION": return "סקירת תמלול";
      case "FOLLOW_UP": return "מעקב";
      default: return "משימה";
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return <Badge variant="destructive">דחוף</Badge>;
      case "HIGH":
        return <Badge className="bg-amber-500">גבוה</Badge>;
      case "MEDIUM":
        return <Badge variant="secondary">רגיל</Badge>;
      default:
        return <Badge variant="outline">נמוך</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">משימות</h1>
          <p className="text-muted-foreground">
            {pendingTasks.length} משימות ממתינות לטיפול
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ListTodo className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingTasks.length}</p>
                <p className="text-sm text-muted-foreground">ממתינות</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {pendingTasks.filter((t) => t.priority === "URGENT" || t.priority === "HIGH").length}
                </p>
                <p className="text-sm text-muted-foreground">דחופות</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {pendingTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date()).length}
                </p>
                <p className="text-sm text-muted-foreground">באיחור</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedTasks.length}</p>
                <p className="text-sm text-muted-foreground">הושלמו</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>משימות פתוחות</CardTitle>
          <CardDescription>
            משימות שממתינות לטיפול
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingTasks.length > 0 ? (
            <div className="space-y-3">
              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-start gap-4 p-4 rounded-lg ${
                    task.priority === "URGENT"
                      ? "bg-destructive/10 border border-destructive/20"
                      : task.priority === "HIGH"
                      ? "bg-amber-50 border border-amber-200"
                      : "bg-muted/50"
                  }`}
                >
                  <Checkbox className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{task.title}</p>
                      {getPriorityBadge(task.priority)}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <Badge variant="outline">{getTypeLabel(task.type)}</Badge>
                      {task.dueDate && (
                        <span className={new Date(task.dueDate) < new Date() ? "text-destructive" : ""}>
                          עד {format(new Date(task.dueDate), "d בMMMM", { locale: he })}
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="mx-auto h-12 w-12 mb-3 text-green-500 opacity-50" />
              <p>כל המשימות הושלמו! 🎉</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>משימות שהושלמו</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 opacity-60"
                >
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <p className="line-through">{task.title}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}








