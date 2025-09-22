import { useState } from "react";
import BookingModal, { BookingData } from '../BookingModal';
import { Coach } from '../CoachCard';
import { Button } from "@/components/ui/button";
import maleCoachImage from '@assets/generated_images/Male_golf_coach_headshot_893584c9.png';

export default function BookingModalExample() {
  const [isOpen, setIsOpen] = useState(false);

  // TODO: remove mock functionality
  const mockCoach: Coach = {
    id: '1',
    name: 'Michael Johnson',
    image: maleCoachImage,
    rating: 4.8,
    reviewCount: 127,
    distance: '2.3 miles',
    pricePerHour: 85,
    bio: 'PGA Professional with 15+ years of experience teaching golfers of all skill levels.',
    specialties: ['Swing Analysis', 'Putting', 'Course Strategy'],
    location: 'Pine Valley Golf Club',
    responseTime: '2 hours',
    availability: 'Available this week',
    tools: ['TrackMan', 'Video Analysis', 'Launch Monitor'],
    certifications: ['PGA Class A Professional', 'TPI Certified'],
    yearsExperience: 15
  };

  const handleBook = (bookingData: BookingData) => {
    console.log('Booking confirmed:', bookingData);
    setIsOpen(false);
  };

  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>
        Open Booking Modal
      </Button>
      <BookingModal 
        coach={mockCoach}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onBook={handleBook}
      />
    </div>
  );
}