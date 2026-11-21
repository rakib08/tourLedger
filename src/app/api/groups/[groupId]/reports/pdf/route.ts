import { NextResponse } from "next/server";

/**
 * Legacy server-side PDF endpoint. PDF generation now happens in the browser
 * using the authenticated /pdf-data endpoint to minimize hosting CPU usage.
 */
export async function GET() {
  return NextResponse.json(
    { error: "Server-side PDF generation is disabled. Use the client-side report download in the Reports page." },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
