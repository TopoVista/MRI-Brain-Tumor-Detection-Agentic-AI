import { DashboardClient } from "@/components/dashboard-client";
import { fetchCases } from "@/lib/api";

export default async function Home() {
  const initialCases = await fetchCases();
  return <DashboardClient initialCases={initialCases} />;
}
