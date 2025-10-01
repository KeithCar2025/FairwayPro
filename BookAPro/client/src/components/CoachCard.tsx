import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MapPin, Clock, DollarSign } from "lucide-react";

export interface Coach {
  id: string;
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

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < Math.floor(rating) 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ));
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
            <AvatarImage src={coach.image} alt={coach.name} />
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
  ${coach.pricePerHour ?? coach.price_per_hour}
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
                onClick={(e) => {
                  e.stopPropagation();
                  onBookLesson(coach);
                }}
                data-testid={`button-book-lesson-${coach.id}`}
              >
                Book Lesson
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}