import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getDashboard, type SearchItem } from "@/lib/github.functions";

const dashboardQuery = queryOptions({
  queryKey: ["github-dashboard"],
  queryFn: () => getDashboard(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GitHub Connector Hub — Your repos, PRs and activity" },
      {
        name: "description",
        content: "One dashboard for your GitHub repositories, open pull requests, issues and recent activity.",
      },
      { property: "og:title", content: "GitHub Connector Hub" },
      {
        property: "og:description",
        content: "Your repositories, pull requests, issues and activity in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQuery),
  component: Dashboard,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-2xl px-6 py-24">
      <p className="label">connection error</p>
      <h1 className="mt-3 font-display text-3xl">Couldn't reach GitHub</h1>
      <p className="mt-3 break-words text-sm text-muted-foreground">{error.message}</p>
    </main>
  ),
});

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

const repoName = (url: string) => url.split("/repos/")[1];

function Dashboard() {
  const { data } = useSuspenseQuery(dashboardQuery);
  const { profile, repos, prs, issues, events } = data;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="flex flex-col gap-6 border-b border-border pb-10 sm:flex-row sm:items-center">
        <img src={profile.avatar_url} alt={profile.login} className="h-20 w-20 rounded-full ring-2 ring-primary" />
        <div className="flex-1">
          <p className="label">github connector hub</p>
          <h1 className="mt-1 font-display text-4xl font-bold">{profile.name ?? profile.login}</h1>
          {profile.bio && <p className="mt-1 text-muted-foreground">{profile.bio}</p>}
        </div>
        <div className="flex gap-8">
          <Stat label="repos" value={profile.public_repos} />
          <Stat label="followers" value={profile.followers} />
          <Stat label="following" value={profile.following} />
        </div>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="label mb-4">recent repositories</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {repos.map((r) => (
              <a key={r.id} href={r.html_url} target="_blank" rel="noreferrer" className="panel group">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-sm font-semibold text-primary group-hover:underline">
                    {r.name}
                  </span>
                  {r.private && <span className="chip">private</span>}
                </div>
                <p className="mt-2 line-clamp-2 min-h-10 text-sm text-muted-foreground">
                  {r.description ?? "No description"}
                </p>
                <div className="mt-3 flex gap-4 font-mono text-xs text-muted-foreground">
                  {r.language && <span>{r.language}</span>}
                  <span>★ {r.stargazers_count}</span>
                  <span>⑂ {r.forks_count}</span>
                  <span className="ml-auto">{ago(r.updated_at)}</span>
                </div>
              </a>
            ))}
          </div>
        </section>

        <aside className="space-y-10">
          <ItemList title="open pull requests" items={prs} empty="No open pull requests" />
          <ItemList title="assigned issues" items={issues} empty="No issues assigned to you" />
          <section>
            <h2 className="label mb-4">activity</h2>
            <ul className="space-y-2">
              {events.length === 0 && <li className="text-sm text-muted-foreground">No recent activity</li>}
              {events.map((e) => (
                <li key={e.id} className="flex justify-between gap-3 font-mono text-xs">
                  <span className="truncate">
                    <span className="text-primary">{e.type.replace("Event", "")}</span> {e.repo.name}
                  </span>
                  <span className="shrink-0 text-muted-foreground">{ago(e.created_at)}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-display text-2xl font-bold">{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}

function ItemList({ title, items, empty }: { title: string; items: SearchItem[]; empty: string }) {
  return (
    <section>
      <h2 className="label mb-4">{title}</h2>
      <ul className="space-y-2">
        {items.length === 0 && <li className="text-sm text-muted-foreground">{empty}</li>}
        {items.map((i) => (
          <li key={i.id}>
            <a href={i.html_url} target="_blank" rel="noreferrer" className="panel block py-3">
              <p className="line-clamp-1 text-sm">{i.title}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {repoName(i.repository_url)} #{i.number} · {ago(i.updated_at)}
              </p>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
