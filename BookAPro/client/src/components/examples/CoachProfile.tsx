import { useState } from "react";
import CoachProfile from '../CoachProfile';
import { Coach } from '../CoachCard';
import { Button } from "@/components/ui/button";
import maleCoachImage from '@assets/generated_images/Male_golf_coach_headshot_893584c9.png';

export default function CoachProfileExample() {
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
    bio: 'PGA Professional with over 15 years of experience teaching golfers of all skill levels. I specialize in helping students develop proper fundamentals while building confidence on the course. My teaching philosophy focuses on creating a relaxed learning environment where students can improve at their own pace. I have experience working with juniors, adults, and seniors, and I enjoy tailoring my approach to meet each student\'s unique goals and learning style.',
    specialties: ['Swing Analysis', 'Putting', 'Course Strategy', 'Mental Game', 'Junior Programs'],
    location: 'Pine Valley Golf Club',
    responseTime: '2 hours',
    availability: 'Available this week',
    tools: ['TrackMan 4', 'V1 Video Analysis', 'SAM PuttLab', 'BodiTrak', 'FlightScope Launch Monitor'],
    certifications: ['PGA Class A Professional', 'TPI Certified Level 3', 'Trackman University Certified', 'US Kids Golf Certified'],
    yearsExperience: 15,
    videos: [
      {
        id: '1',
        title: 'Perfect Your Swing Plane',
        thumbnail: maleCoachImage,
        duration: '4:23',
        description: 'Learn the fundamentals of proper swing plane with detailed analysis'
      },
      {
        id: '2',
        title: 'Putting Fundamentals',
        thumbnail: maleCoachImage,
        duration: '3:15',
        description: 'Master the basics of putting setup and stroke'
      },
      {
        id: '3',
        title: 'Short Game Secrets',
        thumbnail: maleCoachImage,
        duration: '5:47',
        description: 'Improve your chipping and pitching around the green'
      }
    ]
  };

  const handleBookLesson = (coach: Coach) => {
    console.log('Book lesson with:', coach.name);
    setIsOpen(false);
  };

  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>
        Open Coach Profile
      </Button>
      <CoachProfile 
        coach={mockCoach}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onBookLesson={handleBookLesson}
      />
    </div>
  );
}