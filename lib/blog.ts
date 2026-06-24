import fs from "fs";
import path from "path";
import matter from "gray-matter";

const POSTS_DIR = path.join(process.cwd(), "content", "blog");

export type PostCategory =
  | "Phishing"
  | "Bankovní podvody"
  | "SMS podvody"
  | "Tipy"
  | "Marketplace podvody"
  | "Investiční podvody";

export type PostFrontmatter = {
  title: string;
  description: string;
  publishedAt: string; // ISO date
  readMinutes: number;
  category: PostCategory;
};

export type Post = PostFrontmatter & {
  slug: string;
  content: string; // raw MDX body
};

export function getPostSlugs(): string[] {
  return fs
    .readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""));
}

export function getPostBySlug(slug: string): Post | undefined {
  const filePath = path.join(POSTS_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return undefined;

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);

  return {
    slug,
    title: data.title,
    description: data.description,
    publishedAt: data.publishedAt,
    readMinutes: data.readMinutes,
    category: data.category,
    content,
  };
}

export function getAllPosts(): Post[] {
  return getPostSlugs()
    .map((slug) => getPostBySlug(slug))
    .filter((post): post is Post => post !== undefined)
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}
