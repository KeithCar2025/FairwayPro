import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Star, MapPin, Clock, Phone, Mail, Calendar, Award } from "lucide-react";
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

  // TODO: remove mock functionality
  const mockReviews = [
    {
      id: '1',
      name: 'Sarah M.',
      rating: 5,
      date: '2 weeks ago',
      comment: 'Excellent instructor! Really helped improve my swing mechanics.'
    },
    {
      id: '2',
      name: 'John D.',
      rating: 5,
      date: '1 month ago',
      comment: 'Great patience and clear explanations. Highly recommend!'
    },
    {
      id: '3',
      name: 'Lisa K.',
      rating: 4,
      date: '2 months ago',
      comment: 'Very knowledgeable and professional. My putting has improved significantly.'
    }
  ];

  const mockCertifications = [
    'PGA Class A Professional',
    'TPI Certified (Titleist Performance Institute)',
    'US Kids Golf Certified',
    'First Aid & CPR Certified'
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="bg-primary/10 p-6">
          <div className="flex items-start gap-6">
            <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
              <AvatarImage src={coach.image} alt={coach.name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {coach.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-2" data-testid="text-profile-name">
                {coach.name}
              </h2>
              
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center">
                  {renderStars(coach.rating)}
                </div>
                <span className="text-lg font-semibold" data-testid="text-profile-rating">
                  {coach.rating}
                </span>
                <span className="text-muted-foreground">
                  ({coach.reviewCount} reviews)
                </span>
              </div>
              
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

          {/* Quick Info */}
          <div>
            <h3 className="text-xl font-bold mb-3">Quick Info</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

          {/* Reviews Section */}
          <div>
            <h3 className="text-xl font-bold mb-4">Recent Reviews</h3>
            <div className="space-y-4">
              {mockReviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs bg-muted">
                            {review.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">{review.name}</div>
                          <div className="flex items-center gap-1">
                            {renderStars(review.rating)}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">{review.date}</div>
                    </div>
                    <p className="text-sm text-muted-foreground">{review.comment}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Contact Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              className="flex-1"
              data-testid="button-profile-message"
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Message
            </Button>
            <Button 
              className="flex-1" 
              onClick={() => onBookLesson(coach)}
              data-testid="button-profile-book-now"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Book Lesson Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}