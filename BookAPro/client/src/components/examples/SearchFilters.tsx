import { useState } from "react";
import SearchFilters, { FilterState } from '../SearchFilters';

export default function SearchFiltersExample() {
  // TODO: remove mock functionality
  const [filters, setFilters] = useState<FilterState>({
    priceRange: [50, 150],
    rating: 'any',
    specialties: ['Swing Analysis'],
    availability: 'any',
    experience: 'any',
    sortBy: 'distance'
  });
  const [isVisible, setIsVisible] = useState(true);

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    console.log('Filters changed:', newFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters: FilterState = {
      priceRange: [25, 200],
      rating: 'any',
      specialties: [],
      availability: 'any',
      experience: 'any',
      sortBy: 'distance'
    };
    setFilters(clearedFilters);
    console.log('Filters cleared');
  };

  const handleToggle = () => {
    setIsVisible(!isVisible);
  };

  return (
    <div className="max-w-sm">
      <SearchFilters 
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
        isVisible={isVisible}
        onToggle={handleToggle}
      />
    </div>
  );
}