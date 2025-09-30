import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";

interface AdminStatus {
  isAdmin: boolean;
}

interface PendingCoach {
  id: string;
  name: string;
  email: string;
  bio: string;
  location: string;
  pricePerHour: string;
  yearsExperience: number;
  image?: string;
  createdAt: string;
  approvalStatus: string;
}

interface Booking {
  id: string;
  studentName: string;
  studentEmail: string;
  coachName: string;
  date: string;
  time: string;
  status: string;
  totalAmount: string;
  createdAt: string;
}

interface Coach {
  id: string;
  name: string;
  email: string;
  bio: string;
  location: string;
  pricePerHour: string;
  yearsExperience: number;
  image?: string;
  approvalStatus: string;
  createdAt: string;
  userId: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string;
  skillLevel?: string;
  createdAt: string;
  userId: string;
}

interface AdminAction {
  id: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: string;
  createdAt: string;
}
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Users, 
  UserCheck, 
  UserX, 
  Calendar, 
  Trash2, 
  Mail, 
  Shield,
  Clock,
  DollarSign
} from "lucide-react";

export default function AdminDashboard() {
  const { toast } = useToast();
  const [emailForm, setEmailForm] = useState({ email: "", message: "" });

  // Check if user is admin
  const { data: adminStatus, isLoading, error } = useQuery<AdminStatus>({
    queryKey: ["/api/admin/check"],
    queryFn: async () => {
      const response = await fetch("/api/admin/check", { credentials: "include" });
      if (!response.ok) throw new Error(`Failed to check admin status: ${response.statusText}`);
      return response.json();
    },
  });

  // Get pending coaches
  const { data: pendingCoaches, isLoading: loadingPending, error: errorPending } = useQuery<PendingCoach[]>({
    queryKey: ["/api/admin/pending-coaches"],
    queryFn: async () => {
      const response = await fetch("/api/admin/pending-coaches", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch pending coaches");
      return response.json();
    },
  });

  // Get all bookings
  const { data: bookings, isLoading: loadingBookings, error: errorBookings } = useQuery<Booking[]>({
    queryKey: ["/api/admin/bookings"],
    queryFn: async () => {
      const response = await fetch("/api/admin/bookings", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch bookings");
      return response.json();
    },
  });

  // Get all coaches
  const { data: coaches, isLoading: loadingCoaches, error: errorCoaches } = useQuery<Coach[]>({
    queryKey: ["/api/admin/coaches"],
    queryFn: async () => {
      const response = await fetch("/api/admin/coaches", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch coaches");
      return response.json();
    },
  });

  // Get all students
  const { data: students, isLoading: loadingStudents, error: errorStudents } = useQuery<Student[]>({
    queryKey: ["/api/admin/students"],
    queryFn: async () => {
      const response = await fetch("/api/admin/students", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch students");
      return response.json();
    },
  });

  // Get admin actions log
  const { data: adminActions, isLoading: loadingActions, error: errorActions } = useQuery<AdminAction[]>({
    queryKey: ["/api/admin/actions"],
    queryFn: async () => {
      const response = await fetch("/api/admin/actions", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch admin actions");
      return response.json();
    },
  });

  // Approve coach mutation
  const approveCoachMutation = useMutation({
    mutationFn: async (coachId: string) => {
      const response = await fetch(`/api/admin/approve-coach/${coachId}`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to approve coach");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-coaches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coaches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/actions"] });
      toast({ title: "Coach approved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to approve coach", variant: "destructive" });
    },
  });

  // Reject coach mutation
  const rejectCoachMutation = useMutation({
    mutationFn: async (coachId: string) => {
      const response = await fetch(`/api/admin/reject-coach/${coachId}`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to reject coach");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-coaches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coaches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/actions"] });
      toast({ title: "Coach rejected successfully" });
    },
    onError: () => {
      toast({ title: "Failed to reject coach", variant: "destructive" });
    },
  });

  // Delete coach mutation
  const deleteCoachMutation = useMutation({
    mutationFn: async (coachId: string) => {
      const response = await fetch(`/api/admin/coaches/${coachId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete coach");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coaches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/actions"] });
      toast({ title: "Coach deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete coach", variant: "destructive" });
    },
  });

  // Delete student mutation
  const deleteStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const response = await fetch(`/api/admin/students/${studentId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete student");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/actions"] });
      toast({ title: "Student deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete student", variant: "destructive" });
    },
  });

  // Send signup email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (data: { email: string; message?: string }) => {
      const response = await fetch("/api/admin/send-coach-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to send email");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/actions"] });
      toast({ title: "Coach signup email sent successfully" });
      setEmailForm({ email: "", message: "" });
    },
    onError: () => {
      toast({ title: "Failed to send email", variant: "destructive" });
    },
  });

  if (isLoading) return <div>Loading admin status...</div>;
  if (error) return <div>Error checking admin status: {error.message}</div>;
  if (!adminStatus?.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to access the admin dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="text-yellow-600">Pending</Badge>;
      case "approved":
        return <Badge variant="default" className="bg-green-600">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatPrice = (price: string) => {
    return `$${parseFloat(price).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="container mx-auto px-4 py-8" data-testid="admin-dashboard">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage coaches, students, and platform operations</p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Admin Access
        </Badge>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending Coaches ({pendingCoaches?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="bookings" data-testid="tab-bookings">
            Bookings ({bookings?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="coaches" data-testid="tab-coaches">
            All Coaches ({coaches?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="students" data-testid="tab-students">
            Students ({students?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="invite" data-testid="tab-invite">
            Invite Coach
          </TabsTrigger>
          <TabsTrigger value="logs" data-testid="tab-logs">
            Activity Logs
          </TabsTrigger>
        </TabsList>

        {/* Pending Coaches Tab */}
        <TabsContent value="pending" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pending Coach Approvals
              </CardTitle>
              <CardDescription>
                Review and approve new coach registrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPending ? (
                <div className="text-center py-8">Loading pending coaches...</div>
              ) : errorPending ? (
                <div className="text-center py-8 text-red-500">Error loading pending coaches: {errorPending.message}</div>
              ) : pendingCoaches?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending coach approvals
                </div>
              ) : (
                <div className="grid gap-4">
                  {pendingCoaches?.map((coach: any) => (
                    <Card key={coach.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                          {coach.image && (
                            <img 
                              src={coach.image} 
                              alt={coach.name}
                              className="h-16 w-16 rounded-full object-cover"
                            />
                          )}
                          <div>
                            <h3 className="font-semibold text-lg">{coach.name}</h3>
                            <p className="text-sm text-muted-foreground">{coach.email}</p>
                            <p className="text-sm mt-1">{coach.location}</p>
                            <p className="text-sm">{formatPrice(coach.pricePerHour)}/hour</p>
                            <p className="text-sm">{coach.yearsExperience} years experience</p>
                            {coach.bio && (
                              <p className="text-sm mt-2 text-muted-foreground line-clamp-2">
                                {coach.bio}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => approveCoachMutation.mutate(coach.id)}
                            disabled={approveCoachMutation.isPending}
                            data-testid={`approve-coach-${coach.id}`}
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectCoachMutation.mutate(coach.id)}
                            disabled={rejectCoachMutation.isPending}
                            data-testid={`reject-coach-${coach.id}`}
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                All Lesson Bookings
              </CardTitle>
              <CardDescription>
                View all lessons booked through the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingBookings ? (
                <div className="text-center py-8">Loading bookings...</div>
              ) : errorBookings ? (
                <div className="text-center py-8 text-red-500">Error loading bookings: {errorBookings.message}</div>
              ) : bookings?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No bookings found
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings?.map((booking: any) => (
                    <Card key={booking.id} className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Student</Label>
                          <p className="font-medium">{booking.studentName}</p>
                          <p className="text-sm text-muted-foreground">{booking.studentEmail}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Coach</Label>
                          <p className="font-medium">{booking.coachName}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Date & Time</Label>
                          <p className="font-medium">{formatDate(booking.date)} at {booking.time}</p>
                          <Badge variant="outline" className="mt-1">{booking.status}</Badge>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Price</Label>
                          <p className="font-medium">{formatPrice(booking.totalAmount)}</p>
                          <p className="text-xs text-muted-foreground">Booked {formatDate(booking.createdAt)}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Coaches Tab */}
        <TabsContent value="coaches" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                All Coaches
              </CardTitle>
              <CardDescription>
                Manage all coaches on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCoaches ? (
                <div className="text-center py-8">Loading coaches...</div>
              ) : errorCoaches ? (
                <div className="text-center py-8 text-red-500">Error loading coaches: {errorCoaches.message}</div>
              ) : coaches?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No coaches found
                </div>
              ) : (
                <div className="space-y-4">
                  {coaches?.map((coach: any) => (
                    <Card key={coach.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                          {coach.image && (
                            <img 
                              src={coach.image} 
                              alt={coach.name}
                              className="h-12 w-12 rounded-full object-cover"
                            />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{coach.name}</h3>
                              {getStatusBadge(coach.approvalStatus)}
                            </div>
                            <p className="text-sm text-muted-foreground">{coach.email}</p>
                            <p className="text-sm">{coach.location} • {formatPrice(coach.pricePerHour)}/hour</p>
                            <p className="text-xs text-muted-foreground">Registered {formatDate(coach.createdAt)}</p>
                          </div>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive" data-testid={`delete-coach-${coach.id}`}>
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Coach</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {coach.name}? This will permanently remove their profile and all associated data. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteCoachMutation.mutate(coach.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete Coach
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                All Students
              </CardTitle>
              <CardDescription>
                Manage all students on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingStudents ? (
                <div className="text-center py-8">Loading students...</div>
              ) : errorStudents ? (
                <div className="text-center py-8 text-red-500">Error loading students: {errorStudents.message}</div>
              ) : students?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No students found
                </div>
              ) : (
                <div className="space-y-4">
                  {students?.map((student: any) => (
                    <Card key={student.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{student.name}</h3>
                          <p className="text-sm text-muted-foreground">{student.email}</p>
                          {student.phone && (
                            <p className="text-sm">{student.phone}</p>
                          )}
                          {student.skillLevel && (
                            <Badge variant="outline" className="mt-1 capitalize">
                              {student.skillLevel}
                            </Badge>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Registered {formatDate(student.createdAt)}
                          </p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive" data-testid={`delete-student-${student.id}`}>
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Student</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {student.name}? This will permanently remove their account and all associated data. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteStudentMutation.mutate(student.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete Student
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invite Coach Tab */}
        <TabsContent value="invite" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Invite New Coach
              </CardTitle>
              <CardDescription>
                Send coach registration invitations via email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-md">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="coach@example.com"
                    value={emailForm.email}
                    onChange={(e) => setEmailForm(prev => ({ ...prev, email: e.target.value }))}
                    data-testid="input-email"
                  />
                </div>
                <div>
                  <Label htmlFor="message">Custom Message (Optional)</Label>
                  <Textarea
                    id="message"
                    placeholder="Add a personal message to the invitation..."
                    value={emailForm.message}
                    onChange={(e) => setEmailForm(prev => ({ ...prev, message: e.target.value }))}
                    data-testid="input-message"
                  />
                </div>
                <Button
                  onClick={() => sendEmailMutation.mutate(emailForm)}
                  disabled={!emailForm.email || sendEmailMutation.isPending}
                  data-testid="button-send-invitation"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {sendEmailMutation.isPending ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Logs Tab */}
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Admin Activity Logs</CardTitle>
              <CardDescription>
                Recent admin actions and system events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingActions ? (
                <div className="text-center py-8">Loading activity logs...</div>
              ) : errorActions ? (
                <div className="text-center py-8 text-red-500">Error loading logs: {errorActions.message}</div>
              ) : adminActions?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No activity logs found
                </div>
              ) : (
                <div className="space-y-3">
                  {adminActions?.map((action: any) => (
                    <Card key={action.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">
                            {action.action.replace(/_/g, ' ').toLowerCase().replace(/^./, (str: string) => str.toUpperCase())}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            by {action.adminEmail} • {formatDate(action.createdAt)}
                          </p>
                          {action.details && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {JSON.parse(action.details).name || JSON.parse(action.details).email || action.targetId}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {action.targetType}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}