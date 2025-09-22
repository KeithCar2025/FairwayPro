# Design Guidelines: PGA Golf Coach Platform

## Design Approach
**Reference-Based Approach** - Drawing inspiration from Airbnb's marketplace design patterns and booking flow, combined with modern service discovery platforms. This approach suits the experience-focused nature of connecting students with coaches and the trust-building requirements of the platform.

## Core Design Elements

### Color Palette
**Primary Colors:**
- Light Mode: 142 69% 58% (Golf course green)
- Dark Mode: 142 45% 35% (Deeper forest green)

**Neutral Colors:**
- Light backgrounds: 0 0% 98%
- Dark backgrounds: 220 13% 9%
- Text: High contrast grays

**Accent Colors:**
- Success/Rating: 142 69% 58% (matches primary)
- Warning/Pending: 43 74% 49% (Golden yellow for premium feel)

### Typography
- **Primary Font:** Inter (Google Fonts) - clean, professional readability
- **Headings:** 600-700 weight for coach names and section titles
- **Body Text:** 400-500 weight for descriptions and details
- **Price Display:** 600 weight for emphasis

### Layout System
**Tailwind Spacing Units:** Consistent use of 4, 6, 8, and 12 units
- `p-4, p-6` for component padding
- `gap-6, gap-8` for grid and flex layouts
- `h-12, h-16` for button and input heights
- `mb-8, mt-6` for section spacing

### Component Library

**Navigation:**
- Mobile-first hamburger menu with slide-out drawer
- Search bar prominently featured in header
- Location indicator showing current search radius

**Coach Cards:**
- Grid layout (1 column mobile, 2-3 desktop)
- Profile image (circular, 80px mobile, 120px desktop)
- Star rating display with review count
- Price per lesson prominently displayed
- Distance from user location
- Quick "Book Now" CTA button

**Search & Filters:**
- Location input with autocomplete
- Distance radius slider (5, 10, 25, 50 miles)
- Price range filter
- Availability filter (today, this week, flexible)
- Rating threshold filter

**Booking Interface:**
- Calendar view with available time slots
- Lesson type selection (beginner, intermediate, advanced)
- Duration options (30min, 60min, 90min)
- Location preference (driving range, course, etc.)

**Authentication:**
- Modal-based login/signup
- Separate coach registration flow with PGA verification
- Clean form design with clear field validation

**Rating System:**
- 5-star rating component with hover states
- Text review area with character limits
- Photo upload option for lesson highlights

### Mobile Optimization
- Touch-friendly tap targets (minimum 44px)
- Swipeable coach cards on mobile
- Collapsible filter drawer
- Bottom navigation for key actions
- One-handed usage considerations

### Trust & Safety Elements
- PGA certification badges
- Verified profile indicators
- Review authenticity markers
- Secure payment badges
- Coach response time indicators

### Animations
**Minimal and Purposeful:**
- Smooth page transitions between search and booking
- Gentle hover effects on coach cards
- Loading states for search results
- Success animations for completed bookings

### Images
**Coach Profile Images:**
- Professional headshots, circular crop
- Consistent sizing and quality standards
- Fallback avatar for new coaches

**Hero Section:**
- Large hero image of golf course or coaching session
- Overlay with search functionality
- Gradient overlay for text readability

**Background Elements:**
- Subtle golf-related patterns or textures
- Course imagery used sparingly for ambiance
- Focus on clean, uncluttered layouts

This design creates a trustworthy, professional platform that emphasizes ease of discovery and booking while maintaining the premium feel appropriate for professional golf instruction services.