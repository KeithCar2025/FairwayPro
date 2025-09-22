import { Link } from "wouter";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-muted/30 border-t mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">FairwayPro</h3>
            <p className="text-muted-foreground text-sm">
              Connect with certified PGA instructors and take your golf game to the next level.
            </p>
            <div className="flex flex-col space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Available Nationwide</span>
              </div>
            </div>
          </div>

          {/* For Students */}
          <div className="space-y-4">
            <h4 className="font-semibold">For Students</h4>
            <nav className="flex flex-col space-y-2">
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Find Coaches
              </Link>
              <Link href="/my-bookings" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                My Bookings
              </Link>
              <Link href="/inbox" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Messages
              </Link>
              <Link href="/profile" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                My Profile
              </Link>
            </nav>
          </div>

          {/* For Coaches */}
          <div className="space-y-4">
            <h4 className="font-semibold">For Coaches</h4>
            <nav className="flex flex-col space-y-2">
              <Link href="/coach-registration" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Become a Coach
              </Link>
              <Link href="/profile" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Coach Dashboard
              </Link>
              <Link href="/inbox" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Messages
              </Link>
              <Button variant="ghost" className="justify-start p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                Coach Resources
              </Button>
            </nav>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h4 className="font-semibold">Company</h4>
            <nav className="flex flex-col space-y-2">
              <Button variant="ghost" className="justify-start p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                About Us
              </Button>
              <Button variant="ghost" className="justify-start p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                How It Works
              </Button>
              <Button variant="ghost" className="justify-start p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                Safety & Trust
              </Button>
              <Button variant="ghost" className="justify-start p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                Contact Us
              </Button>
            </nav>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col md:flex-row items-center gap-4 text-sm text-muted-foreground">
            <span>© {currentYear} FairwayPro. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <Button variant="ghost" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                Privacy Policy
              </Button>
              <Button variant="ghost" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                Terms of Service
              </Button>
              <Button variant="ghost" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                Cookie Policy
              </Button>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Professional Golf Instruction Platform
          </div>
        </div>
      </div>
    </footer>
  );
}