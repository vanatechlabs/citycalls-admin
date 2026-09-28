import Link from 'next/link';

// Loading spinner / not-found message for the overview and edit pages.
export function RegistrationLoadState({ loading, error }: { loading: boolean; error: boolean }) {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4">
      {loading ? (
        <>
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#3e8914] border-t-transparent" />
          <p className="text-sm font-medium text-gray-500">Loading registration...</p>
        </>
      ) : (
        <>
          <p className="text-sm font-bold text-red-600">{error ? 'Registration not found or could not be loaded.' : 'Registration not found.'}</p>
          <Link href="/dashboard/registrations" className="bg-[#3e8914] px-4 py-2 text-xs font-bold text-white hover:bg-[#347311]">
            Back to Registration List
          </Link>
        </>
      )}
    </div>
  );
}
