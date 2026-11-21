"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile?.role === "admin" || profile?.role === "moderator") {
          setIsAdmin(true);
        }
      }
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (!session?.user) setIsAdmin(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          YouthEngage
        </Link>

        <div className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-700">
          <Link href="/trivia" className="hover:text-blue-600 transition">Trivia</Link>
          <Link href="/qna" className="hover:text-purple-600 transition">Q&A</Link>
          <Link href="/learn" className="hover:text-blue-600 transition">Learn</Link>
          <Link href="/opportunities" className="hover:text-purple-600 transition">Opportunities</Link>
          <Link href="/mentorship" className="hover:text-pink-600 transition">Mentorship</Link>

          {isAdmin && (
            <Link href="/leaderboard" className="hover:text-blue-600 transition">
              Leaderboard
            </Link>
          )}

          {isAdmin && (
            <Link href="/admin" className="text-orange-600 font-semibold hover:text-orange-700 transition">
              Admin
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {loading ? (
            <span className="text-sm text-gray-400">...</span>
          ) : user ? (
            <>
              <Link href="/profile" className="text-sm font-medium text-gray-700 hover:text-purple-600 transition">
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-gray-700 hover:text-red-600 transition"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition">
                Login
              </Link>
              <Link
                href="/register"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm px-5 py-2.5 rounded-full hover:from-blue-700 hover:to-purple-700 transition shadow-md"
              >
                Join Free
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}