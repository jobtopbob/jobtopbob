"use client";

import { HeroSearch } from "@/components/discover/hero-search";
import { ScrapeRunList } from "@/components/discover/scrape-run-list";
import { DiscoveredJobList } from "@/components/discover/discovered-job-list";

export default function DiscoverPage() {
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-background">
      <HeroSearch />

      <div className="flex flex-col gap-8 px-7 pb-7 pt-2">
        <section className="space-y-4">
          <h2 className="font-heading text-lg font-semibold text-text-primary">
            Recent Searches
          </h2>
          <ScrapeRunList />
        </section>

        <section className="space-y-4">
          <h2 className="font-heading text-lg font-semibold text-text-primary">
            Discovered Jobs
          </h2>
          <DiscoveredJobList />
        </section>
      </div>
    </div>
  );
}
