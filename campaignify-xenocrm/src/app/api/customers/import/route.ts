import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const text = await file.text();
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
    });

    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const record of records) {
      try {
        if (!record.email) {
          throw new Error("Email is required");
        }

        // Check if customer exists
        const existingCustomer = await prisma.customer.findUnique({
          where: { email: record.email },
        });

        if (existingCustomer) {
          // Update existing customer
          await prisma.customer.update({
            where: { email: record.email },
            data: {
              name: record.name || existingCustomer.name,
              phone: record.phone || existingCustomer.phone,
              address: record.address || existingCustomer.address,
              last_active: record.last_purchase_date ? new Date(record.last_purchase_date) : existingCustomer.last_active,
              total_spent: record.total_spent ? parseFloat(record.total_spent) : existingCustomer.total_spent,
            },
          });
          results.updated++;
        } else {
          // Create new customer
          await prisma.customer.create({
            data: {
              email: record.email,
              name: record.name || "",
              phone: record.phone || "",
              address: record.address || "",
              last_active: record.last_purchase_date ? new Date(record.last_purchase_date) : null,
              total_spent: record.total_spent ? parseFloat(record.total_spent) : null,
            },
          });
          results.created++;
        }
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Failed to process record: ${record.email} - ${error.message}`);
      }
    }

    return NextResponse.json({
      message: "Import completed",
      results,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Failed to import customers" },
      { status: 500 }
    );
  }
} 