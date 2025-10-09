import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MapPin, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import maleCoachImage from "@assets/generated_images/Male_golf_coach_headshot_893584c9.png";

/**
 * Normalize whatever is stored in coach.image into a URL the browser can fetch.
 * - If it's already a full URL (https://...) return as-is.
 * - If it's an absolute path ("/objects/..."), prefix origin.
 * - If it's a storage key like "profile-images/xxx.jpg", return server proxy /objects/<encoded>
 * This mirrors resolveImageUrl in App.tsx but kept local for robustness.
 */
function resolveImageUrl(rawImage: any): string | null {
  if (!rawImage) return null;
  if (typeof rawImage !== "string") return null;

  // Full URL -> use directly (works for public Supabase URLs)
  if (/^https?:\/\//i.test(rawImage)) return rawImage;

  // Absolute path on same origin -> prefix origin
  if (rawImage.startsWith("/")) {
    return typeof window !== "undefined" ? `${window.location.origin}${rawImage}` : rawImage;
  }

  // Treat as storage key (encode segments to preserve slashes)
  const encodedPath = rawImage.split("/").map(encodeURIComponent).join("/");
  return typeof window !== "undefined" ? `${window.location.origin}/objects/${encodedPath}` : `/objects/${encodedPath}`;
}

export interface Coach {
  id: string;       // coaches.id
  userId: string;   // users.id
  name: string;
  image?: string;
  rating: number;
  reviewCount: number;
  distance: string;
  pricePerHour: number;
  bio: string;
  specialties: string[];
  location: string;
  responseTime: string;
  availability: string;
  tools: string[];
  videos?: {
    id: string;
    title: string;
    thumbnail: string;
    duration: string;
    description: string;
  }[];
  certifications: string[];
  yearsExperience: number;
  googleReviewsUrl?: string;
  googleRating?: number;
  googleReviewCount?: number;
  lastGoogleSync?: string;
}

interface CoachCardProps {
  coach: Coach;
  onViewProfile: (coach: Coach) => void;
  onBookLesson: (coach: Coach) => void;
}

export default function CoachCard({ coach, onViewProfile, onBookLesson }: CoachCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { user, openAuthModal } = useAuth();

  // Track the image src locally so we can gracefully fallback on error
  const initialResolved = resolveImageUrl(coach.image) || "";
  const [imgSrc, setImgSrc] = useState<string>(initialResolved);

  // Keep imgSrc in sync if coach prop changes
  useEffect(() => {
    setImgSrc(resolveImageUrl(coach.image) || "");
  }, [coach.image]);

  // Debugging help: prints the resolved image being used for this card (remove in prod)
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.debug(`CoachCard[${coach.id}] image raw:`, coach.image, "resolved:", imgSrc);
  }, [coach.id, coach.image, imgSrc]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const handleBookClick = (e: React.MouseEvent) => {
    // Prevent card click bubbling (which opens profile)
    e.stopPropagation();

    if (user) {
      // Logged in -> continue booking flow
      onBookLesson(coach);
    } else {
      // Not logged in -> open the auth modal and attach a pending action so the app can continue after login
      openAuthModal({
        initialTab: "login",
        pendingAction: { type: "book", coachId: coach.id }
      });
    }
  };

  return (
    <Card
      className="hover-elevate cursor-pointer transition-all duration-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onViewProfile(coach)}
      data-testid={`card-coach-${coach.id}`}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Profile Image */}
         <Avatar className="w-16 h-16 border-2 border-primary/20">
  {imgSrc ? (
    <img
      src={imgSrc}
      alt={coach.name}
      className="w-full h-full object-cover rounded-full"
      onError={(e) => {
        const tgt = e.currentTarget as HTMLImageElement;
        // Avoid infinite loop if fallback also fails
        if (tgt.src.includes("Male_golf_coach_headshot")) return;
        tgt.src = maleCoachImage;
      }}
    />
  ) : null}
  <AvatarFallback className="bg-primary text-primary-foreground">
    {coach.name.split(' ').map(n => n[0]).join('')}
  </AvatarFallback>
</Avatar>

          {/* Coach Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-lg mb-1" data-testid={`text-coach-name-${coach.id}`}>
                  {coach.name}
                </h3>
                <div className="space-y-1 mb-2">
                  {/* Platform Rating */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      {renderStars(coach.rating)}
                    </div>
                    <span className="text-sm text-muted-foreground" data-testid={`text-rating-${coach.id}`}>
                      {coach.rating} ({coach.reviewCount} platform reviews)
                    </span>
                  </div>

                  {/* Google Reviews Rating */}
                  {coach.googleRating && coach.googleReviewCount && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        {renderStars(coach.googleRating)}
                      </div>
                      <span className="text-sm text-green-600 font-medium" data-testid={`text-google-rating-${coach.id}`}>
                        {coach.googleRating} Google ({coach.googleReviewCount} reviews)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-primary" data-testid={`text-price-${coach.id}`}>
                  ${coach.pricePerHour}
                </div>
                <div className="text-sm text-muted-foreground">per hour</div>
              </div>
            </div>

            {/* Location & Distance */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{coach.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{coach.distance} away</span>
              </div>
            </div>

            {/* Bio */}
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {coach.bio}
            </p>

            {/* Tools & Equipment */}
            {coach.tools && coach.tools.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-xs font-medium text-muted-foreground">TOOLS:</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {coach.tools.slice(0, 3).map((tool, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tool}
                    </Badge>
                  ))}
                  {coach.tools.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{coach.tools.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Specialties */}
            <div className="flex flex-wrap gap-1 mb-4">
              {coach.specialties.slice(0, 3).map((specialty, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {specialty}
                </Badge>
              ))}
              {coach.specialties.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{coach.specialties.length - 3} more
                </Badge>
              )}
            </div>

            {/* Response Time */}
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
              <Clock className="w-4 h-4" />
              <span>Responds in {coach.responseTime}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewProfile(coach);
                }}
                data-testid={`button-view-profile-${coach.id}`}
              >
                View Profile
              </Button>

              <Button
                size="sm"
                className="flex-1"
                variant={user ? "default" : "secondary"}
                onClick={handleBookClick}
                data-testid={`button-book-lesson-${coach.id}`}
                aria-label={user ? `Book lesson with ${coach.name}` : "Sign in to book lesson"}
              >
                {user ? "Book Lesson" : "Sign in to Book"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}