import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    name: string;
    image?: string;
  };
  student?: {
    id?: string; // Make sure id is present for message button
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

  // Modal/message state for coach
  const [messageTo, setMessageTo] = useState<{ id: string; name: string } | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchTerm, statusFilter, currentUser]);

  const loadBookings = async () => {
    try {
      // Check authentication
      const authResponse = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      if (!authResponse.ok) {
        setLocation('/');
        return;
      }
      const authData = await authResponse.json();
      setCurrentUser(authData.user);

      // Load bookings
      const bookingsResponse = await fetch('/api/bookings/my-bookings', {
        credentials: 'include',
      });

      if (bookingsResponse.ok) {
        const bookingsData = await bookingsResponse.json();
        setBookings(bookingsData.bookings || []);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterBookings = () => {
    let filtered = bookings;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(booking => 
        (currentUser?.role === 'coach' ? booking.student?.name : booking.coach?.name)
          ?.toLowerCase().includes(term) ||
        booking.location.toLowerCase().includes(term) ||
        booking.lessonType.toLowerCase().includes(term)
      );
    }

    setFilteredBookings(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'default';
      case 'pending': return 'secondary';
      case 'completed': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getUpcomingBookings = () => {
    const now = new Date();
    return filteredBookings.filter(booking => {
      const bookingDate = new Date(booking.date);
      return bookingDate >= now && booking.status !== 'cancelled' && booking.status !== 'completed';
    });
  };

  const getPastBookings = () => {
    const now = new Date();
    return filteredBookings.filter(booking => {
      const bookingDate = new Date(booking.date);
      return bookingDate < now || booking.status === 'completed';
    });
  };

  const getCancelledBookings = () => {
    return filteredBookings.filter(booking => booking.status === 'cancelled');
  };

  // Coach-only messaging modal handlers
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
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          receiverId: messageTo.id,
          content: messageContent
        })
      });
      if (!res.ok) {
        const data = await res.json();
        setSendError(data.error || "Failed to send message");
      } else {
        handleCloseMessage();
      }
    } catch (err) {
      setSendError("Failed to send message");
    }
    setSending(false);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-pulse">Loading bookings...</div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  const upcomingBookings = getUpcomingBookings();
  const pastBookings = getPastBookings();
  const cancelledBookings = getCancelledBookings();

  // Helper: get display name for lesson (student for coach, coach for student)
  const getLessonWithName = (booking: Booking) =>
    currentUser.role === 'coach'
      ? booking.student?.name || "Unknown Student"
      : booking.coach?.name || "Unknown Coach";

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">
              My Bookings
            </h1>
            <p className="text-muted-foreground">
              Manage your golf lesson bookings
            </p>
          </div>
          <Link href="/profile">
            <Button variant="outline" data-testid="button-back-to-profile">
              Back to Profile
            </Button>
          </Link>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by name, location, or lesson type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-bookings"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-border rounded-md bg-background"
                  data-testid="select-status-filter"
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

        {/* Bookings Tabs */}
        <Tabs defaultValue="upcoming" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upcoming" data-testid="tab-upcoming">
              Upcoming ({upcomingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="past" data-testid="tab-past">
              Past ({pastBookings.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled" data-testid="tab-cancelled">
              Cancelled ({cancelledBookings.length})
            </TabsTrigger>
          </TabsList>

          {/* Upcoming Bookings */}
          <TabsContent value="upcoming" className="space-y-4">
            {upcomingBookings.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No upcoming bookings</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Your upcoming lessons will appear here
                  </p>
                  <Link href="/">
                    <Button>Find Coaches</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <Card key={booking.id} className="hover-elevate">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">
                              Lesson with {getLessonWithName(booking)}
                            </h3>
                            <Badge variant={getStatusColor(booking.status)}>
                              {booking.status}
                            </Badge>
                            {/* Only show Message button if coach and student id exists */}
                            {(currentUser.role === 'coach' && booking.student?.id) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="ml-2"
                                onClick={() => handleOpenMessage(booking.student!)}
                                data-testid={`button-message-${booking.id}`}
                              >
                                <MessageCircle className="w-4 h-4 mr-2" />
                                Message
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {new Date(booking.date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              {booking.time} ({booking.duration} min)
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              {booking.location}
                            </div>
                          </div>
                          <div className="mt-2">
                            <Badge variant="outline">{booking.lessonType}</Badge>
                          </div>
                          {booking.notes && (
                            <p className="mt-3 text-sm text-muted-foreground">
                              <strong>Notes:</strong> {booking.notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg text-primary">
                            ${booking.totalAmount}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Past Bookings */}
          <TabsContent value="past" className="space-y-4">
            {pastBookings.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No past bookings</p>
                  <p className="text-sm text-muted-foreground">
                    Your completed lessons will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pastBookings.map((booking) => (
                  <Card key={booking.id} className="opacity-90">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">
                              Lesson with {getLessonWithName(booking)}
                            </h3>
                            <Badge variant={getStatusColor(booking.status)}>
                              {booking.status}
                            </Badge>
                            {(currentUser.role === 'coach' && booking.student?.id) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="ml-2"
                                onClick={() => handleOpenMessage(booking.student!)}
                                data-testid={`button-message-${booking.id}`}
                              >
                                <MessageCircle className="w-4 h-4 mr-2" />
                                Message
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {new Date(booking.date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              {booking.time} ({booking.duration} min)
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              {booking.location}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary">
                            ${booking.totalAmount}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Cancelled Bookings */}
          <TabsContent value="cancelled" className="space-y-4">
            {cancelledBookings.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">No cancelled bookings</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {cancelledBookings.map((booking) => (
                  <Card key={booking.id} className="opacity-75">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold line-through">
                              Lesson with {getLessonWithName(booking)}
                            </h3>
                            <Badge variant={getStatusColor(booking.status)}>
                              {booking.status}
                            </Badge>
                            {(currentUser.role === 'coach' && booking.student?.id) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="ml-2"
                                onClick={() => handleOpenMessage(booking.student!)}
                                data-testid={`button-message-${booking.id}`}
                              >
                                <MessageCircle className="w-4 h-4 mr-2" />
                                Message
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {new Date(booking.date).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              {booking.time} ({booking.duration} min)
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              {booking.location}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold line-through text-muted-foreground">
                            ${booking.totalAmount}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* --- Message Modal (coach only) --- */}
        {(currentUser.role === 'coach' && messageTo) && (
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
                <Button variant="outline" onClick={handleCloseMessage} disabled={sending}>
                  Cancel
                </Button>
                <Button onClick={handleSendMessage} loading={sending} disabled={sending || !messageContent.trim()}>
                  Send
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}