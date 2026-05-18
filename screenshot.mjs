import puppeteer from '/Users/stuartxu/node_modules/puppeteer/lib/puppeteer/puppeteer.js';
import { mkdir, readdir } from 'node:fs/promises';

const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] ? `-${process.argv[3]}` : '';
const dir = './temporary screenshots';
await mkdir(dir, { recursive: true });
const existing = await readdir(dir);
const n = existing.filter(f => f.startsWith('screenshot-')).length + 1;

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: 'networkidle0' });
await page.screenshot({ path: `${dir}/screenshot-${n}${label}.png`, fullPage: true });
await browser.close();
console.log(`Saved ${dir}/screenshot-${n}${label}.png`);
