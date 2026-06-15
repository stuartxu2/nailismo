import type { Metadata } from "next";
import ResultPicker from "./ResultPicker";

export const metadata: Metadata = {
  title: "Your custom designs | Nailismo",
  robots: { index: false }, // per-session, not for search
};

export default async function ResultPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <ResultPicker sessionId={sessionId} />;
}
