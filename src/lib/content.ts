import matter from 'gray-matter';
import { marked } from 'marked';

export interface Document {
  slug: string;
  frontmatter: Record<string, unknown>;
  html: string;
}

// Loads all markdown files from the docs folder
export function getDocs(): Document[] {
  const files = import.meta.glob('/src/content/docs/*.md', {
    eager: true,
    query: '?raw',
    import: 'default'
  });
  const docs: Document[] = [];

  for (const [path, content] of Object.entries(files)) {
    const slug = path.split('/').pop()?.replace('.md', '') || '';
    const parsed = matter(content as string);
    docs.push({
      slug,
      frontmatter: parsed.data,
      html: marked.parse(parsed.content) as string
    });
  }

  // Sort by date descending
  return docs.sort((a, b) => {
    const dateStrA = (a.frontmatter.date as string)?.trim() || 0;
    const dateStrB = (b.frontmatter.date as string)?.trim() || 0;
    const dateA = new Date(dateStrA).getTime();
    const dateB = new Date(dateStrB).getTime();
    return dateB - dateA;
  });
}

// Get a specific doc by slug
export function getDoc(slug: string): Document | undefined {
  const docs = getDocs();
  return docs.find((d) => d.slug === slug);
}
