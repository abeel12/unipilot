import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="glass-panel max-w-md rounded-3xl p-8 text-center">
        <p className="text-sm text-primary">404</p>
        <h1 className="mt-2 text-2xl font-semibold">This page is not on the map</h1>
        <p className="mt-2 text-sm text-muted-foreground">The link may be outdated. Head back to the UniPilot home page.</p>
        <Link href="/" className="mt-5 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground">
          Go home
        </Link>
      </div>
    </div>
  );
}
