import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Filter, X } from "lucide-react";

export interface FilterState {
  priceRange: [number, number];
  rating: string;
  specialties: string[];
  availability: string;
  experience: string;
  sortBy: string;
}

interface SearchFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onClearFilters: () => void;
  isVisible: boolean;
  onToggle: () => void;
}

export default function SearchFilters({ 
  filters, 
  onFiltersChange, 
  onClearFilters, 
  isVisible, 
  onToggle 
}: SearchFiltersProps) {
  const specialtyOptions = [
    'Swing Analysis',
    'Putting',
    'Short Game',
    'Course Strategy',
    'Mental Game',
    'Junior Programs',
    'Senior Lessons',
    'Tournament Prep'
  ];

  const handleSpecialtyChange = (specialty: string, checked: boolean) => {
    const newSpecialties = checked 
      ? [...filters.specialties, specialty]
      : filters.specialties.filter(s => s !== specialty);
    
    onFiltersChange({ ...filters, specialties: newSpecialties });
  };

  const handlePriceRangeChange = (value: number[]) => {
    onFiltersChange({ ...filters, priceRange: [value[0], value[1]] });
  };

  return (
    <>
      {/* Mobile Filter Toggle */}
      <div className="lg:hidden mb-4">
        <Button 
          variant="outline" 
          onClick={onToggle}
          className="w-full"
          data-testid="button-toggle-filters"
        >
          <Filter className="w-4 h-4 mr-2" />
          {isVisible ? 'Hide Filters' : 'Show Filters'}
        </Button>
      </div>

      {/* Filters Panel */}
      <Card className={`${isVisible ? 'block' : 'hidden'} lg:block sticky top-24`}>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">Filters</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearFilters}
            data-testid="button-clear-filters"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Sort By */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Sort By</Label>
            <Select 
              value={filters.sortBy} 
              onValueChange={(value) => onFiltersChange({ ...filters, sortBy: value })}
            >
              <SelectTrigger data-testid="select-sort-by">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="distance">Distance</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
                <SelectItem value="reviews">Most Reviews</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Price Range */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Price Range: ${filters.priceRange[0]} - ${filters.priceRange[1]} per hour
            </Label>
            <Slider
              value={filters.priceRange}
              onValueChange={handlePriceRangeChange}
              max={200}
              min={25}
              step={5}
              className="w-full"
              data-testid="slider-price-range"
            />
          </div>

          {/* Minimum Rating */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Minimum Rating</Label>
            <Select 
              value={filters.rating} 
              onValueChange={(value) => onFiltersChange({ ...filters, rating: value })}
            >
              <SelectTrigger data-testid="select-min-rating">
                <SelectValue placeholder="Any rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any rating</SelectItem>
                <SelectItem value="4">4+ stars</SelectItem>
                <SelectItem value="4.5">4.5+ stars</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Experience Level */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Experience</Label>
            <Select 
              value={filters.experience} 
              onValueChange={(value) => onFiltersChange({ ...filters, experience: value })}
            >
              <SelectTrigger data-testid="select-experience">
                <SelectValue placeholder="Any experience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any experience</SelectItem>
                <SelectItem value="5+">5+ years</SelectItem>
                <SelectItem value="10+">10+ years</SelectItem>
                <SelectItem value="15+">15+ years</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Availability */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Availability</Label>
            <Select 
              value={filters.availability} 
              onValueChange={(value) => onFiltersChange({ ...filters, availability: value })}
            >
              <SelectTrigger data-testid="select-availability">
                <SelectValue placeholder="Any time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any time</SelectItem>
                <SelectItem value="today">Available today</SelectItem>
                <SelectItem value="week">This week</SelectItem>
                <SelectItem value="weekend">Weekends</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Specialties */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Specialties</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {specialtyOptions.map((specialty) => (
                <div key={specialty} className="flex items-center space-x-2">
                  <Checkbox
                    id={specialty}
                    checked={filters.specialties.includes(specialty)}
                    onCheckedChange={(checked) => handleSpecialtyChange(specialty, checked as boolean)}
                    data-testid={`checkbox-specialty-${specialty.toLowerCase().replace(/\s+/g, '-')}`}
                  />
                  <Label htmlFor={specialty} className="text-sm font-normal">
                    {specialty}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}