import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, MessageCircle, User, LogOut, Edit, Mail } from "lucide-react";
import { Link } from "wouter";

interface User {
  id: string;
  email: string;
  role: string;
}

interface Student {
  id: string;
  name: string;
  phone?: string;
  skillLevel?: string;
  preferences?: string;
}

interface Coach {
  id: string;
  name: string;
  bio: string;
  location: string;
  pricePerHour: string;
  rating: string;
  reviewCount: number;
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
  coach?: {
    name: string;
    image?: string;
  };
  student?: {
    name: string;
  };
}

export default function Profile() {
  const [, setLocation] = useLocation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [studentProfile, setStudentProfile] = useState<Student | null>(null);
  const [coachProfile, setCoachProfile] = useState<Coach | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
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

      // Load profile data based on role
      if (authData.user.role === 'student') {
        await loadStudentProfile(authData.user.id);
      } else if (authData.user.role === 'coach') {
        await loadCoachProfile(authData.user.id);
      }

      // Load bookings
      await loadBookings();

      // Load unread messages count
      await loadUnreadMessagesCount();
    } catch (error) {
      console.error('Error loading profile:', error);
      setLocation('/');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStudentProfile = async (userId: string) => {
    try {
      const response = await fetch(`/api/students/profile/${userId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setStudentProfile(data.student);
      }
    } catch (error) {
      console.error('Error loading student profile:', error);
    }
  };

  const loadCoachProfile = async (userId: string) => {
    try {
      const response = await fetch(`/api/coaches/profile/${userId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setCoachProfile(data.coach);
      }
    } catch (error) {
      console.error('Error loading coach profile:', error);
    }
  };

  const loadBookings = async () => {
    try {
      const response = await fetch('/api/bookings/my-bookings', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings || []);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };

  const loadUnreadMessagesCount = async () => {
    try {
      const response = await fetch('/api/messages/unread-count', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setUnreadMessagesCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error loading unread messages count:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        setLocation('/');
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

 const handleEditProfile = () => {
  if (currentUser?.role === "coach") {
    setLocation("/coach/edit-profile");
  } else if (currentUser?.role === "student") {
    setLocation("/student/edit-profile");
  }
  // Optionally handle admin or other roles
};

  const getUserDisplayName = () => {
    if (studentProfile) return studentProfile.name;
    if (coachProfile) return coachProfile.name;
    if (currentUser) return currentUser.email.split('@')[0];
    return 'User';
  };

  const getUserInitials = () => {
    const name = getUserDisplayName();
    return name.slice(0, 2).toUpperCase();
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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Profile Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-2xl" data-testid="text-username">
                  {getUserDisplayName()}
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {currentUser.email}
                  <Badge variant="outline" className="ml-2 capitalize">
                    {currentUser.role}
                  </Badge>
                </CardDescription>
                {studentProfile?.skillLevel && (
                  <div className="mt-2">
                    <Badge variant="secondary">
                      {studentProfile.skillLevel} level
                    </Badge>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Call the edit profile page based on role */}
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="button-edit-profile"
                  onClick={handleEditProfile}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  data-testid="button-signout-profile"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="hover-elevate">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                My Bookings
              </CardTitle>
              <CardDescription>
                View and manage your lesson bookings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {bookings.filter(b => b.status !== 'cancelled').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Active bookings</p>
                </div>
                <Link href="/my-bookings">
                  <Button data-testid="button-view-bookings">
                    View All
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Inbox
                {unreadMessagesCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadMessagesCount}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Messages from your coaches
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-primary">
                    {unreadMessagesCount}
                  </p>
                  <p className="text-sm text-muted-foreground">Unread messages</p>
                </div>
                <Link href="/inbox">
                  <Button data-testid="button-view-messages">
                    View Inbox
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Bookings */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
            <CardDescription>
              Your latest lesson bookings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No bookings yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Start by finding a coach and booking your first lesson
                </p>
                <Link href="/">
                  <Button>Find Coaches</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.slice(0, 3).map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">
                            {currentUser.role === 'coach' ? booking.student?.name : booking.coach?.name}
                          </p>
                          <Badge variant={getStatusColor(booking.status)}>
                            {booking.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(booking.date).toLocaleDateString()} at {booking.time}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {booking.duration} minutes • {booking.location}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${booking.totalAmount}</p>
                    </div>
                  </div>
                ))}
                {bookings.length > 3 && (
                  <div className="text-center">
                    <Link href="/my-bookings">
                      <Button variant="outline">View All Bookings</Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}