"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { periodToDateRange, type Period } from "@/lib/date-utils";
import type { MetaAdsData, GA4Data, ShopifyData, SendcloudData } from "@/services/types";

function buildUrl(endpoint: string, period: Period): string {
  const range = periodToDateRange(period);
  const from = format(range.from, "yyyy-MM-dd");
  const to = format(range.to, "yyyy-MM-dd");
  return `/api/${endpoint}?from=${from}&to=${to}`;
}

function useApiData<T>(endpoint: string, period: Period) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(buildUrl(endpoint, period))
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [endpoint, period]);

  return { data, loading, error };
}

export function useMetaAdsData(period: Period) {
  return useApiData<MetaAdsData>("meta-ads", period);
}

export function useGA4Data(period: Period) {
  return useApiData<GA4Data>("ga4", period);
}

export function useShopifyData(period: Period) {
  return useApiData<ShopifyData>("shopify", period);
}

export function useSendcloudData(period: Period) {
  return useApiData<SendcloudData>("sendcloud", period);
}
