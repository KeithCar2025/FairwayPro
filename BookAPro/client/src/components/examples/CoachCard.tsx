import CoachCard, { Coach } from '../CoachCard';
import maleCoachImage from '@assets/generated_images/Male_golf_coach_headshot_893584c9.png';

export default function CoachCardExample() {
  // TODO: remove mock functionality
  const mockCoach: Coach = {
    id: '1',
    name: 'Michael Johnson',
    image: maleCoachImage,
    rating: 4.8,
    reviewCount: 127,
    distance: '2.3 miles',
    pricePerHour: 85,
    bio: 'PGA Professional with 15+ years of experience teaching golfers of all skill levels. Specializing in swing mechanics and course management.',
    specialties: ['Swing Analysis', 'Putting', 'Course Strategy', 'Mental Game'],
    location: 'Pine Valley Golf Club',
    responseTime: '2 hours',
    availability: 'Available this week',
    tools: ['TrackMan', 'Video Analysis', 'Launch Monitor', 'Putting Mat'],
    certifications: ['PGA Class A Professional', 'TPI Certified'],
    yearsExperience: 15,
    videos: [
      {
        id: '1',
        title: 'Swing Fundamentals',
        thumbnail: maleCoachImage,
        duration: '3:45',
        description: 'Basic swing mechanics explained'
      }
    ]
  };

  const handleViewProfile = (coach: Coach) => {
    console.log('View profile:', coach.name);
  };

  const handleBookLesson = (coach: Coach) => {
    console.log('Book lesson with:', coach.name);
  };

  return (
    <div className="max-w-2xl">
      <CoachCard 
        coach={mockCoach}
        onViewProfile={handleViewProfile}
        onBookLesson={handleBookLesson}
      />
    </div>
  );
}