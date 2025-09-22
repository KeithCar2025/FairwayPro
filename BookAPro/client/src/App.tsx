import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import CoachRegistration from "@/pages/coach-registration";
import AdminDashboard from "@/pages/admin-dashboard";
import Profile from "@/pages/profile";
import MyBookings from "@/pages/my-bookings";
import Inbox from "@/pages/inbox";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import SearchFilters, { FilterState } from "@/components/SearchFilters";
import CoachList from "@/components/CoachList";
import BookingModal, { BookingData } from "@/components/BookingModal";
import CoachProfile from "@/components/CoachProfile";
import AuthModal from "@/components/AuthModal";
import { Coach } from "@/components/CoachCard";
import maleCoachImage from '@assets/generated_images/Male_golf_coach_headshot_893584c9.png';
import femaleCoachImage from '@assets/generated_images/Female_golf_coach_headshot_05d9fb5a.png';
import seniorCoachImage from '@assets/generated_images/Senior_golf_coach_headshot_d3798356.png';

// TODO: remove mock functionality
const mockCoaches: Coach[] = [
  {
    id: '1',
    name: 'Michael Johnson',
    image: maleCoachImage,
    rating: 4.8,
    reviewCount: 127,
    distance: '2.3 miles',
    pricePerHour: 85,
    bio: 'PGA Professional with over 15 years of experience teaching golfers of all skill levels. I specialize in helping students develop proper fundamentals while building confidence on the course. My teaching philosophy focuses on creating a relaxed learning environment where students can improve at their own pace.',
    specialties: ['Swing Analysis', 'Putting', 'Course Strategy', 'Mental Game'],
    location: 'Pine Valley Golf Club',
    responseTime: '2 hours',
    availability: 'Available this week',
    tools: ['TrackMan 4', 'V1 Video Analysis', 'SAM PuttLab'],
    certifications: ['PGA Class A Professional', 'TPI Certified'],
    yearsExperience: 15,
    videos: [{ id: '1', title: 'Swing Fundamentals', thumbnail: maleCoachImage, duration: '3:45', description: 'Basic swing mechanics' }],
    googleReviewsUrl: 'https://g.page/r/pine-valley-golf/review',
    googleRating: 4.6,
    googleReviewCount: 89,
    lastGoogleSync: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    name: 'Sarah Williams',
    image: femaleCoachImage,
    rating: 4.9,
    reviewCount: 89,
    distance: '3.7 miles',
    pricePerHour: 95,
    bio: 'LPGA Teaching Professional specializing in junior development and women\'s golf. I believe in making golf fun and accessible for players of all ages and skill levels. My lessons focus on building confidence through proper fundamentals and positive reinforcement.',
    specialties: ['Junior Programs', 'Short Game', 'Mental Game', 'Putting', 'Course Strategy'],
    location: 'Oakwood Country Club',
    responseTime: '1 hour',
    availability: 'Available today',
    tools: ['FlightScope X3', 'OnForm Video App', 'SKLZ Training Aids'],
    certifications: ['LPGA Class A Professional', 'PGA Junior Certified'],
    yearsExperience: 12
  },
  {
    id: '3',
    name: 'Robert Chen',
    image: seniorCoachImage,
    rating: 4.7,
    reviewCount: 203,
    distance: '5.1 miles',
    pricePerHour: 120,
    bio: 'Former PGA Tour player with 25+ years of teaching experience. Having competed at the highest level, I bring tour-proven techniques and strategies to help serious golfers reach their potential. Specializing in advanced shot-making and course management.',
    specialties: ['Tournament Prep', 'Advanced Techniques', 'Course Management', 'Swing Analysis', 'Mental Game'],
    location: 'Championship Links',
    responseTime: '3 hours',
    availability: 'Available next week',
    tools: ['GC Quad Launch Monitor', 'Foresight Sports', 'K-Coach Video Analysis', 'BodiTrak Pressure Mat'],
    certifications: ['Former PGA Tour Player', 'Master Professional'],
    yearsExperience: 25,
    googleReviewsUrl: 'https://g.page/r/championship-links-golf/review',
    googleRating: 4.9,
    googleReviewCount: 156,
    lastGoogleSync: '2024-01-18T14:20:00Z'
  },
  {
    id: '4',
    name: 'Jennifer Martinez',
    image: femaleCoachImage,
    rating: 4.9,
    reviewCount: 156,
    distance: '4.2 miles',
    pricePerHour: 75,
    bio: 'PGA Teaching Professional passionate about helping beginners fall in love with golf. I create comfortable, encouraging environments where students can learn without pressure. My patient approach helps nervous beginners become confident golfers.',
    specialties: ['Beginner Instruction', 'Short Game', 'Putting', 'Golf Etiquette'],
    location: 'Green Meadows Golf Course',
    responseTime: '1 hour',
    availability: 'Available this week',
    tools: ['Mirror Training Aid', 'Alignment Sticks', 'Impact Bag', 'Basic Video Setup'],
    certifications: ['PGA Class A Professional', 'Get Golf Ready Instructor'],
    yearsExperience: 8
  },
  {
    id: '5',
    name: 'David Thompson',
    image: maleCoachImage,
    rating: 4.6,
    reviewCount: 91,
    distance: '6.8 miles',
    pricePerHour: 110,
    bio: 'Certified TPI (Titleist Performance Institute) instructor focusing on the physical aspects of golf. I combine technical instruction with fitness and mobility training to help golfers play their best while staying injury-free.',
    specialties: ['Swing Analysis', 'Fitness Training', 'Injury Prevention', 'Advanced Techniques'],
    location: 'Elite Golf Academy',
    responseTime: '4 hours',
    availability: 'Available next week',
    tools: ['3D Motion Capture', 'TPI Screen Tools', 'Resistance Bands', 'K-Vest 3D Analysis'],
    certifications: ['TPI Certified Level 3', 'NASM Certified Trainer'],
    yearsExperience: 10
  }
];

function HomePage() {
  const [searchLocation, setSearchLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [filtersVisible, setFiltersVisible] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    priceRange: [25, 200],
    rating: 'any',
    specialties: [],
    availability: 'any',
    experience: 'any',
    sortBy: 'distance'
  });

  // Filter and sort coaches based on current filters
  const getFilteredAndSortedCoaches = () => {
    let filteredCoaches = [...mockCoaches];

    // Apply price range filter
    filteredCoaches = filteredCoaches.filter(coach => 
      coach.pricePerHour >= filters.priceRange[0] && 
      coach.pricePerHour <= filters.priceRange[1]
    );

    // Apply minimum rating filter
    if (filters.rating !== 'any') {
      const minRating = parseFloat(filters.rating);
      filteredCoaches = filteredCoaches.filter(coach => coach.rating >= minRating);
    }

    // Apply specialties filter
    if (filters.specialties.length > 0) {
      filteredCoaches = filteredCoaches.filter(coach => 
        filters.specialties.some(specialty => 
          coach.specialties.includes(specialty)
        )
      );
    }

    // Apply experience filter
    if (filters.experience !== 'any') {
      const minYears = parseInt(filters.experience.replace('+', ''));
      filteredCoaches = filteredCoaches.filter(coach => 
        coach.yearsExperience >= minYears
      );
    }

    // Apply availability filter
    if (filters.availability !== 'any') {
      filteredCoaches = filteredCoaches.filter(coach => {
        const availability = coach.availability.toLowerCase();
        switch (filters.availability) {
          case 'today':
            return availability.includes('today');
          case 'week':
            return availability.includes('week');
          case 'weekend':
            return availability.includes('weekend');
          default:
            return true;
        }
      });
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'rating':
        filteredCoaches.sort((a, b) => b.rating - a.rating);
        break;
      case 'price_low':
        filteredCoaches.sort((a, b) => a.pricePerHour - b.pricePerHour);
        break;
      case 'price_high':
        filteredCoaches.sort((a, b) => b.pricePerHour - a.pricePerHour);
        break;
      case 'reviews':
        filteredCoaches.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      case 'distance':
      default:
        // Keep original order for distance (mock data doesn't have numeric distance)
        break;
    }

    return filteredCoaches;
  };

  const coaches = getFilteredAndSortedCoaches();

  const handleSearch = (location: string) => {
    setSearchLocation(location);
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      console.log(`Searching for coaches in ${location}`);
    }, 1500);
  };

  const handleViewProfile = (coach: Coach) => {
    setSelectedCoach(coach);
    setShowProfileModal(true);
  };

  const handleBookLesson = (coach: Coach) => {
    setSelectedCoach(coach);
    setShowBookingModal(true);
  };

  const handleBookingConfirm = (bookingData: BookingData) => {
    console.log('Booking confirmed:', bookingData);
    setShowBookingModal(false);
    setSelectedCoach(null);
  };

  const handleAuth = async (type: 'login' | 'signup', data: any) => {
    console.log(`${type} attempt:`, data);
    
    try {
      const endpoint = type === 'signup' ? '/api/auth/register' : '/api/auth/login';
      const payload = { email: data.email, password: data.password };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `${type} failed`);
      }

      const result = await response.json();
      console.log(`${type} successful:`, result);
      
      // Close modal on success
      setShowAuthModal(false);
      
      // Reload the page to update the UI with the logged-in state
      window.location.reload();
      
    } catch (error) {
      console.error(`${type} error:`, error);
      alert(error instanceof Error ? error.message : `${type} failed`);
    }
  };

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    console.log('Filters changed:', newFilters);
    console.log('Filtered coaches count:', getFilteredAndSortedCoaches().length);
  };

  const handleClearFilters = () => {
    const clearedFilters: FilterState = {
      priceRange: [25, 200],
      rating: 'any',
      specialties: [],
      availability: 'any',
      experience: 'any',
      sortBy: 'distance'
    };
    setFilters(clearedFilters);
    console.log('Filters cleared');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onSearch={handleSearch}
        onAuthClick={() => setShowAuthModal(true)}
      />
      
      <HeroSection onSearch={handleSearch} />
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <aside className="w-80 flex-shrink-0 hidden lg:block">
            <SearchFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
              isVisible={true}
              onToggle={() => {}}
            />
          </aside>
          
          {/* Results */}
          <main className="flex-1">
            {/* Mobile Filters */}
            <div className="lg:hidden mb-6">
              <SearchFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onClearFilters={handleClearFilters}
                isVisible={filtersVisible}
                onToggle={() => setFiltersVisible(!filtersVisible)}
              />
            </div>
            
            <CoachList
              coaches={coaches}
              isLoading={isLoading}
              onViewProfile={handleViewProfile}
              onBookLesson={handleBookLesson}
            />
          </main>
        </div>
      </div>

      {/* Modals */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuth={handleAuth}
      />
      
      <BookingModal
        coach={selectedCoach}
        isOpen={showBookingModal}
        onClose={() => {
          setShowBookingModal(false);
          setSelectedCoach(null);
        }}
        onBook={handleBookingConfirm}
      />
      
      <CoachProfile
        coach={selectedCoach}
        isOpen={showProfileModal}
        onClose={() => {
          setShowProfileModal(false);
          setSelectedCoach(null);
        }}
        onBookLesson={handleBookLesson}
      />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/coach-registration" component={CoachRegistration} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/profile" component={Profile} />
      <Route path="/my-bookings" component={MyBookings} />
      <Route path="/inbox" component={Inbox} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen flex flex-col">
          <div className="flex-1">
            <Router />
          </div>
          <Footer />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;