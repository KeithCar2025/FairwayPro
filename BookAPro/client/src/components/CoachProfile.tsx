import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Star, MapPin, Clock, Calendar, Award } from "lucide-react";
import { Coach } from "./CoachCard";

interface CoachProfileProps {
  coach: Coach | null;
  isOpen: boolean;
  onClose: () => void;
  onBookLesson: (coach: Coach) => void;
}

export default function CoachProfile({ coach, isOpen, onClose, onBookLesson }: CoachProfileProps) {
  if (!coach) return null;

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-5 h-5 ${
          i < Math.floor(rating) 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  // Check if we have coordinates to show the map
  const hasCoordinates = typeof coach.latitude === 'number' && typeof coach.longitude === 'number';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="bg-primary/10 p-6">
          <div className="flex items-start gap-6">
            <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
              {coach.image && <img src={coach.image} alt={coach.name} className="h-full w-full object-cover" />}
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {coach.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-2" data-testid="text-profile-name">
                {coach.name}
              </h2>
              
              {/* Google Reviews Rating (Only if available) */}
              {typeof coach.googleRating === "number" && typeof coach.googleReviewCount === "number" && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center">
                    {renderStars(coach.googleRating)}
                  </div>
                  <span className="text-lg font-semibold text-green-600" data-testid="text-profile-google-rating">
                    {coach.googleRating}
                  </span>
                  <span className="text-muted-foreground">
                    ({coach.googleReviewCount} Google reviews)
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-4 text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{coach.location}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>{coach.distance} away</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold text-primary" data-testid="text-profile-price">
                  ${coach.pricePerHour}<span className="text-base font-normal text-muted-foreground">/hour</span>
                </div>
                <Button 
                  size="lg" 
                  onClick={() => onBookLesson(coach)}
                  data-testid="button-profile-book-lesson"
                >
                  Book Lesson
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* About Section */}
          <div>
            <h3 className="text-xl font-bold mb-3">About</h3>
            <p className="text-muted-foreground leading-relaxed">{coach.bio}</p>
          </div>

          {/* Tools & Equipment */}
          {coach.tools && coach.tools.length > 0 && (
            <div>
              <h3 className="text-xl font-bold mb-3">Teaching Tools & Equipment</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {coach.tools.map((tool, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary text-sm">🔧</span>
                    </div>
                    <span className="text-sm font-medium">{tool}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Video Gallery */}
          {coach.videos && coach.videos.length > 0 && (
            <div>
              <h3 className="text-xl font-bold mb-3">Instructional Videos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {coach.videos.map((video) => (
                  <Card key={video.id} className="hover-elevate cursor-pointer">
                    <CardContent className="p-0">
                      <div className="relative">
                        <img 
                          src={video.thumbnail} 
                          alt={video.title}
                          className="w-full h-32 object-cover rounded-t-lg"
                        />
                        <div className="absolute inset-0 bg-black/20 rounded-t-lg flex items-center justify-center">
                          <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                            <div className="w-0 h-0 border-l-[8px] border-l-primary border-y-[6px] border-y-transparent ml-1" />
                          </div>
                        </div>
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          {video.duration}
                        </div>
                      </div>
                      <div className="p-3">
                        <h4 className="font-medium text-sm mb-1">{video.title}</h4>
                        <p className="text-xs text-muted-foreground">{video.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Specialties & Certifications */}
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-3">Specialties</h3>
              <div className="flex flex-wrap gap-2">
                {coach.specialties.map((specialty, index) => (
                  <Badge key={index} variant="secondary" className="text-sm py-1">
                    {specialty}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-3">Certifications & Experience</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{coach.yearsExperience}+ years of experience</span>
                </div>
                {coach.certifications?.map((cert, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-primary" />
                    <span className="text-sm">{cert}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Info with Map */}
          <div>
            <h3 className="text-xl font-bold mb-3">Quick Info</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="col-span-3 md:col-span-1">
                <div className="space-y-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-primary" />
                        <div>
                          <div className="font-medium">Response Time</div>
                          <div className="text-sm text-muted-foreground">{coach.responseTime}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-primary" />
                        <div>
                          <div className="font-medium">Availability</div>
                          <div className="text-sm text-muted-foreground">{coach.availability}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-primary" />
                        <div>
                          <div className="font-medium">Distance</div>
                          <div className="text-sm text-muted-foreground">{coach.distance}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              {/* Map Card - Using the same format as your working example */}
              <Card className="col-span-3 md:col-span-2 overflow-hidden">
                <CardContent className="p-0 h-[260px]">
                  {hasCoordinates ? (
                    <>
                      <div className="text-xs text-muted-foreground p-2 bg-muted/20">
                        Location: {coach.location}
                      </div>
                      <iframe
                        title={`${coach.name}'s location`}
                        width="100%"
                        height="230"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://www.google.com/maps?q=${coach.latitude},${coach.longitude}&z=15&output=embed`}
                      />
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted/30 text-muted-foreground">
                      <div className="text-center p-4">
                        <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground/70" />
                        <p>Location: {coach.location}</p>
                        <p className="text-sm mt-2">No exact coordinates available</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Book Lesson Button (Bottom) */}
          <div className="flex justify-center pt-4">
            <Button 
              size="lg" 
              className="px-8" 
              onClick={() => onBookLesson(coach)}
              data-testid="button-profile-book-now"
            >
              <Calendar className="w-5 h-5 mr-2" />
              Book Lesson Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}