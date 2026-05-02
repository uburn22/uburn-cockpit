import { google } from "googleapis";
import { format } from "date-fns";
import type { TrafficSource, DailySessions, GA4Data, DateRange } from "../types";

const PROPERTY_ID = process.env.GA4_PROPERTY_ID!;

async function getAnalyticsClient() {
  // Support: file path (local dev), legacy JSON env, or modern GA4_SERVICE_ACCOUNT_JSON (Doppler/Cloud Run)
  const credentialsPath = process.env.GA4_CREDENTIALS_PATH;
  const credentialsJson =
    process.env.GA4_CREDENTIALS_JSON || process.env.GA4_SERVICE_ACCOUNT_JSON;

  let auth;
  if (credentialsJson) {
    const credentials = JSON.parse(credentialsJson);
    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
    });
  } else if (credentialsPath) {
    auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
    });
  } else {
    throw new Error("GA4 credentials not configured");
  }
  return google.analyticsdata({ version: "v1beta", auth });
}

export async function getRealGA4Data(range: DateRange): Promise<GA4Data> {
  const client = await getAnalyticsClient();
  const startDate = format(range.from, "yyyy-MM-dd");
  const endDate = format(range.to, "yyyy-MM-dd");

  // 1. Daily sessions with new vs returning
  const dailyRes = await client.properties.runReport({
    property: `properties/${PROPERTY_ID}`,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "date" }, { name: "newVsReturning" }],
      metrics: [{ name: "sessions" }, { name: "totalUsers" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
    },
  });

  // Parse daily data
  const dailyMap = new Map<string, DailySessions>();
  let totalNew = 0;
  let totalReturning = 0;
  let totalSessions = 0;

  for (const row of dailyRes.data?.rows || []) {
    const rawDate = row.dimensionValues?.[0]?.value || "";
    // GA4 returns YYYYMMDD
    const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
    const type = row.dimensionValues?.[1]?.value || "";
    const sessions = parseInt(row.metricValues?.[0]?.value || "0", 10);

    if (!dailyMap.has(date)) {
      dailyMap.set(date, { date, sessions: 0, newUsers: 0, returningUsers: 0 });
    }
    const entry = dailyMap.get(date)!;
    entry.sessions += sessions;

    if (type === "new") {
      entry.newUsers += sessions;
      totalNew += sessions;
    } else {
      entry.returningUsers += sessions;
      totalReturning += sessions;
    }
    totalSessions += sessions;
  }

  const daily = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // 2. Traffic sources
  const sourcesRes = await client.properties.runReport({
    property: `properties/${PROPERTY_ID}`,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: "10",
    },
  });

  const sources: TrafficSource[] = (sourcesRes.data?.rows || []).map((row) => {
    const sessions = parseInt(row.metricValues?.[0]?.value || "0", 10);
    return {
      source: row.dimensionValues?.[0]?.value || "(unknown)",
      medium: row.dimensionValues?.[1]?.value || "(unknown)",
      sessions,
      percentage: totalSessions > 0 ? Math.round((sessions / totalSessions) * 1000) / 1000 : 0,
    };
  });

  return {
    totalSessions,
    newVsReturning: { new: totalNew, returning: totalReturning },
    sources,
    daily,
  };
}
