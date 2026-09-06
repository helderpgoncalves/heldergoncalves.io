import type { APIRoute } from 'astro';
import { llmsFull } from '../lib/agents';

export const GET: APIRoute = () => llmsFull();
