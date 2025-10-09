import { useState, useEffect, useMemo } from "react";
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
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Pages
import AdminDashboard from "@/pages/admin-dashboard";
import CoachRegistration from "@/pages/coach-registration";
import Inbox from "@/pages/inbox";
import MyBookings from "@/pages/my-bookings";
import NotFound from "@/pages/not-found";
import Profile from "@/pages/profile";
import CoachEditProfile from "@/components/CoachEditProfile";

// ------------------ React Query Client ------------------
const queryClient = new QueryClient();

/**
 * Helper: resolveImageUrl
 * Returns a browser-fetchable absolute URL string from various raw image forms.
 */
function resolveImageUrl(rawImage: any): string | null {
  if (!rawImage) return null;
  if (typeof rawImage !== "string") return null;

  // Already a full external URL
  if (/^https?:\/\//i.test(rawImage)) return rawImage;

  // Absolute path on same origin
  if (rawImage.startsWith("/")) {
    if (typeof window !== "undefined") return `${window.location.origin}${rawImage}`;
    return rawImage;
  }

  // Relative storage key -> proxy through /objects
  const encodedPath = rawImage.split("/").map(encodeURIComponent).join("/");
  return typeof window !== "undefined" ? `${window.location.origin}/objects/${encodedPath}` : `/objects/${encodedPath}`;
}

/**
 * Haversine distance between two coords in miles
 */
function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Extend the Coach type to include coordinates
type CoachWithGeo = Coach & {
  latitude?: number;
  longitude?: number;
  distanceMiles?: number;
};

function AuthModalMount() {
  const { isAuthModalOpen, closeAuthModal } = useAuth();
  return <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
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
            <Route>
              <NotFound />
            </Route>
          </Switch>
          <Footer />
          <AuthModalMount />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

function HomePage() {
  const [searchLocation, setSearchLocation] = useState("");
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

  // Geolocation state
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "prompt" | "granted" | "denied" | "unsupported" | "error">("idle");
  const [geoErrorMsg, setGeoErrorMsg] = useState<string | null>(null);

  // Get auth helpers from context
  const { user, pendingAction, setPendingAction, openAuthModal } = useAuth();

  // Request current position
  const requestLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("unsupported");
      setGeoErrorMsg("Geolocation is not supported by this browser.");
      return;
    }

    setGeoErrorMsg(null);
    setGeoStatus("granted"); // Optimistic update

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus("granted");
      },
      (err) => {
        console.error("Geolocation error:", err);
        
        if (err.code === 1) { // PERMISSION_DENIED
          setGeoStatus("denied");
          setGeoErrorMsg("Location permission denied. Enable it in your browser settings to see distances.");
        } else if (err.code === 2) { // POSITION_UNAVAILABLE
          setGeoStatus("error");
          setGeoErrorMsg("Location position unavailable. Try again.");
        } else if (err.code === 3) { // TIMEOUT
          setGeoStatus("error");
          setGeoErrorMsg("Location request timed out. Try again.");
        } else {
          setGeoStatus("error");
          setGeoErrorMsg(err.message || "Failed to get your location.");
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000,
      }
    );
  };

  // Initialize permission state
  useEffect(() => {
    if (typeof navigator === "undefined") return;

    if (!("geolocation" in navigator)) {
      setGeoStatus("unsupported");
      setGeoErrorMsg("Geolocation is not supported by this browser.");
      return;
    }

    // Use Permissions API when available
    if ("permissions" in navigator && (navigator.permissions as any)?.query) {
      (navigator.permissions as any)
        .query({ name: "geolocation" as PermissionName })
        .then((status: any) => {
          setGeoStatus(status.state); // "granted" | "prompt" | "denied"
          if (status.state === "granted") {
            requestLocation();
          }
          status.onchange = () => {
            setGeoStatus(status.state);
            if (status.state === "granted") requestLocation();
          };
        })
        .catch(() => {
          // Fallback to prompt flow
          setGeoStatus("prompt");
        });
    } else {
      setGeoStatus("prompt");
    }
  }, []);

  // ------------------ Fetch approved coaches ------------------
  const { data: approvedCoachesRaw = [], isLoading, error } = useQuery<any[]>({
    queryKey: ["approvedCoaches"],
    queryFn: async () => {
      const res = await fetch("/api/coaches");
      if (!res.ok) throw new Error("Failed to fetch coaches from server");
      return res.json();
    },
  });

  // Map DB fields to Coach objects, keeping lat/lng for distance calc
  const approvedCoaches: CoachWithGeo[] = useMemo(() => {
    return approvedCoachesRaw.map((c: any): CoachWithGeo => {
      const resolved = resolveImageUrl(c.image ?? c.image_path ?? c.profile_image ?? "");
      const fallback = maleCoachImage;
      
      // Ensure latitude/longitude are proper numbers (not strings or null)
      const lat = c.latitude !== undefined && c.latitude !== null ? Number(c.latitude) : undefined;
      const lng = c.longitude !== undefined && c.longitude !== null ? Number(c.longitude) : undefined;

      return {
        id: c.id,
        userId: c.user_id ?? c.userId,
        name: c.name,
        image: resolved || fallback,
        rating: c.rating || 0,
        reviewCount: c.review_count ?? c.reviewCount ?? 0,
        distance: "Unknown", // Will be computed later
        pricePerHour: c.price_per_hour ?? c.pricePerHour ?? 50,
        bio: c.bio || "",
        specialties: c.specialties || [],
        location: c.location || "",
        responseTime: c.response_time ?? c.responseTime ?? "Unknown",
        availability: c.availability || "Available soon",
        tools: c.tools || [],
        certifications: c.certifications || [],
        yearsExperience: c.years_experiance ?? c.years_experience ?? c.yearsExperience ?? 0,
        videos: c.videos || [],
        googleReviewsUrl: c.google_reviews_url ?? c.googleReviewsUrl ?? "",
        googleRating: c.google_rating ?? c.googleRating ?? 0,
        googleReviewCount: c.google_review_count ?? c.googleReviewCount ?? 0,
        lastGoogleSync: c.last_google_sync ?? c.lastGoogleSync ?? "",
        // Store coords in standard latitude/longitude props that CoachCard expects
        latitude: lat,
        longitude: lng,
      };
    });
  }, [approvedCoachesRaw]);

  if (error) console.error(error);

  // Optional: mock coach list
  const mockCoaches: CoachWithGeo[] = useMemo(
    () => [
      {
        id: "mock-1",
        name: "John Doe (Demo)",
        image: maleCoachImage,
        rating: 4.8,
        reviewCount: 25,
        distance: "Unknown",
        pricePerHour: 80,
        bio: "Experienced golf coach",
        specialties: ["Driving", "Putting"],
        location: "Dublin, Ireland",
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
        // Example lat/lng for Dublin
        latitude: 53.3498, 
        longitude: -6.2603
      },
    ],
    []
  );

  // Merge mock + approved
  const allCoaches: CoachWithGeo[] = useMemo(
    () => [...mockCoaches, ...approvedCoaches],
    [approvedCoaches, mockCoaches]
  );

  // Compute distances for display/sort with better error handling
  const coachesWithDistance: CoachWithGeo[] = useMemo(() => {
    return allCoaches.map((c) => {
      const clat = c.latitude;
      const clng = c.longitude;

      let distanceMiles: number | undefined;
      let distanceLabel = "Unknown";

      try {
        if (userCoords && typeof clat === "number" && typeof clng === "number") {
          distanceMiles = haversineMiles(userCoords.lat, userCoords.lng, clat, clng);
          
          // Format distance nicely
          if (Number.isFinite(distanceMiles)) {
            distanceLabel = `${distanceMiles.toFixed(1)} miles`;
          }
        }
      } catch (err) {
        console.error(`Error calculating distance for ${c.name}:`, err);
      }

      return {
        ...c,
        distance: distanceLabel,
        distanceMiles,
      };
    });
  }, [allCoaches, userCoords]);

  // ------------------ Filter & sort logic ------------------
  const coaches: Coach[] = useMemo(() => {
    let filtered = [...coachesWithDistance];

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
        const avail = (c.availability || "").toLowerCase();
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
        filtered.sort((a, b) => b.pricePerHour - a.pricePerHour);
        break;
      case "reviews":
        filtered.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      case "distance":
      default: {
        filtered.sort((a, b) => {
          const da = (a as CoachWithGeo).distanceMiles;
          const db = (b as CoachWithGeo).distanceMiles;
          const aVal = typeof da === "number" ? da : Number.POSITIVE_INFINITY;
          const bVal = typeof db === "number" ? db : Number.POSITIVE_INFINITY;
          return aVal - bVal;
        });
        break;
      }
    }

    // Make sure these coaches ALL include latitude/longitude properties
    return filtered.map(c => ({
      ...c,
      // Always include latitude/longitude in what's passed to CoachCard
      latitude: (c as CoachWithGeo).latitude,
      longitude: (c as CoachWithGeo).longitude,
    }));
  }, [coachesWithDistance, filters]);

  // ------------------ Watch for pending auth actions ------------------
  useEffect(() => {
    if (user && pendingAction?.type === "book") {
      const coachToBook = coaches.find((c) => c.id === pendingAction.coachId);
      if (coachToBook) {
        setSelectedCoach(coachToBook);
        setShowBookingModal(true);
      }
      setPendingAction(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, pendingAction, coaches]);

  // ------------------ Handlers ------------------
  const handleViewProfile = (coach: Coach) => {
    setSelectedCoach(coach);
    setShowProfileModal(true);
  };
  const handleBookLesson = (coach: Coach) => {
    if (!user) {
      openAuthModal({ initialTab: "login", pendingAction: { type: "book", coachId: coach.id } });
      return;
    }
    setSelectedCoach(coach);
    setShowBookingModal(true);
  };
  const handleBookingConfirm = (_bookingData: BookingData) => {
    setShowBookingModal(false);
    setSelectedCoach(null);
  };

  // UI banner prompting for location permissions if needed
  const showGeoPrompt =
    geoStatus === "idle" ||
    geoStatus === "prompt" ||
    geoStatus === "denied" ||
    geoStatus === "unsupported" ||
    geoStatus === "error";

  return (
    <div className="min-h-screen bg-background">
      <Header onAuthClick={() => openAuthModal()} onSearch={setSearchLocation} />
      <HeroSection onSearch={(loc) => setSearchLocation(loc)} />

      {showGeoPrompt && (
        <div className="container mx-auto px-4 mt-4">
          <div className="rounded-md border bg-muted/40 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              {geoStatus === "granted" && !userCoords && "Determining your location..."}
              {geoStatus === "prompt" && "Enable your device location to see how far coaches are from you."}
              {geoStatus === "denied" &&
                "Location is blocked. Enable it in your browser settings to see distances."}
              {geoStatus === "unsupported" && "Your browser does not support geolocation."}
              {geoStatus === "error" && (geoErrorMsg || "Could not retrieve your location.")}
            </div>
            {(geoStatus === "prompt" || geoStatus === "denied" || geoStatus === "error") && (
              <button
                type="button"
                onClick={requestLocation}
                className="inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent"
              >
                Enable Location
              </button>
            )}
          </div>
        </div>
      )}

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

          <CoachList
            coaches={coaches}
            isLoading={isLoading}
            onViewProfile={handleViewProfile}
            onBookLesson={handleBookLesson}
          />
        </main>
      </div>

      <BookingModal
        coach={selectedCoach}
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        onBook={handleBookingConfirm}
      />
      <CoachProfile
        coach={selectedCoach}
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onBookLesson={handleBookLesson}
      />
    </div>
  );
}