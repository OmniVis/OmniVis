import { getDoc, getDocs } from '$lib/content';
import { error } from '@sveltejs/kit';

export const prerender = true;

// Pre-define all valid slugs for the static adapter during build
export function entries() {
  const docs = getDocs();
  return docs.map((d) => ({ slug: d.slug }));
}

export const load = ({ params }) => {
  const doc = getDoc(params.slug);

  if (!doc) {
    throw error(404, 'Documentation file not found');
  }

  return {
    doc
  };
};
