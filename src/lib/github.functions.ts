import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/github";

async function gh<T>(path: string): Promise<T> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const ghKey = process.env["GITHUB_API_KEY"];
  if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
  if (!ghKey) throw new Error("GITHUB_API_KEY is not configured");
  const res = await fetch(`${GATEWAY_URL}/${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": ghKey,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`GitHub request failed [${res.status}]: ${body}`);
    throw new Error(`GitHub request failed [${res.status}]: ${body}`);
  }
  return res.json() as Promise<T>;
}

export type Profile = {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  html_url: string;
  public_repos: number;
  followers: number;
  following: number;
};

export type Repo = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  private: boolean;
  updated_at: string;
};

export type SearchItem = {
  id: number;
  title: string;
  html_url: string;
  number: number;
  repository_url: string;
  updated_at: string;
};

export type GhEvent = {
  id: string;
  type: string;
  repo: { name: string };
  created_at: string;
};

export const getDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const profile = await gh<Profile>("user");
  const q = (s: string) => encodeURIComponent(s);
  const [repos, prs, issues, events] = await Promise.all([
    gh<Repo[]>("user/repos?sort=updated&per_page=12&affiliation=owner,collaborator"),
    gh<{ items: SearchItem[] }>(
      `search/issues?q=${q(`is:pr is:open involves:${profile.login}`)}&per_page=8&sort=updated`,
    ),
    gh<{ items: SearchItem[] }>(
      `search/issues?q=${q(`is:issue is:open assignee:${profile.login}`)}&per_page=8&sort=updated`,
    ),
    gh<GhEvent[]>(`users/${profile.login}/events?per_page=10`),
  ]);
  return { profile, repos, prs: prs.items, issues: issues.items, events };
});
