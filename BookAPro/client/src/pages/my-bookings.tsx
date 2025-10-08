import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MessageCircle, MapPin, Clock, Filter, Search } from "lucide-react";
import { Link } from "wouter";

interface User {
  id: string;
  email: string;
  role: string;
}

interface Booking {
  id: string;
  date: string;
  time: string;
  duration: number;
  lessonType: string;
  location: string;
  status: string;
  totalAmount: string;
  notes?: string;
  coach?: {
    id?: string;
    name: string;
    image?: string;
  };
  student?: {
    id?: string;  // Now returned from backend
    email?: string;
    name: string;
  };
}

export default function MyBookings() {
  const [, setLocation] = useLocation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Message modal state
  const [messageTo, setMessageTo] = useState<{ id: string; name: string } | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Load bookings
  useEffect(() => {
    const loadBookings = async () => {
      try {
        const authResponse = await fetch("/api/auth/me", { credentials: "include" });
        if (!authResponse.ok) {
          setLocation("/");
          return;
        }
        const authData = await authResponse.json();
        setCurrentUser(authData.user);

        const bookingsResponse = await fetch("/api/bookings/my-bookings", { credentials: "include" });
        if (bookingsResponse.ok) {
          const bookingsData = await bookingsResponse.json();
          const sanitized: Booking[] = (bookingsData.bookings || []).map((b: any) => ({
            id: b.id,
            date: b.date,
            time: b.time,
            duration: b.duration,
            lessonType: b.lessonType,
            location: b.location,
            status: b.status,
            totalAmount: b.totalAmount,
            notes: b.notes || "",
            coach: b.coach ? { id: b.coach.id, name: b.coach.name, image: b.coach.image } : undefined,
            student: b.student ? { id: b.student.id, email: b.student.email, name: b.student.name } : undefined,
          }));
          setBookings(sanitized);
        }
      } catch (err) {
        console.error("Error loading bookings:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchTerm, statusFilter, currentUser]);

  const filterBookings = () => {
    let filtered = bookings;
    if (statusFilter !== "all") filtered = filtered.filter(b => b.status === statusFilter);
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(b =>
        (currentUser?.role === "coach" ? b.student?.name : b.coach?.name)?.toLowerCase().includes(term) ||
        b.location.toLowerCase().includes(term) ||
        b.lessonType.toLowerCase().includes(term)
      );
    }
    setFilteredBookings(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "default";
      case "pending": return "secondary";
      case "completed": return "outline";
      case "cancelled": return "destructive";
      default: return "secondary";
    }
  };

  const getUpcomingBookings = () => {
    const now = new Date();
    return filteredBookings.filter(b => new Date(b.date) >= now && b.status !== "cancelled" && b.status !== "completed");
  };

  const getPastBookings = () => {
    const now = new Date();
    return filteredBookings.filter(b => new Date(b.date) < now || b.status === "completed");
  };

  const getCancelledBookings = () => filteredBookings.filter(b => b.status === "cancelled");

  const getLessonWithName = (booking: Booking) => {
    if (!currentUser) return "Unknown";
    return currentUser.role === "coach" ? booking.student?.name || "Unknown Student" : booking.coach?.name || "Unknown Coach";
  };

  // --- Messaging handlers ---
  const handleOpenMessage = (student: { id?: string; name: string }) => {
    if (student.id) setMessageTo({ id: student.id, name: student.name });
  };

  const handleCloseMessage = () => {
    setMessageTo(null);
    setMessageContent("");
    setSendError(null);
  };

const handleSendMessage = async () => {
  if (!messageTo?.id || !messageContent.trim()) return;

  setSending(true);
  setSendError(null);

  try {
    console.log("=== Starting message send ===");
    console.log("Recipient:", messageTo);
    console.log("Message content:", messageContent);

    // 1️⃣ Get or create conversation
    const convRes = await fetch("/api/messages/conversation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        coachId: currentUser?.role === "coach" ? currentUser.id : messageTo.id,
        studentId: currentUser?.role === "student" ? currentUser.id : messageTo.id,
      }),
    });

    console.log("Conversation response status:", convRes.status, convRes.statusText);

    let conversation: any = {};
    try {
      conversation = await convRes.json();
      console.log("Conversation returned:", conversation);
    } catch (err) {
      console.error("Failed to parse conversation JSON. Response may be HTML:", err);
      const text = await convRes.text();
      console.error("Raw response text:", text);
      setSendError("Invalid response from server when starting conversation");
      setSending(false);
      return;
    }

    if (!conversation?.id) {
      console.error("Conversation object missing ID:", conversation);
      setSendError("Invalid conversation data from server");
      setSending(false);
      return;
    }

    // 2️⃣ Send the message
    const messageRes = await fetch("/api/messages/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        conversationId: conversation.id,
        content: messageContent.trim(),
      }),
    });

    console.log("Message response status:", messageRes.status, messageRes.statusText);

    let messageData: any = {};
    try {
      messageData = await messageRes.json();
      console.log("Message successfully sent:", messageData);
      handleCloseMessage();
    } catch (err) {
      console.error("Failed to parse message JSON. Response may be HTML:", err);
      const text = await messageRes.text();
      console.error("Raw response text:", text);
      setSendError("Invalid response from server when sending message");
    }

  } catch (err) {
    console.error("Unexpected error in handleSendMessage:", err);
    setSendError("Failed to send message due to unexpected error");
  } finally {
    setSending(false);
    console.log("=== Finished handleSendMessage ===");
  }
};


  if (isLoading) return (
    <div className="container mx-auto px-4 py-8 text-center">
      <div className="animate-pulse">Loading bookings...</div>
    </div>
  );

  if (!currentUser) return null;

  const upcomingBookings = getUpcomingBookings();
  const pastBookings = getPastBookings();
  const cancelledBookings = getCancelledBookings();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Bookings</h1>
          <p className="text-muted-foreground">Manage your golf lesson bookings</p>
        </div>
        <Link href="/profile">
          <Button variant="outline">Back to Profile</Button>
        </Link>
      </div>

      {/* Search & Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, location, or lesson type..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-border rounded-md bg-background"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Total: {filteredBookings.length}</span>
            <span>Upcoming: {upcomingBookings.length}</span>
            <span>Past: {pastBookings.length}</span>
            {cancelledBookings.length > 0 && <span>Cancelled: {cancelledBookings.length}</span>}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">Upcoming ({upcomingBookings.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({pastBookings.length})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({cancelledBookings.length})</TabsTrigger>
        </TabsList>

        {/* Upcoming Bookings */}
        <TabsContent value="upcoming" className="space-y-4">
          {upcomingBookings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No upcoming bookings</p>
              </CardContent>
            </Card>
          ) : upcomingBookings.map(booking => (
            <Card key={booking.id} className="hover-elevate">
              <CardContent className="p-6 flex justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">Lesson with {getLessonWithName(booking)}</h3>
                    <Badge variant={getStatusColor(booking.status)}>{booking.status}</Badge>
                    {currentUser.role === "coach" && booking.student?.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-2"
                        onClick={() => handleOpenMessage(booking.student!)}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Message
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> {new Date(booking.date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" /> {booking.time} ({booking.duration} min)
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> {booking.location}
                    </div>
                  </div>
                  <div className="mt-2"><Badge variant="outline">{booking.lessonType}</Badge></div>
                  {booking.notes && <p className="mt-3 text-sm text-muted-foreground"><strong>Notes:</strong> {booking.notes}</p>}
                </div>
                <div className="text-right font-semibold text-lg text-primary">${booking.totalAmount}</div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Past Bookings */}
        <TabsContent value="past" className="space-y-4">
          {pastBookings.map(booking => (
            <Card key={booking.id} className="opacity-90">
              <CardContent className="p-6 flex justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">Lesson with {getLessonWithName(booking)}</h3>
                    <Badge variant={getStatusColor(booking.status)}>{booking.status}</Badge>
                    {currentUser.role === "coach" && booking.student?.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-2"
                        onClick={() => handleOpenMessage(booking.student!)}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Message
                      </Button>
                    )}
                  </div>
                </div>
                <div className="text-right font-semibold text-primary">${booking.totalAmount}</div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Cancelled Bookings */}
        <TabsContent value="cancelled" className="space-y-4">
          {cancelledBookings.map(booking => (
            <Card key={booking.id} className="hover-elevate">
              <CardContent className="p-6 flex justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">Lesson with {getLessonWithName(booking)}</h3>
                  <Badge variant={getStatusColor(booking.status)}>{booking.status}</Badge>
                </div>
                {currentUser.role === "coach" && booking.student?.id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenMessage(booking.student!)}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Message
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Message Modal */}
      {currentUser.role === "coach" && messageTo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-lg font-bold mb-2">Message {messageTo.name}</h2>
            <textarea
              className="w-full border rounded p-2 mb-2"
              rows={4}
              value={messageContent}
              onChange={e => setMessageContent(e.target.value)}
              placeholder="Type your message..."
              disabled={sending}
            />
            {sendError && <div className="text-red-500 text-sm mb-2">{sendError}</div>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCloseMessage} disabled={sending}>Cancel</Button>
              <Button onClick={handleSendMessage} disabled={sending || !messageContent.trim()}>{sending ? "Sending..." : "Send"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
