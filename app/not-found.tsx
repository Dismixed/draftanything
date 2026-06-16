import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-xl border shadow-sm p-8 space-y-4">
          <h1 className="text-6xl font-bold text-gray-300">404</h1>
          <h2 className="text-xl font-semibold text-gray-900">Page not found</h2>
          <p className="text-gray-500 text-sm">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <div>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
