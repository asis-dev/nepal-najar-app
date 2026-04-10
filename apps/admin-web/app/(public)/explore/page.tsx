import { redirect } from 'next/navigation';

/** /explore is deprecated — redirect to home page */
export default function ExplorePage() {
  redirect('/');
}
