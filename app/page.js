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

  // Always generate fresh data on page load (30-min API cache prevents excess calls)
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch("/api/generate");
        const json = await res.json();
        if (res.ok) {
          setData(json);
        } else {
          // If generate fails (e.g. API quota), try serving cached picks
          const fallback = await fetch("/api/picks");
          const fallbackJson = await fallback.json();
          if (fallback.ok && fallbackJson.data) {
            setData(fallbackJson.data);
          }
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
              {new Date().toLocaleDateString("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" })}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <RefreshButton onRefresh={handleRefresh} loading={loading} />
            <DownloadButton disabled={!data} />
          </div>
        </div>

        {/* Last generated timestamp + API quota */}
        {data?.generatedAt && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-400">
            {data.apiQuota && data.apiQuota.total > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                  data.apiQuota.remaining === 0 ? "bg-red-500" :
                  data.apiQuota.remaining < 50 ? "bg-orange-500" :
                  data.apiQuota.remaining < 200 ? "bg-yellow-500" : "bg-green-500"
                }`} />
                {data.apiQuota.used}/{data.apiQuota.total} credits ({data.apiQuota.plan})
              </span>
            )}
            <span>
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
            </span>
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
