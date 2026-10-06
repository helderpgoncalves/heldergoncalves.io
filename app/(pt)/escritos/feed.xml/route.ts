import { feed } from '@/lib/feed';

export const dynamic = 'force-static';
export const GET = () => feed('pt');
