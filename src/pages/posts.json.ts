import type { APIRoute } from 'astro';
import { postsJson } from '../lib/agents';

export const GET: APIRoute = () => postsJson();
