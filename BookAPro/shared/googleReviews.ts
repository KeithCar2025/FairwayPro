// Google Reviews utilities for extracting and fetching review data

export interface GoogleReviewsData {
  rating: number;
  reviewCount: number;
  businessName?: string;
  placeId?: string;
  isValid: boolean;
  error?: string;
}

/**
 * Validates if a URL is a valid Google Reviews URL
 */
export function isValidGoogleReviewsUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Valid Google domains for reviews
    const validDomains = [
      'maps.google.com',
      'www.google.com',
      'google.com',
      'g.page',
      'maps.app.goo.gl'
    ];
    
    // Check if it's a valid Google domain
    const isValidDomain = validDomains.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
    
    if (!isValidDomain) return false;
    
    // Check for review-related paths
    const path = urlObj.pathname + urlObj.search;
    const reviewPatterns = [
      /\/review/i,
      /\/place\/.*\/reviews/i,
      /data=.*reviews/i,
      /g\.page\/r\//i
    ];
    
    return reviewPatterns.some(pattern => pattern.test(path));
  } catch {
    return false;
  }
}

/**
 * Extracts place ID from Google Maps URL if possible
 */
export function extractPlaceId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // Try to extract from various URL formats
    const patterns = [
      /place\/([^\/]+)/,
      /data=.*!1m14.*!1m8.*!3m7.*!1s([^!]+)/,
      /data=.*!4m5.*!3m4.*!1s([^!]+)/,
      /ftid=([^&]+)/
    ];
    
    const fullUrl = url;
    for (const pattern of patterns) {
      const match = fullUrl.match(pattern);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Mock function to simulate fetching Google Reviews data
 * In a real implementation, this would use Google Places API or similar service
 */
export async function fetchGoogleReviewsData(url: string): Promise<GoogleReviewsData> {
  // Validate URL format first
  if (!isValidGoogleReviewsUrl(url)) {
    return {
      rating: 0,
      reviewCount: 0,
      isValid: false,
      error: 'Invalid Google Reviews URL format'
    };
  }
  
  try {
    // Extract place ID for potential API calls
    const placeId = extractPlaceId(url);
    
    // For now, return mock data based on URL to simulate API response
    // In a real implementation, you would:
    // 1. Use Google Places API with the place ID
    // 2. Or use a web scraping service
    // 3. Or integrate with a third-party reviews API
    
    const mockRatings = [4.1, 4.3, 4.5, 4.7, 4.8, 4.9];
    const mockCounts = [23, 45, 67, 89, 112, 156, 234, 278, 334, 445];
    
    // Generate consistent mock data based on URL hash
    const urlHash = url.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const rating = mockRatings[Math.abs(urlHash) % mockRatings.length];
    const reviewCount = mockCounts[Math.abs(urlHash) % mockCounts.length];
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      rating,
      reviewCount,
      placeId: placeId || undefined,
      isValid: true
    };
  } catch (error) {
    return {
      rating: 0,
      reviewCount: 0,
      isValid: false,
      error: 'Failed to fetch Google Reviews data'
    };
  }
}

/**
 * Formats rating for display
 */
export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

/**
 * Formats review count for display
 */
export function formatReviewCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return count.toString();
}