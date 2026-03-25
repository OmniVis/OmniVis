import { getDocs } from '$lib/content';

export const prerender = true;

export const load = () => {
  const docs = getDocs();

  // Return just the metadata so we don't send huge HTML payloads to the list view
  return {
    docs: docs.map((d) => ({
      slug: d.slug,
      title: d.frontmatter.title || 'Untitled',
      date: d.frontmatter.date || ''
    }))
  };
};
