import { useState } from "react";
import AuthModal from '../AuthModal';
import { Button } from "@/components/ui/button";

export default function AuthModalExample() {
  const [isOpen, setIsOpen] = useState(false);

  const handleAuth = (type: 'login' | 'signup', data: any) => {
    console.log(`${type} attempt:`, data);
    setIsOpen(false);
  };

  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>
        Open Auth Modal
      </Button>
      <AuthModal 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onAuth={handleAuth}
      />
    </div>
  );
}