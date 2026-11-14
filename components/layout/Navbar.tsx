"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MobileNav } from "@/components/MobileNav";
import { NotificationBell } from "@/components/NotificationBell";

export default function Navbar() {
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkUserAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (profile?.is_admin) {
        setIsAdmin(true);
      }
    }
    checkUserAdmin();
  }, [supabase]);

  return (
    <header className="border-b bg-white sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Left: Mobile Menu & Logo */}
        <div className="flex items-center gap-2">
          <MobileNav />
          <Link href="/" className="font-bold text-xl bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">
            YouthEngage 🚀
          </Link>
        </div>

        {/* Right: Desktop Links & Notification Bell */}
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/learn" className="text-sm font-medium hover:text-primary transition-colors">Learn</Link>
            <Link href="/qna" className="text-sm font-medium hover:text-primary transition-colors">Q&A</Link>
            <Link href="/trivia" className="text-sm font-medium hover:text-primary transition-colors">Trivia</Link>
            <Link href="/opportunities" className="text-sm font-medium hover:text-primary transition-colors">Opportunities</Link>
            <Link href="/mentorship" className="text-sm font-medium hover:text-primary transition-colors">Mentorship</Link>
            <Link href="/leaderboard" className="text-sm font-medium hover:text-primary transition-colors">Leaderboard</Link>
            <Link href="/profile" className="text-sm font-medium hover:text-primary transition-colors">Profile</Link>
            
            {/* Show Admin link dynamically if user is admin */}
            {isAdmin && (
              <Link href="/admin" className="text-sm font-semibold text-purple-600 hover:text-purple-700 transition-colors">
                Admin 🛡️
              </Link>
            )}
          </nav>
          
          <NotificationBell />
        </div>

      </div>
    </header>
  );
}