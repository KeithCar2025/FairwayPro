import HeroSection from '../HeroSection';

export default function HeroSectionExample() {
  const handleSearch = (location: string) => {
    console.log('Hero search:', { location });
  };

  return <HeroSection onSearch={handleSearch} />;
}