import Header from '../Header';

export default function HeaderExample() {
  const handleSearch = (location: string) => {
    console.log('Search for location:', location);
  };

  const handleAuthClick = () => {
    console.log('Auth clicked');
  };

  return (
    <Header 
      onSearch={handleSearch} 
      onAuthClick={handleAuthClick} 
    />
  );
}