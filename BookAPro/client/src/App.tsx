import { useState } from "react";
import { useQuery, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import SearchFilters, { FilterState } from "@/components/SearchFilters";
import CoachList, { Coach } from "@/components/CoachList";
import BookingModal, { BookingData } from "@/components/BookingModal";
import CoachProfile from "@/components/CoachProfile";
import AuthModal from "@/components/AuthModal";

import maleCoachImage from "@assets/generated_images/Male_golf_coach_headshot_893584c9.png";
import femaleCoachImage from "@assets/generated_images/Female_golf_coach_headshot_05d9fb5a.png";
import seniorCoachImage from "@assets/generated_images/Senior_golf_coach_headshot_d3798356.png";

import { Switch, Route } from "wouter";

// Import all pages from client/src/pages/ as shown in ![image1](image1)
import AdminDashboard from "@/pages/admin-dashboard";
import CoachRegistration from "@/pages/coach-registration";
import Inbox from "@/pages/inbox";
import MyBookings from "@/pages/my-bookings";
import NotFound from "@/pages/not-found";
import Profile from "@/pages/profile";
import CoachEditProfile from "@/components/CoachEditProfile";

// ------------------ Mock Coaches (keep for now) ------------------
const mockCoaches: Coach[] = [
  {
    id: "1",
    name: "John Doe",
    image: maleCoachImage,
    rating: 4.8,
    reviewCount: 25,
    distance: "2 miles",
    pricePerHour: 80,
    bio: "Experienced golf coach",
    specialties: ["Driving", "Putting"],
    location: "New York, NY",
    responseTime: "24h",
    availability: "Available soon",
    tools: ["Launch Monitor"],
    certifications: ["PGA"],
    yearsExperience: 10,
    videos: [],
    googleReviewsUrl: "",
    googleRating: 4.7,
    googleReviewCount: 20,
    lastGoogleSync: "",
  },
  // Add more mock coaches as needed
];

// ------------------ React Query Client ------------------
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/coach-registration" component={CoachRegistration} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/inbox" component={Inbox} />
          <Route path="/my-bookings" component={MyBookings} />
          <Route path="/profile" component={Profile} />
          <Route path="/404" component={NotFound} />
		  <Route path="/coach/edit-profile" component={CoachEditProfile} />
          {/* Optionally, catch all unmatched routes */}
          <Route>
            <NotFound />
          </Route>
        </Switch>
        <Footer />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

function HomePage() {
  const [searchLocation, setSearchLocation] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    priceRange: [25, 200],
    rating: "any",
    specialties: [],
    availability: "any",
    experience: "any",
    sortBy: "distance",
  });

  // ------------------ Fetch approved coaches ------------------
const { data: approvedCoaches = [], isLoading, error } = useQuery<Coach[]>({
  queryKey: ["approvedCoaches"],
  queryFn: async () => {
    const res = await fetch("/api/coaches");
    if (!res.ok) throw new Error("Failed to fetch coaches from server");
    const data = await res.json();

    // Map DB fields to frontend Coach type using correct column names!
return data.map((c: any) => ({
  id: c.id,
  name: c.name,
  image: c.image || maleCoachImage,
  rating: c.rating || 0,
  reviewCount: c.reviewCount || 0,
  distance: c.distance || "Unknown",
  pricePerHour: c.pricePerHour ?? 50,          // <-- camelCase from backend
  bio: c.bio || "",
  specialties: c.specialties || [],
  location: c.location || "",
  responseTime: c.responseTime || "Unknown",    // <-- camelCase from backend
  availability: c.availability || "Available soon",
  tools: c.tools || [],
  certifications: c.certifications || [],
  yearsExperience: c.yearsExperience ?? 0,     // <-- camelCase from backend
  videos: c.videos || [],
  googleReviewsUrl: c.googleReviewsUrl || "",
  googleRating: c.googleRating || 0,
  googleReviewCount: c.googleReviewCount || 0,
  lastGoogleSync: c.lastGoogleSync || "",
}));
  },
});


  if (error) console.error(error);

  const allCoaches = [...mockCoaches, ...approvedCoaches];

  // ------------------ Filter & sort logic ------------------
  const getFilteredAndSortedCoaches = () => {
    let filtered = [...allCoaches];

    // Price filter
    filtered = filtered.filter(
      (c) => c.pricePerHour >= filters.priceRange[0] && c.pricePerHour <= filters.priceRange[1]
    );

    // Rating filter
    if (filters.rating !== "any") filtered = filtered.filter((c) => c.rating >= parseFloat(filters.rating));

    // Specialties filter
    if (filters.specialties.length > 0)
      filtered = filtered.filter((c) => filters.specialties.some((s) => c.specialties.includes(s)));

    // Experience filter
    if (filters.experience !== "any")
      filtered = filtered.filter((c) => c.yearsExperience >= parseInt(filters.experience.replace("+", "")));

    // Availability filter
    if (filters.availability !== "any") {
      filtered = filtered.filter((c) => {
        const avail = c.availability.toLowerCase();
        switch (filters.availability) {
          case "today":
            return avail.includes("today");
          case "week":
            return avail.includes("week");
          case "weekend":
            return avail.includes("weekend");
          default:
            return true;
        }
      });
    }

    // Sort
    switch (filters.sortBy) {
      case "rating":
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case "price_low":
        filtered.sort((a, b) => a.pricePerHour - b.pricePerHour);
        break;
      case "price_high":
        filtered.sort((a, b) => b.pricePerHour - b.pricePerHour);
        break;
      case "reviews":
        filtered.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      default:
        break;
    }

    return filtered;
  };

  const coaches = getFilteredAndSortedCoaches();

  // ------------------ Handlers ------------------
  const handleViewProfile = (coach: Coach) => {
    setSelectedCoach(coach);
    setShowProfileModal(true);
  };
  const handleBookLesson = (coach: Coach) => {
    setSelectedCoach(coach);
    setShowBookingModal(true);
  };
  const handleBookingConfirm = (bookingData: BookingData) => {
    setShowBookingModal(false);
    setSelectedCoach(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onAuthClick={() => setShowAuthModal(true)} onSearch={setSearchLocation} />
      <HeroSection onSearch={(loc) => setSearchLocation(loc)} />
      <div className="container mx-auto px-4 py-8 flex gap-8">
        {/* Filters */}
        <aside className="w-80 flex-shrink-0 hidden lg:block">
          <SearchFilters
            filters={filters}
            onFiltersChange={setFilters}
            onClearFilters={() =>
              setFilters({
                priceRange: [25, 200],
                rating: "any",
                specialties: [],
                availability: "any",
                experience: "any",
                sortBy: "distance",
              })
            }
            isVisible={true}
            onToggle={() => {}}
          />
        </aside>

        <main className="flex-1">
          <div className="lg:hidden mb-6">
            <SearchFilters
              filters={filters}
              onFiltersChange={setFilters}
              onClearFilters={() =>
                setFilters({
                  priceRange: [25, 200],
                  rating: "any",
                  specialties: [],
                  availability: "any",
                  experience: "any",
                  sortBy: "distance",
                })
              }
              isVisible={filtersVisible}
              onToggle={() => setFiltersVisible(!filtersVisible)}
            />
          </div>

          <CoachList coaches={coaches} isLoading={isLoading} onViewProfile={handleViewProfile} onBookLesson={handleBookLesson} />
        </main>
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onAuth={() => {}} />
      <BookingModal coach={selectedCoach} isOpen={showBookingModal} onClose={() => setShowBookingModal(false)} onBook={handleBookingConfirm} />
      <CoachProfile coach={selectedCoach} isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} onBookLesson={handleBookLesson} />
    </div>
  );
}