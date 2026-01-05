// Application database configuration loader.
//
// This module attempts to load a repo-level `config.json` file with the
// shape { "DATABASE_URL": "...", "MICROREACT_VIEWER_URL": "..." } when present.
// If not present it falls back to harmless defaults. Do NOT commit a real `config.json`.
// Use `config.example.json` as a template and add `config.json` to .gitignore.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cfgPath = path.resolve(__dirname, '..', 'config.json');
let databaseUrl = "postgres:///pathogen_archive"; // example default
let microreactViewerUrl: string | null = null; // optional local viewer URL

if (fs.existsSync(cfgPath)) {
	try {
		const raw = fs.readFileSync(cfgPath, 'utf8');
		const parsed = JSON.parse(raw);
		if (parsed && parsed.DATABASE_URL) databaseUrl = parsed.DATABASE_URL;
		if (parsed && parsed.MICROREACT_VIEWER_URL) microreactViewerUrl = parsed.MICROREACT_VIEWER_URL;
	} catch (err) {
		// ignore and keep default
	}
}

export const DATABASE_URL = databaseUrl;
export const MICROREACT_VIEWER_URL = microreactViewerUrl;

