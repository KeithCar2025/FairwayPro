// ESM module (package.json has "type": "module")

function toNum(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export function mapCoachDbToApi(coach) {
  return {
    id: coach.id,
    userId: coach.user_id,
    name: coach.name,
    bio: coach.bio,
    location: coach.location,

    // numeric coercions (Supabase numeric often come back as strings)
    pricePerHour: toNum(coach.price_per_hour),
    rating: toNum(coach.rating) ?? 0,
    reviewCount: toNum(coach.review_count) ?? 0,

    responseTime: coach.response_time,
    availability: coach.availability,

    // NOTE: your schema uses years_experiance (typo), so read that column
    yearsExperience: toNum(coach.years_experiance),

    image: coach.image,
    isVerified: !!coach.is_verified,

    // lat/lng as numbers (or null)
    latitude: toNum(coach.latitude),
    longitude: toNum(coach.longitude),

    approvalStatus: coach.approval_status,
    approvedAt: coach.approved_at,
    approvedBy: coach.approved_by,

    googleReviewsUrl: coach.google_reviews_url,
    googleRating: toNum(coach.google_rating),
    googleReviewCount: toNum(coach.google_review_count),
    lastGoogleSync: coach.last_google_sync,

    pgaCertificationId: coach.pga_certification_id,

    // Join tables (flatten safely)
    specialties: Array.isArray(coach.coach_specialties)
      ? coach.coach_specialties.map((s) => s.specialty)
      : [],
    tools: Array.isArray(coach.coach_tools)
      ? coach.coach_tools.map((t) => t.tool)
      : [],
    certifications: Array.isArray(coach.coach_certifications)
      ? coach.coach_certifications.map((c) => c.certification)
      : [],
    videos: Array.isArray(coach.coach_videos) ? coach.coach_videos : [],
  };
}