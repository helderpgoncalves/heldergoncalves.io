import type { APIRoute } from 'astro';
import { llmsIndex } from '../../lib/agents';

export const GET: APIRoute = () => llmsIndex('en');
