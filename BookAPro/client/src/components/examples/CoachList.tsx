import CoachList from '../CoachList';
import { Coach } from '../CoachCard';
import maleCoachImage from '@assets/generated_images/Male_golf_coach_headshot_893584c9.png';
import femaleCoachImage from '@assets/generated_images/Female_golf_coach_headshot_05d9fb5a.png';
import seniorCoachImage from '@assets/generated_images/Senior_golf_coach_headshot_d3798356.png';

export default function CoachListExample() {
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
      bio: 'PGA Professional with 15+ years of experience teaching golfers of all skill levels.',
      specialties: ['Swing Analysis', 'Putting', 'Course Strategy'],
      location: 'Pine Valley Golf Club',
      responseTime: '2 hours',
      availability: 'Available this week',
      tools: ['TrackMan', 'Video Analysis', 'Launch Monitor'],
      certifications: ['PGA Class A Professional'],
      yearsExperience: 15
    },
    {
      id: '2',
      name: 'Sarah Williams',
      image: femaleCoachImage,
      rating: 4.9,
      reviewCount: 89,
      distance: '3.7 miles',
      pricePerHour: 95,
      bio: 'LPGA Teaching Professional specializing in junior development and women\'s golf.',
      specialties: ['Junior Programs', 'Short Game', 'Mental Game'],
      location: 'Oakwood Country Club',
      responseTime: '1 hour',
      availability: 'Available today',
      tools: ['FlightScope', 'OnForm App', 'Training Aids'],
      certifications: ['LPGA Class A Professional'],
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
      bio: 'Former PGA Tour player with 25+ years of teaching experience.',
      specialties: ['Tournament Prep', 'Advanced Techniques', 'Course Management'],
      location: 'Championship Links',
      responseTime: '3 hours',
      availability: 'Available next week',
      tools: ['GC Quad', 'K-Coach', 'BodiTrak'],
      certifications: ['Former PGA Tour Player'],
      yearsExperience: 25
    }
  ];

  const handleViewProfile = (coach: Coach) => {
    console.log('View profile:', coach.name);
  };

  const handleBookLesson = (coach: Coach) => {
    console.log('Book lesson with:', coach.name);
  };

  const handleLoadMore = () => {
    console.log('Load more coaches');
  };

  return (
    <div className="max-w-4xl">
      <CoachList 
        coaches={mockCoaches}
        isLoading={false}
        onLoadMore={handleLoadMore}
        hasMore={true}
        onViewProfile={handleViewProfile}
        onBookLesson={handleBookLesson}
      />
    </div>
  );
}