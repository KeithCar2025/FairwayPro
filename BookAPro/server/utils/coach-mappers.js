export function mapCoachDbToApi(coach) {
  return {
    id: coach.id,
    userId: coach.user_id,
    name: coach.name,
    bio: coach.bio,
    location: coach.location,
    pricePerHour: coach.price_per_hour,
    rating: coach.rating,
    reviewCount: coach.review_count,
    responseTime: coach.response_time,
    availability: coach.availability,
    yearsExperience: coach.years_experiance,
    image: coach.image,
    isVerified: coach.is_verified,
    latitude: coach.latitude,
    longitude: coach.longitude,
    approvalStatus: coach.approval_status,
    approvedAt: coach.approved_at,
    approvedBy: coach.approved_by,
    googleReviewsUrl: coach.google_reviews_url,
    googleRating: coach.google_rating,
    googleReviewCount: coach.google_review_count,
    lastGoogleSync: coach.last_google_sync,
    pgaCertificationId: coach.pga_certification_id,

    // ✅ Handle join tables
    specialties: coach.coach_specialties?.map(s => s.specialty) || [],
    tools: coach.coach_tools?.map(t => t.tool) || [],
    certifications: coach.coach_certifications?.map(c => c.certification) || [],
    videos: coach.coach_videos || [],
  };
}
