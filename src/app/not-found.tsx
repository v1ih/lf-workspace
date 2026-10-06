import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <p className="font-mono text-sm text-accent">404</p>
        <h1 className="mt-2 text-2xl font-semibold">This page doesn&apos;t exist</h1>
        <Link href="/" className="mt-4 inline-block text-sm text-accent hover:underline">
          Back to the dashboard
        </Link>
      </div>
    </main>
  );
}
