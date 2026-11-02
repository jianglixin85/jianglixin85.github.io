import { writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import config from '../sync.config';

const GITHUB_USERNAME = config.github.username;
const OUTPUT_DIR = join(import.meta.dirname, '..', 'src', 'content', 'projects-gh');

interface GitHubRepo {
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  topics?: string[];
}

function cleanDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    return;
  }
  for (const f of readdirSync(dir)) {
    if (f !== '.gitkeep') unlinkSync(join(dir, f));
  }
}

async function fetchRepos(): Promise<GitHubRepo[]> {
  const url = `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=10`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/vnd.github.v3+json' },
  });
  if (!res.ok) {
    console.error(`GitHub API error: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  return res.json() as Promise<GitHubRepo[]>;
}

function generateMarkdown(repo: GitHubRepo): string {
  const tags = [repo.language, ...(repo.topics || [])].filter(Boolean) as string[];
  const lines = [
    '---',
    `title: "${repo.name.replace(/"/g, '\\"')}"`,
    `description: "${(repo.description || '').replace(/"/g, '\\"')}"`,
    `tags: [${tags.map((t) => `"${t}"`).join(', ')}]`,
    `language: "${repo.language || ''}"`,
    `stars: ${repo.stargazers_count}`,
    `updated: "${repo.updated_at}"`,
    `url: "${repo.html_url}"`,
    `source: github`,
    `date: "${repo.updated_at.split('T')[0]}"`,
    '---',
  ];
  return lines.join('\n') + '\n';
}

async function main() {
  console.log('Syncing GitHub repositories...\n');

  cleanDir(OUTPUT_DIR);

  const repos = await fetchRepos();
  console.log(`Found ${repos.length} repositories`);

  let written = 0;
  for (const repo of repos) {
    const md = generateMarkdown(repo);
    const fileName = repo.name.replace(/[/\\?%*:|"<>]/g, '_') + '.md';
    writeFileSync(join(OUTPUT_DIR, fileName), md);
    console.log(`  Wrote: ${repo.name}`);
    written++;
  }

  console.log(`\nGitHub sync complete! ${written} repositories synced.`);
}

main();
