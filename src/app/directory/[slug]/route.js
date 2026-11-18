import { NextResponse } from "next/server";
import { getBusiness } from "@/lib/api";
import { businessDetailPath } from "@/lib/directory-data";

// The old /directory/<name> address forwards to the listing's one permanent address with a real 308,
// so search engines keep a single copy of every business and pass the old links' value along.
export async function GET(request, { params }) {
  const { slug } = await params;
  const business = await getBusiness(slug);
  if (!business) return new NextResponse("Not found", { status: 404, headers: { "X-Robots-Tag": "noindex" } });
  return NextResponse.redirect(new URL(businessDetailPath(business), request.url), 308);
}
