import { useState } from "react";
import CoachCard, { Coach } from "./CoachCard";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface CoachListProps {
  coaches: Coach[];
  isLoading: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onViewProfile: (coach: Coach) => void;
  onBookLesson: (coach: Coach) => void;
}

export default function CoachList({ 
  coaches, 
  isLoading, 
  onLoadMore, 
  hasMore = false,
  onViewProfile, 
  onBookLesson 
}: CoachListProps) {
  if (isLoading && coaches.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Finding coaches near you...</p>
        </div>
      </div>
    );
  }

  if (!isLoading && coaches.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🏌️</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">No coaches found</h3>
          <p className="text-muted-foreground mb-4">
            We couldn't find any golf coaches in your area. Try expanding your search radius or adjusting your filters.
          </p>
          <Button variant="outline">Expand Search Area</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold" data-testid="text-results-count">
          {coaches.length} coach{coaches.length !== 1 ? 'es' : ''} found
        </h2>
      </div>

      {/* Coach grid */}
      <div className="grid gap-6">
        {coaches.map((coach) => (
          <CoachCard
            key={coach.id}
            coach={coach}
            onViewProfile={onViewProfile}
            onBookLesson={onBookLesson}
          />
        ))}
      </div>

      {/* Load more button */}
      {hasMore && (
        <div className="text-center pt-6">
          <Button 
            onClick={onLoadMore}
            variant="outline"
            disabled={isLoading}
            data-testid="button-load-more"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More Coaches'
            )}
          </Button>
        </div>
      )}

      {/* Loading indicator for more results */}
      {isLoading && coaches.length > 0 && (
        <div className="text-center py-6">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
        </div>
      )}
    </div>
  );
}