"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldAlert,
  Users,
  Briefcase,
  Trash2,
  Eye,
  UserCheck,
  Gamepad2,
  BarChart3,
  ArrowUpRight,
  Clock,
  UserPlus,
  Ban,
  CheckCircle2,
  Shield,
  Star,
  Activity,
} from "lucide-react";
import { toast } from "sonner";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  points: number;
  streak_count: number;
  is_admin: boolean;
  is_suspended: boolean;
  priority_tier: string;
  role: string;
  last_seen_at: string | null;
  last_seen_path: string | null;
}

interface Opportunity {
  id: string;
  title: string;
  organization: string;
  category: string;
  deadline: string;
}

interface AnalyticsEvent {
  id: string;
  visitor_id: string;
  user_id: string | null;
  user_name: string | null;
  event_type: string;
  page_path: string | null;
  created_at: string;
}

export default function AdminDashboard() {
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [activeTab, setActiveTab] = useState<"analytics" | "users" | "activity" | "opportunities">("analytics");
  const [loading, setLoading] = useState(true);

  // Create Account Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState("member");
  const [newPriority, setNewPriority] = useState("standard");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);

  const loadAllData = useCallback(async () => {
    const { data: analyticsData } = await supabase
      .from("analytics_events")
      .select("id, visitor_id, user_id, user_name, event_type, page_path, created_at")
      .order("created_at", { ascending: false })
      .limit(1500);
    if (analyticsData) setEvents(analyticsData);

    const { data: usersData } = await supabase
      .from("profiles")
      .select("id, full_name, email, points, streak_count, is_admin, is_suspended, priority_tier, role, last_seen_at, last_seen_path")
      .order("last_seen_at", { ascending: false, nullsFirst: false })
      .limit(100);
    if (usersData) setProfiles(usersData);

    const { data: oppsData } = await supabase
      .from("opportunities")
      .select("*")
      .order("created_at", { ascending: false });
    if (oppsData) setOpportunities(oppsData);
  }, [supabase]);

  useEffect(() => {
    async function checkAdminAndLoad() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      setCurrentUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!profile || !profile.is_admin) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      await loadAllData();
      setLoading(false);
    }
    checkAdminAndLoad();
  }, [supabase, loadAllData]);

  // Create New Account Handler
  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setCreatingUser(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          full_name: newFullName,
          role: newRole,
          priority_tier: newPriority,
          is_admin: newIsAdmin,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "Failed to create account");
      } else {
        toast.success(`Account created for ${newFullName}!`);
        setShowCreateModal(false);
        setNewEmail("");
        setNewPassword("");
        setNewFullName("");
        setNewRole("member");
        setNewPriority("standard");
        setNewIsAdmin(false);
        await loadAllData();
      }
    } catch {
      toast.error("Network error creating account.");
    } finally {
      setCreatingUser(false);
    }
  }

  // Toggle Suspend User
  async function toggleSuspendUser(target: Profile) {
    if (target.id === currentUserId) {
      toast.error("You cannot suspend your own active admin account.");
      return;
    }

    const nextSuspended = !target.is_suspended;
    const { error } = await supabase
      .from("profiles")
      .update({ is_suspended: nextSuspended })
      .eq("id", target.id);

    if (error) {
      toast.error("Failed to update suspension status.");
    } else {
      setProfiles((prev) =>
        prev.map((p) => (p.id === target.id ? { ...p, is_suspended: nextSuspended } : p))
      );
      toast.success(
        nextSuspended
          ? `${target.full_name || "User"} has been suspended.`
          : `${target.full_name || "User"} has been reactivated.`
      );
    }
  }

  // Update Priority Tier
  async function updatePriorityTier(userId: string, newTier: string) {
    const { error } = await supabase
      .from("profiles")
      .update({ priority_tier: newTier })
      .eq("id", userId);

    if (error) {
      toast.error("Failed to update user priority.");
    } else {
      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, priority_tier: newTier } : p))
      );
      toast.success(`Priority updated to ${newTier.toUpperCase()}`);
    }
  }

  // Update Role & Admin Rights
  async function updateUserRole(target: Profile, nextRole: string) {
    if (target.id === currentUserId && nextRole !== "admin") {
      toast.error("You cannot remove your own admin privileges.");
      return;
    }

    const makeAdmin = nextRole === "admin";
    const { error } = await supabase
      .from("profiles")
      .update({ role: nextRole, is_admin: makeAdmin })
      .eq("id", target.id);

    if (error) {
      toast.error("Failed to update user role.");
    } else {
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === target.id ? { ...p, role: nextRole, is_admin: makeAdmin } : p
        )
      );
      toast.success(`Role updated to ${nextRole.toUpperCase()}`);
    }
  }

  async function handleDeleteOpportunity(id: string) {
    const { error } = await supabase.from("opportunities").delete().eq("id", id);
    if (!error) {
      setOpportunities((prev) => prev.filter((o) => o.id !== id));
      toast.success("Opportunity deleted successfully.");
    } else {
      toast.error("Failed to delete opportunity.");
    }
  }

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">Loading Admin Control Center...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground text-sm">
          You do not have administrative privileges to view this page.
        </p>
      </div>
    );
  }

  // Analytics Calculations
  const pageViews = events.filter((e) => e.event_type === "page_view");
  const uniqueVisitors = new Set(events.map((e) => e.visitor_id)).size;
  const triviaEvents = events.filter(
    (e) => e.event_type === "trivia_played" || e.event_type === "trivia_visit"
  );
  const uniqueTriviaPlayers = new Set(triviaEvents.map((e) => e.visitor_id)).size;
  const gameEvents = events.filter(
    (e) => e.event_type === "game_played" || e.event_type === "game_visit"
  );
  const activeLoggedInUsers = profiles.filter((p) => {
    if (!p.last_seen_at) return false;
    return Date.now() - new Date(p.last_seen_at).getTime() < 24 * 60 * 60 * 1000;
  });

  // Top Visited Routes
  const pageCounts: Record<string, number> = {};
  for (const view of pageViews) {
    const path = view.page_path || "/";
    pageCounts[path] = (pageCounts[path] || 0) + 1;
  }
  const topPages = Object.entries(pageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
      {/* Header & Navigation Tabs */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Control Center 🛡️</h1>
          <p className="text-muted-foreground text-sm">
            Website analytics, user account governance, priority tiers, and real-time system engagement logs.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeTab === "analytics" ? "default" : "outline"}
            onClick={() => setActiveTab("analytics")}
            className="gap-2"
          >
            <BarChart3 className="w-4 h-4" /> Analytics
          </Button>
          <Button
            variant={activeTab === "users" ? "default" : "outline"}
            onClick={() => setActiveTab("users")}
            className="gap-2"
          >
            <Users className="w-4 h-4" /> Accounts & Rights ({profiles.length})
          </Button>
          <Button
            variant={activeTab === "activity" ? "default" : "outline"}
            onClick={() => setActiveTab("activity")}
            className="gap-2"
          >
            <Activity className="w-4 h-4" /> Logged Users & Trail
          </Button>
          <Button
            variant={activeTab === "opportunities" ? "default" : "outline"}
            onClick={() => setActiveTab("opportunities")}
            className="gap-2"
          >
            <Briefcase className="w-4 h-4" /> Opportunities ({opportunities.length})
          </Button>
          <Link href="/admin/mentorship">
            <Button variant="outline" className="gap-1.5">
              Mentorship <ArrowUpRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Page Views</CardTitle>
            <Eye className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pageViews.length}</div>
            <p className="text-xs text-muted-foreground mt-1">All recorded page loads</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Website Visitors</CardTitle>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueVisitors}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeLoggedInUsers.length} logged-in active (24h)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Trivia & Games</CardTitle>
            <Gamepad2 className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{triviaEvents.length + gameEvents.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {uniqueTriviaPlayers} unique players tried Trivia • {gameEvents.length} game plays
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Managed Accounts</CardTitle>
            <Shield className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profiles.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {profiles.filter((p) => p.priority_tier === "vip" || p.priority_tier === "priority").length} priority •{" "}
              {profiles.filter((p) => p.is_suspended).length} suspended
            </p>
          </CardContent>
        </Card>
      </div>

      {/* TAB 1: ANALYTICS */}
      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Most Visited Pages</CardTitle>
              <CardDescription>Where visitors spend time across YouthEngage</CardDescription>
            </CardHeader>
            <CardContent>
              {topPages.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No page views recorded yet. Navigate around the app to see traffic populate.
                </p>
              ) : (
                <div className="space-y-4">
                  {topPages.map(([path, count]) => {
                    const pct = pageViews.length > 0 ? Math.round((count / pageViews.length) * 100) : 0;
                    return (
                      <div key={path} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-mono font-medium">{path}</span>
                          <span className="text-muted-foreground">
                            {count} views ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Engagement Breakdown</CardTitle>
              <CardDescription>Trivia, Games, and User Actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">Trivia Attempts & Visits</p>
                  <p className="text-xs text-muted-foreground">{uniqueTriviaPlayers} distinct participants</p>
                </div>
                <Badge className="text-sm">{triviaEvents.length}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">Mini-Games Activity</p>
                  <p className="text-xs text-muted-foreground">Total game sessions logged</p>
                </div>
                <Badge variant="secondary" className="text-sm">{gameEvents.length}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">Active Priority / VIP Users</p>
                  <p className="text-xs text-muted-foreground">Accounts with elevated priority status</p>
                </div>
                <Badge variant="outline" className="text-sm">
                  {profiles.filter((p) => p.priority_tier !== "standard").length}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: ACCOUNTS, PRIORITY, SUSPEND & CREATE USER */}
      {activeTab === "users" && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>User Accounts, Priorities & Rights</CardTitle>
              <CardDescription>
                Create new accounts, assign priority tiers, elevate roles, or suspend accounts.
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateModal(!showCreateModal)} className="gap-2">
              <UserPlus className="w-4 h-4" />
              {showCreateModal ? "Close Form" : "Create New Account"}
            </Button>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Inline Create Account Panel */}
            {showCreateModal && (
              <form
                onSubmit={handleCreateAccount}
                className="p-5 border rounded-xl bg-muted/30 space-y-4"
              >
                <h3 className="font-semibold text-base">Create New Platform Account</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      placeholder="e.g. Jane Doe"
                      className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Temporary Password *</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Account Role & Rights</label>
                    <select
                      value={newRole}
                      onChange={(e) => {
                        setNewRole(e.target.value);
                        setNewIsAdmin(e.target.value === "admin");
                      }}
                      className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                    >
                      <option value="member">Member (Standard Rights)</option>
                      <option value="moderator">Moderator (Content Review)</option>
                      <option value="admin">Admin (Full System Rights)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Priority Tier</label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                    >
                      <option value="standard">Standard</option>
                      <option value="priority">Priority Access</option>
                      <option value="vip">VIP / Mentor Priority</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creatingUser}>
                    {creatingUser ? "Creating..." : "Create Account"}
                  </Button>
                </div>
              </form>
            )}

            {/* Users Management Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="p-3 font-medium">User</th>
                    <th className="p-3 font-medium">Points</th>
                    <th className="p-3 font-medium">Priority Tier</th>
                    <th className="p-3 font-medium">Role & Rights</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {profiles.map((p) => (
                    <tr key={p.id} className={p.is_suspended ? "bg-red-50/50" : "hover:bg-muted/30"}>
                      <td className="p-3">
                        <div className="font-medium">{p.full_name || "Unnamed User"}</div>
                        <div className="text-xs text-muted-foreground">{p.email || p.id.slice(0, 8)}</div>
                      </td>
                      <td className="p-3 font-semibold text-primary">{p.points || 0} pts</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 text-amber-500" />
                          <select
                            value={p.priority_tier || "standard"}
                            onChange={(e) => updatePriorityTier(p.id, e.target.value)}
                            className="text-xs border rounded px-2 py-1 bg-background"
                          >
                            <option value="standard">Standard</option>
                            <option value="priority">Priority</option>
                            <option value="vip">VIP</option>
                          </select>
                        </div>
                      </td>
                      <td className="p-3">
                        <select
                          value={p.is_admin ? "admin" : p.role || "member"}
                          onChange={(e) => updateUserRole(p, e.target.value)}
                          className="text-xs border rounded px-2 py-1 bg-background"
                        >
                          <option value="member">Member</option>
                          <option value="moderator">Moderator</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="p-3">
                        {p.is_suspended ? (
                          <Badge variant="destructive" className="gap-1">
                            <Ban className="w-3 h-3" /> Suspended
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-200 gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant={p.is_suspended ? "outline" : "destructive"}
                          onClick={() => toggleSuspendUser(p)}
                          disabled={p.id === currentUserId}
                        >
                          {p.is_suspended ? "Reactivate" : "Suspend"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 3: LOGGED USERS & SYSTEM ENGAGEMENT TRAIL */}
      {activeTab === "activity" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Currently / Recently Logged-In Users & Current Location */}
          <Card>
            <CardHeader>
              <CardTitle>Logged-In Users & Where Engaged</CardTitle>
              <CardDescription>Last active timestamp and exact page location per user</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {profiles.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 border rounded-lg text-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{p.full_name || "Anonymous"}</span>
                        {p.priority_tier !== "standard" && (
                          <Badge variant="secondary" className="text-[10px] uppercase">
                            {p.priority_tier}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Last engaged at:{" "}
                        <span className="font-mono text-foreground">{p.last_seen_path || "/"}</span>
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {p.last_seen_at ? (
                        <>
                          <div>{new Date(p.last_seen_at).toLocaleDateString()}</div>
                          <div>
                            {new Date(p.last_seen_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </>
                      ) : (
                        "Never"
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chronological System Audit Trail */}
          <Card>
            <CardHeader>
              <CardTitle>Live System Engagement Trail</CardTitle>
              <CardDescription>Real-time log of all page views, trivia plays, and actions</CardDescription>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No events logged yet.</p>
              ) : (
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {events.slice(0, 40).map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between p-2.5 border rounded-lg text-xs bg-muted/20"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {ev.user_name || `Guest (${ev.visitor_id.slice(0, 6)})`}
                          </span>
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {ev.event_type.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="font-mono text-muted-foreground">{ev.page_path || "/"}</p>
                      </div>
                      <span className="text-muted-foreground flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        {new Date(ev.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: OPPORTUNITIES */}
      {activeTab === "opportunities" && (
        <Card>
          <CardHeader>
            <CardTitle>Manage Opportunities</CardTitle>
            <CardDescription>Review and moderate posted jobs, internships, and grants</CardDescription>
          </CardHeader>
          <CardContent>
            {opportunities.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No opportunities posted yet.
              </p>
            ) : (
              <div className="space-y-4">
                {opportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-card"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base">{opp.title}</span>
                        <Badge variant="outline">{opp.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {opp.organization} • Deadline: {opp.deadline || "Open"}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteOpportunity(opp.id)}
                      className="gap-1.5"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}