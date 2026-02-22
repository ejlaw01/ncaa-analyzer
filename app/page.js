"use client";

import { useState, useEffect, useCallback } from "react";
import PicksTable from "@/components/PicksTable";
import RefreshButton from "@/components/RefreshButton";
import DownloadButton from "@/components/DownloadButton";

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);

  // Load picks on mount: try cache first, generate if empty
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/picks");
        const json = await res.json();
        if (json.data) {
          setData(json.data);
          setInitialLoad(false);
          return;
        }
      } catch {
        // No cached picks
      }

      // No cached data — auto-generate
      try {
        setLoading(true);
        const res = await fetch("/api/generate");
        const json = await res.json();
        if (res.ok) {
          setData(json);
        } else {
          setError(json.error || "Failed to generate picks");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    }
    loadData();
  }, []);

  // Refresh: calls The Odds API and regenerates picks
  const handleRefresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate?refresh=true");
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to generate picks");
      }
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-8">
      {/* Header */}
      <header className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              NCAA Basketball Over/Under Analysis &mdash;{" "}
              {new Date().toISOString().slice(0, 10)}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <RefreshButton onRefresh={handleRefresh} loading={loading} />
            <DownloadButton disabled={!data} />
          </div>
        </div>

        {/* Last generated timestamp */}
        {data?.generatedAt && (
          <div className="mt-2 text-xs text-gray-400">
            Last generated:{" "}
            {new Date(data.generatedAt).toLocaleString("en-US", {
              timeZone: "America/New_York",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
              month: "short",
              day: "numeric",
            })}{" "}
            ET
          </div>
        )}
      </header>

      {/* Error state */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
          <div className="font-medium">Error</div>
          <div className="text-sm mt-1">{error}</div>
        </div>
      )}

      {/* Loading state */}
      {initialLoad ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-gray-400">Loading...</div>
        </div>
      ) : (
        <PicksTable data={data} />
      )}

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
        <p>
          Over/Under analysis based on last 3 non-OT games per team. Recommends
          games where 4+ of 6 analyzed games went over. For entertainment
          purposes only.
        </p>
      </footer>
    </main>
  );
}
