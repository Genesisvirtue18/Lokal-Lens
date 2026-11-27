"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toSeoSlug } from "@/lib/directory-data";

const apiUrl = (process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:5000/api/v1")).replace(/\/$/, "");

// A row of plain text links, Justdial style.
function LinkRow({ title, items }) {
  if (!items.length) return null;
  return (
    <nav aria-label={title} className="flex flex-col gap-3">
      <p className="font-eyebrow text-[#6e7079]">{title}</p>
      <ul className="flex flex-wrap gap-y-1 text-[14px] leading-5">
        {items.map(([label, href], index) => (
          <li key={href} className="flex items-center">
            <Link href={href} className="py-1.5 text-[#101115] hover:text-[#002fa7]">{label}</Link>
            {index < items.length - 1 && <span className="px-2.5 text-[#bdbcb5]" aria-hidden="true">|</span>}
          </li>
        ))}
      </ul>
    </nav>
  );
}

// "Popular categories" and "Popular cities" in the footer. Loaded in the browser so the footer works on every page (including client pages).
export default function FooterLinks() {
  const [data, setData] = useState({ categories: [], cities: [] });
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch(`${apiUrl}/categories?limit=100`, { signal: controller.signal }).then((response) => response.json()).catch(() => null),
      fetch(`${apiUrl}/locations/business-cities`, { signal: controller.signal }).then((response) => response.json()).catch(() => null),
    ]).then(([categoryBody, cityBody]) => {
      const categories = (categoryBody?.data?.items || []).filter((category) => !category.parentCategory).slice(0, 12).map((category) => [category.name, `/directory?category=${encodeURIComponent(category.slug || category.name)}`]);
      const cities = (cityBody?.data?.items || []).map((city) => (typeof city === "string" ? city : city.name)).filter(Boolean).slice(0, 16).map((name) => [name, `/${toSeoSlug(name)}`]);
      if (!controller.signal.aborted) setData({ categories, cities });
    });
    return () => controller.abort();
  }, []);
  if (!data.categories.length && !data.cities.length) return null;
  return (
    <div className="flex flex-col gap-6 border-t border-[#dcdbd5] pt-8">
      <LinkRow title="Popular categories" items={data.categories} />
      <LinkRow title="Popular cities" items={data.cities} />
    </div>
  );
}
