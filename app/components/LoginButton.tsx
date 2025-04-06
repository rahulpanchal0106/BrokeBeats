"use client";
import { useAuth } from "@/components/AuthContext";
import { Button } from '@/components/ui/button';

export default function LoginButton() {
  const { user, login, logout } = useAuth();

  return (
    <Button
      onClick={user ? logout : login}
      className="bg-green-500 hover:bg-green-600 text-white"
    >
      {user ? 'Logout' : 'Login with Spotify'}
    </Button>
  );
} 