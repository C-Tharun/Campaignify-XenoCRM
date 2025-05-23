import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function CampaignsPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/auth/signin");
  }

  const campaigns = await prisma.campaign.findMany({
    include: {
      segment: true,
      messages: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // For each campaign, compute audience size and message stats
  const campaignStats = await Promise.all(
    campaigns.map(async (campaign) => {
      // Dynamic audience size based on segment rules
      let customerWhere: any = null;
      const rules = campaign.segment.rules as any;
      if (rules && Object.keys(rules).length > 0) {
        customerWhere = {};
        if (rules.name) {
          customerWhere.name = { contains: rules.name };
        }
        if (rules.country) {
          customerWhere.country = rules.country;
        }
        if (rules.max_visits !== undefined) {
          customerWhere.visits = { lte: rules.max_visits };
        }
        if (rules.min_total_spent !== undefined) {
          customerWhere.total_spent = { gte: rules.min_total_spent };
        }
        if (rules.min_days_inactive !== undefined) {
          const minInactiveDate = new Date();
          minInactiveDate.setDate(minInactiveDate.getDate() - rules.min_days_inactive);
          customerWhere.last_active = { lte: minInactiveDate };
        }
      }
      let audienceSize = 0;
      if (customerWhere) {
        audienceSize = await prisma.customer.count({ where: customerWhere });
      }
      // Message stats
      const sent = campaign.messages.filter((m) => m.status === "SENT" || m.status === "DELIVERED").length;
      const failed = campaign.messages.filter((m) => m.status === "FAILED").length;
      return { audienceSize, sent, failed };
    })
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <main className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                Campaigns
              </h2>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <Link
                href="/dashboard/campaigns/create"
                className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Campaign
              </Link>
            </div>
          </div>

          <div className="mt-8 flex flex-col">
            <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                        >
                          Name
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          Description
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          Status
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          Segment
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          Audience Size
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          Sent
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          Failed
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        >
                          Created
                        </th>
                        <th
                          scope="col"
                          className="relative py-3.5 pl-3 pr-4 sm:pr-6"
                        >
                          <span className="sr-only">View</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {campaigns.map((campaign, idx) => (
                        <tr key={campaign.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                            {campaign.name}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {campaign.description || "-"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                campaign.status === "SENDING"
                                  ? "bg-blue-100 text-blue-800"
                                  : campaign.status === "COMPLETED"
                                  ? "bg-green-100 text-green-800"
                                  : campaign.status === "FAILED"
                                  ? "bg-red-100 text-red-800"
                                  : campaign.status === "SCHEDULED"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {campaign.status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {campaign.segment.name}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {campaignStats[idx].audienceSize}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {campaignStats[idx].sent}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {campaignStats[idx].failed}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {new Date(campaign.createdAt).toLocaleDateString()}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <Link
                              href={`/dashboard/campaigns/${campaign.id}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 