import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin } from "lucide-react";
import heroImage from "@assets/generated_images/Banner.png";

interface HeroSectionProps {
  onSearch: (location: string) => void;
}

export default function HeroSection({ onSearch }: HeroSectionProps) {
  const [location, setLocation] = useState("");

  const handleSearch = () => {
    if (location.trim()) {
      onSearch(location.trim());
      console.log("Hero search triggered:", { location });
    }
  };

  return (
    <section className="relative mt-8">
      {/* Hero Image with Overlay */}
      <div
        className="relative w-full h-64 sm:h-80 md:h-96 lg:h-[1100px] bg-cover bg-center rounded-lg mx-4"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0)), url(${heroImage})`,
        }}
      ></div>
    </section>
  );
}
