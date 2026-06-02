import Link from "next/link";

export default function Home() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">CR-Lite — Continuity Receipts Demo</h1>
      <Link href="/query" className="text-blue-600 underline mt-4 inline-block">
        Go to Query
      </Link>
    </div>
  );
}
