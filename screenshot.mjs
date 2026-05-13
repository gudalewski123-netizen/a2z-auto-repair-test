import puppeteer from 'puppeteer';
import { readdir, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const url = process.argv[2];
const label = process.argv[3] || '';

if (!url) {
  console.error('Usage: node screenshot.mjs <url> [label]');
  process.exit(1);
}

const dir = './temporary screenshots';
if (!existsSync(dir)) await mkdir(dir, { recursive: true });

const files = await readdir(dir).catch(() => []);
const nums = files
  .map(f => parseInt(f.match(/screenshot-(\d+)/)?.[1] || '0', 10))
  .filter(n => !Number.isNaN(n) && n > 0);
const n = (nums.length ? Math.max(...nums) : 0) + 1;
const name = label ? `screenshot-${n}-${label}.png` : `screenshot-${n}.png`;
const filePath = `${dir}/${name}`;

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
await page.screenshot({ path: filePath, fullPage: true });
await browser.close();

console.log(`Saved: ${filePath}`);
