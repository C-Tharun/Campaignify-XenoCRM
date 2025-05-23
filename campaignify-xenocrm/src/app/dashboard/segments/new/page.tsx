import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import SegmentForm from "@/components/SegmentForm";

export default async function NewSegmentPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Create New Segment
              </h2>
            </div>
          </div>

          <div className="mt-8">
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <SegmentForm mode="create" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 