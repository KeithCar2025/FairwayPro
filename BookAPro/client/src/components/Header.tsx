import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  MapPin,
  User,
  Crosshair,
  Calendar,
  MessageCircle,
  LogOut,
  UserCircle,
} from "lucide-react";
import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import logoSrc from "@assets/generated_images/logoforfairwaypro.png";

interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
}

interface HeaderProps {
  onSearch: (location: string) => void;
  onAuthClick: () => void;
}

export default function Header({ onSearch, onAuthClick }: HeaderProps) {
  const [location, setLocation] = useState("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/auth/me", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
      } else {
        setCurrentUser(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setCurrentUser(null);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        setCurrentUser(null);
        window.location.reload();
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const getUserDisplayName = (user: User) =>
    user.name || user.email.split("@")[0];

  const getUserInitials = (user: User) =>
    getUserDisplayName(user).slice(0, 2).toUpperCase();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (location.trim()) {
      onSearch(location.trim());
      console.log("Search triggered for:", location);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      console.log("Geolocation is not supported by this browser");
      return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const locationName = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
          setLocation(locationName);
          onSearch(locationName);
          console.log("Location detected:", { latitude, longitude });
        } catch (error) {
          console.error("Error getting location name:", error);
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.error("Error getting location:", error);
        setIsGettingLocation(false);
      },
    );
  };

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/40 shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/" // blank link for homepage
            className="flex items-center gap-3 hover-elevate p-2 -m-2 transition-all"
          >
            <img
              src={logoSrc}
              alt="FairwayPro Logo"
              className="h-20 w-auto" // larger height, width adjusts automatically
            />
          </Link>
          {/* Enhanced Search Bar */}
          <div className="flex-1 max-w-2xl mx-8 hidden md:block">
            <form onSubmit={handleSearch} data-testid="form-search">
              <div className="flex items-center bg-background border border-border/60 rounded-full shadow-lg hover:shadow-xl hover:border-primary/30 transition-all duration-300 backdrop-blur-sm">
                {/* Location Input */}
                <div className="flex-1 px-6 py-4">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Find Golf Coaches
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter city, state, or zip code"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="border-0 p-0 text-sm font-medium focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/60"
                    data-testid="input-location"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 pr-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={getCurrentLocation}
                    disabled={isGettingLocation}
                    className="rounded-full w-10 h-10 p-0 hover:bg-muted/50 transition-colors"
                    data-testid="button-current-location"
                  >
                    <Crosshair
                      className={`w-4 h-4 ${
                        isGettingLocation
                          ? "animate-spin text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="rounded-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground w-12 h-12 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200"
                    data-testid="button-search"
                  >
                    <Search className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </form>
          </div>

          {/* Mobile Search - Enhanced */}
          <div className="flex-1 mx-4 md:hidden">
            <Button
              variant="outline"
              className="w-full justify-start text-muted-foreground border-border/60 bg-background/50 backdrop-blur-sm hover:bg-muted/50 hover:border-primary/30 transition-all duration-200"
              onClick={() =>
                (
                  document.querySelector(
                    '[data-testid="input-location"]',
                  ) as HTMLInputElement
                )?.focus()
              }
            >
              <Search className="w-4 h-4 mr-2 text-primary/70" />
              <span className="truncate">Find golf coaches...</span>
            </Button>
          </div>

          {/* Auth Buttons / Profile Menu */}
          <div className="flex items-center gap-2">
            {isLoadingAuth ? (
              <Button variant="ghost" disabled className="hidden sm:flex">
                Loading...
              </Button>
            ) : currentUser ? (
              <>
                {/* Desktop Profile Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="hidden sm:flex items-center gap-3 hover-elevate px-3 py-2 rounded-full border border-border/60 bg-background/50 backdrop-blur-sm hover:bg-muted/50 hover:border-primary/30 transition-all duration-200"
                      data-testid="button-profile-menu"
                    >
                      <Avatar className="w-8 h-8 ring-2 ring-primary/20">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-sm font-semibold">
                          {getUserInitials(currentUser)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">
                        {getUserDisplayName(currentUser)}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link
                        href="/profile"
                        className="flex items-center gap-2 w-full"
                        data-testid="link-profile"
                      >
                        <UserCircle className="w-4 h-4" /> Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/my-bookings"
                        className="flex items-center gap-2 w-full"
                        data-testid="link-my-bookings"
                      >
                        <Calendar className="w-4 h-4" /> My Bookings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/inbox"
                        className="flex items-center gap-2 w-full"
                        data-testid="link-inbox"
                      >
                        <MessageCircle className="w-4 h-4" /> Inbox
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      data-testid="button-signout"
                    >
                      <LogOut className="w-4 h-4 mr-2" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Mobile Profile Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="sm:hidden rounded-full w-10 h-10 p-0 hover-elevate border border-border/60 bg-background/50 backdrop-blur-sm hover:bg-muted/50 hover:border-primary/30 transition-all duration-200"
                      data-testid="button-profile-menu-mobile"
                    >
                      <Avatar className="w-8 h-8 ring-2 ring-primary/20">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-sm font-semibold">
                          {getUserInitials(currentUser)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5 text-sm font-medium">
                      {getUserDisplayName(currentUser)}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link
                        href="/profile"
                        className="flex items-center gap-2 w-full"
                      >
                        <UserCircle className="w-4 h-4" /> Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/my-bookings"
                        className="flex items-center gap-2 w-full"
                      >
                        <Calendar className="w-4 h-4" /> My Bookings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/inbox"
                        className="flex items-center gap-2 w-full"
                      >
                        <MessageCircle className="w-4 h-4" /> Inbox
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="w-4 h-4 mr-2" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                {/* Not logged in */}
                <Button
                  variant="ghost"
                  onClick={onAuthClick}
                  className="hidden sm:flex font-medium hover-elevate transition-all duration-200"
                  data-testid="button-login"
                >
                  Log in
                </Button>
                <Button
                  onClick={onAuthClick}
                  className="hidden sm:flex bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl transition-all duration-200"
                  data-testid="button-signup"
                >
                  Sign up
                </Button>
                <Link href="/coach-registration">
                  <Button
                    variant="outline"
                    className="rounded-full border-border/60 bg-background/50 backdrop-blur-sm hover:bg-muted/50 hover:border-primary/30 transition-all duration-200"
                    data-testid="button-coach-signup"
                  >
                    <span className="hidden sm:inline font-medium">
                      Become a coach
                    </span>
                    <span className="sm:hidden font-medium">Coach</span>
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onAuthClick}
                  className="sm:hidden rounded-full w-10 h-10 p-0 border border-border/60 bg-background/50 backdrop-blur-sm hover:bg-muted/50 hover:border-primary/30 transition-all duration-200"
                  data-testid="button-menu-mobile"
                >
                  <User className="w-4 h-4 text-primary/70" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
