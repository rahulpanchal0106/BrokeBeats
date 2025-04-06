"use client";
import { useAuth } from "@/components/AuthContext";
import { Button } from '@/components/ui/button';

export default function LogoutButton() {
  const { logout } = useAuth();

  return (
    <Button
      onClick={logout}
      className="bg-red-500 hover:bg-red-600 text-white"
    >
      Logout from Spotify
    </Button>
  );
} 