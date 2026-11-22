
"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Menu,
  Home,
  HelpCircle,
  Briefcase,
  Users,
  Trophy,
  User,
  BookOpen,
  Sparkles,
ShieldCheck,
} from "lucide-react";

const navItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Learn", href: "/learn", icon: BookOpen },
  { name: "Q&A", href: "/qna", icon: HelpCircle },
  { name: "Trivia", href: "/trivia", icon: Sparkles },
  { name: "Opportunities", href: "/opportunities", icon: Briefcase },
  { name: "Mentorship", href: "/mentorship", icon: Users },
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { name: "Profile", href: "/profile", icon: User },
  { name: "Admin", href: "/admin", icon: ShieldCheck },
];

export function MobileNav() {
  return (
    <Suspense
      fallback={
        <div className="md:hidden inline-flex items-center justify-center rounded-md p-2">
          <Menu className="h-6 w-6" />
        </div>
      }
    >
      <MobileNavContent />
    </Suspense>
  );
}

function MobileNavContent() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const checkAdmin = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setIsAdmin(
        profile?.role === "admin" || profile?.role === "moderator"
      );
    };

    checkAdmin();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkAdmin();
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open Menu"
        className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-foreground hover:bg-muted transition-colors"
      >
        <Menu className="h-6 w-6" />
      </SheetTrigger>

      <SheetContent side="left" className="w-[300px] sm:w-[350px] flex flex-col">
        <SheetHeader className="border-b pb-4 text-left">
          <SheetTitle className="text-xl font-bold bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">
            YouthEngage 🚀
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-2 py-6 overflow-y-auto flex-1">
          {navItems
  .filter((item) => {
  if (item.href === "/leaderboard" || item.href === "/admin") {
    return isAdmin;
  }
  return true;
})
  .map((item) => {
    const Icon = item.icon;
    const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
