"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Opportunity = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  category: string | null;
  location: string | null;
  location_type: string | null;
  application_link: string | null;
  deadline: string | null;
  created_at: string;
};

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isManager, setIsManager] = useState(false);

  const supabase = createClient();

  const types = ["All", "Job", "Freelance", "Internship", "Scholarship", "Competition", "Volunteer", "Other"];
  const locations = ["All", "Kenya", "International", "Remote", "Hybrid"];

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      // Check if current user is admin or moderator
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile?.role === "admin" || profile?.role === "moderator") {
          setIsManager(true);
        }
      }

      // Load opportunities
      let query = supabase
        .from("opportunities")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (typeFilter !== "All") {
        query = query.eq("type", typeFilter);
      }

      if (locationFilter !== "All") {
        query = query.eq("location_type", locationFilter);
      }

      const { data } = await query;
      setOpportunities(data || []);
      setLoading(false);
    }

    loadData();
  }, [typeFilter, locationFilter]);

  const filteredOpportunities = opportunities.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      (item.description && item.description.toLowerCase().includes(query)) ||
      (item.category && item.category.toLowerCase().includes(query)) ||
      (item.location && item.location.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Opportunities
            </h1>
            <p className="text-gray-600">
              Jobs in Kenya, International roles, Remote gigs, Internships, Scholarships and more.
            </p>
          </div>

          {/* Only show this button to Admin / Moderator */}
          {isManager && (
            <Link
              href="/opportunities/post"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-full font-medium hover:from-blue-700 hover:to-purple-700 transition text-center"
            >
              Post Opportunity
            </Link>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by job title, keyword, category or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-5 py-3.5 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white shadow-sm text-sm"
          />
        </div>

        {/* Type Filters */}
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-600 mb-2">Type</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {types.map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                  typeFilter === type
                    ? "bg-purple-600 text-white"
                    : "bg-white text-gray-700 hover:bg-purple-50 border"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Location Filters */}
        <div className="mb-8">
          <p className="text-sm font-medium text-gray-600 mb-2">Location</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {locations.map((loc) => (
              <button
                key={loc}
                onClick={() => setLocationFilter(loc)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                  locationFilter === loc
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-blue-50 border"
                }`}
              >
                {loc}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-sm text-gray-500 mb-4">
            Showing {filteredOpportunities.length} opportunit{filteredOpportunities.length === 1 ? "y" : "ies"}
          </p>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-16 text-gray-500">Loading opportunities...</div>
        )}

        {/* Opportunities List */}
        {!loading && (
          <div className="space-y-4">
            {filteredOpportunities.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                No opportunities found. Try changing your search or filters.
              </div>
            ) : (
              filteredOpportunities.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
                          {item.type}
                        </span>
                        {item.category && (
                          <span className="text-xs font-medium bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full">
                            {item.category}
                          </span>
                        )}
                        <span className="text-xs font-medium bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                          {item.location_type}
                        </span>
                      </div>

                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {item.title}
                      </h3>

                      <p className="text-sm text-gray-500 mb-2">
                        📍 {item.location}
                      </p>

                      {item.description && (
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      {item.deadline && (
                        <p className="text-sm text-red-600">
                          Deadline: {new Date(item.deadline).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 min-w-[140px]">
                      {item.application_link ? (
                        <a
                          href={item.application_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-2.5 rounded-full text-sm font-medium text-center hover:from-blue-700 hover:to-purple-700 transition"
                        >
                          Apply Now
                        </a>
                      ) : (
                        <span className="text-sm text-gray-500 text-center">No link provided</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}