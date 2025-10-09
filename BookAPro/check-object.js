import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Crosshair,
  User,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import logoSrc from "@assets/generated_images/logoforfairwaypro.png";
import { useAuth } from "@/contexts/AuthContext";

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

/**
 * Convert different stored image values into a browser-fetchable URL:
 * - If an external full URL (not Supabase storage public URL) -> use as-is
 * - If a Supabase public URL -> extract objectPath and return /objects/<encodedPath> (server proxy)
 * - If absolute path (starts with "/") -> prefix origin
 * - Otherwise treat as storage key and return /objects/<encodedPath>
 */
function resolveImageUrl(rawImage: any): string | null {
  if (!rawImage) return null;
  if (typeof rawImage !== "string") return null;

  // Already a full external URL (and not a Supabase public storage URL)
  if (/^https?:\/\//i.test(rawImage) && !/supabase\.co\/storage\/v1\/object\/public\//i.test(rawImage)) {
    return rawImage;
  }

  // Supabase public URL pattern:
  // https://<project>.supabase.co/storage/v1/object/public/<bucket>/<objectPath>
  const supaMatch = rawImage.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/i);
  if (supaMatch) {
    const objectPath = supaMatch[2]; // may include slashes
    const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
    return typeof window !== "undefined" ? `${window.location.origin}/objects/${encodedPath}` : `/objects/${encodedPath}`;
  }

  // Absolute path from backend (starts with "/")
  if (rawImage.startsWith("/")) {
    return typeof window !== "undefined" ? `${window.location.origin}${rawImage}` : rawImage;
  }

  // Relative storage key like "profile-images/2025/87e...jpg" or "87e...jpg"
  const encodedPath = rawImage.split("/").map(encodeURIComponent).join("/");
  return typeof window !== "undefined" ? `${window.location.origin}/objects/${encodedPath}` : `/objects/${encodedPath}`;
}

export default function Header({ onSearch, onAuthClick }: HeaderProps) {
  const { user, logout, refreshUser } = useAuth();
  const [location, setLocation] = useState("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // avatarSrc is a browser-fetchable URL (either direct or /objects/... to hit server)
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (location.trim()) onSearch(location.trim());
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const locationName = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
        setLocation(locationName);
        onSearch(locationName);
        setIsGettingLocation(false);
      },
      () => setIsGettingLocation(false)
    );
  };

  const handleSignOut = async () => {
    await logout();
    window.location.reload();
  };

  // Avoid shadowing `user` from useAuth by renaming parameter
  const getUserDisplayName = (u: User) => u.name || u.email.split("@")[0];
  const getUserInitials = (u: User) =>
    getUserDisplayName(u).slice(0, 2).toUpperCase();

  // Refresh user after Google login
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("googleLoggedIn")) {
      refreshUser().then(() => window.history.replaceState({}, "", "/"));
    }
  }, [refreshUser]);

  // If user is coach, fetch coach profile to obtain coach.image (coaches stored image)
  useEffect(() => {
    let mounted = true;
    async function loadCoachImage() {
      try {
        if (!user) {
          if (mounted) setAvatarSrc(null);
          return;
        }

        // Prefer any image attached to the authenticated user first (if present)
        // some flows may store image on the user object; try that first
        const userImage = (user as any)?.image;
        if (userImage) {
          const resolved = resolveImageUrl(userImage);
          if (mounted) setAvatarSrc(resolved);
          return;
        }

        // If the user is a coach, try the coach profile endpoint
        if (user.role === "coach") {
          const res = await fetch("/api/coaches/me", { credentials: "include" });
          if (res.ok) {
            const data = await res.json();
            // data should be the coach object or wrapper depending on your API
            const coachObj = data.coach ?? data;
            const rawImage = coachObj?.image || "";
            const resolved = resolveImageUrl(rawImage);
            if (mounted) setAvatarSrc(resolved);
            return;
          }
        }

        // Otherwise no coach image; clear avatar src
        if (mounted) setAvatarSrc(null);
      } catch (err) {
        console.error("Failed to load coach image for header:", err);
        if (mounted) setAvatarSrc(null);
      }
    }
    loadCoachImage();
    return () => {
      mounted = false;
    };
  }, [user]);

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/40 shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 hover-elevate p-2 -m-2 transition-all">
            <img src={logoSrc} alt="FairwayPro Logo" className="h-20 w-auto" />
          </Link>

          {/* Desktop Search */}
          <div className="flex-1 max-w-2xl mx-8 hidden md:block">
            <form onSubmit={handleSearch}>
              <div className="flex items-center bg-background border border-border/60 rounded-full shadow-lg hover:shadow-xl hover:border-primary/30 transition-all duration-300 backdrop-blur-sm">
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
                  />
                </div>
                <div className="flex items-center gap-1 pr-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={getCurrentLocation}
                    disabled={isGettingLocation}
                    className="rounded-full w-10 h-10 p-0 hover:bg-muted/50 transition-colors"
                  >
                    <Crosshair
                      className={`w-4 h-4 ${isGettingLocation ? "animate-spin text-primary" : "text-muted-foreground"}`}
                    />
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="rounded-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground w-12 h-12 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200"
                  >
                    <Search className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </form>
          </div>

          {/* Mobile Search */}
          <div className="flex-1 mx-4 md:hidden">
            <Button
              variant="outline"
              className="w-full justify-start text-muted-foreground border-border/60 bg-background/50 backdrop-blur-sm hover:bg-muted/50 hover:border-primary/30 transition-all duration-200"
              onClick={() =>
                (document.querySelector('[data-testid="input-location"]') as HTMLInputElement)?.focus()
              }
            >
              <Search className="w-4 h-4 mr-2 text-primary/70" />
              <span className="truncate">Find golf coaches...</span>
            </Button>
          </div>

          {/* Auth / Profile */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {/* Desktop Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="hidden sm:flex items-center gap-3 hover-elevate px-3 py-2 rounded-full border border-border/60 bg-background/50 backdrop-blur-sm hover:bg-muted/50 hover:border-primary/30 transition-all duration-200"
                    >
                      <Avatar className="w-8 h-8 ring-2 ring-primary/20">
                        {avatarSrc ? (
                          <AvatarImage src={avatarSrc} alt={getUserDisplayName(user)} />
                        ) : null}
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-sm font-semibold">
                          {getUserInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{getUserDisplayName(user)}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center gap-2 w-full">
                        <UserCircle className="w-4 h-4" /> Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/my-bookings" className="flex items-center gap-2 w-full">
                        <Calendar className="w-4 h-4" /> My Bookings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/inbox" className="flex items-center gap-2 w-full">
                        <MessageCircle className="w-4 h-4" /> Inbox
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="w-4 h-4 mr-2" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Mobile Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="sm:hidden rounded-full w-10 h-10 p-0 hover-elevate border border-border/60 bg-background/50 backdrop-blur-sm hover:bg-muted/50 hover:border-primary/30 transition-all duration-200"
                    >
                      <Avatar className="w-8 h-8 ring-2 ring-primary/20">
                        {avatarSrc ? <AvatarImage src={avatarSrc} alt={getUserDisplayName(user)} /> : null}
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-sm font-semibold">
                          {getUserInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5 text-sm font-medium">{getUserDisplayName(user)}</div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center gap-2 w-full">
                        <UserCircle className="w-4 h-4" /> Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/my-bookings" className="flex items-center gap-2 w-full">
                        <Calendar className="w-4 h-4" /> My Bookings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/inbox" className="flex items-center gap-2 w-full">
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
                <Button variant="ghost" onClick={onAuthClick} className="hidden sm:flex font-medium hover-elevate transition-all duration-200">
                  Log in
                </Button>
                <Button onClick={onAuthClick} className="hidden sm:flex bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl transition-all duration-200">
                  Sign up
                </Button>
                <Link href="/coach-registration">
                  <Button variant="outline" className="rounded-full border-border/60 bg-background/50 backdrop-blur-sm hover:bg-muted/50 hover:border-primary/30 transition-all duration-200">
                    <span className="hidden sm:inline font-medium">Become a coach</span>
                    <span className="sm:hidden font-medium">Coach</span>
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={onAuthClick} className="sm:hidden rounded-full w-10 h-10 p-0 border border-border/60 bg-background/50 backdrop-blur-sm hover:bg-muted/50 hover:border-primary/30 transition-all duration-200">
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