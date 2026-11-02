import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    date: z.date(),
    lang: z.enum(['zh', 'en']).default('zh'),
    draft: z.boolean().default(false),
    source: z.enum(['local', 'feishu']).default('local'),
    feishuUrl: z.string().optional(),
  }),
});

const notesFeishu = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes-feishu' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    date: z.date(),
    lang: z.enum(['zh', 'en']).default('zh'),
    draft: z.boolean().default(false),
    source: z.enum(['local', 'feishu']).default('feishu'),
    feishuUrl: z.string().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    url: z.string().optional(),
    repo: z.string().optional(),
    date: z.date(),
    pinned: z.boolean().default(false),
  }),
});

const projectsGitHub = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects-gh' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    language: z.string().optional(),
    stars: z.number().default(0),
    updated: z.string(),
    url: z.string(),
    source: z.literal('github'),
    date: z.coerce.date(),
  }),
});

export const collections = { notes, notesFeishu, projects, projectsGitHub };
