import { test, expect } from '@playwright/test';
import { scheduleInputIndia, scheduleIsoIndia } from '../src/lib/campaignForm';
const API = 'http://127.0.0.1:4201';
let token: string;
test.beforeEach(async ({ request, page }) => {
  await request.post(`${API}/test/reset`);
  token = (await (await request.get(`${API}/test/session`)).json()).token;
  await page.addInitScript(value => { localStorage.setItem('citycalls_access_token', value); localStorage.setItem('citycalls_refresh_token', 'local-only'); }, token);
  // Uploaded files are intercepted at the external provider boundary.
  let uploadCount = 0;
  await page.route('https://api.cloudinary.com/**', route => route.fulfill({ json: { public_id: `fixture-${++uploadCount}`, secure_url: `https://example.com/fixture-${uploadCount}.jpg` } }));
  await page.goto('/dashboard/marketing/campaigns');
  await expect(page.getByRole('heading', { name: 'Marketing campaigns', exact: true })).toBeVisible();
});
async function createForm(page: import('@playwright/test').Page, name: string, count = 1) {
  await page.getByRole('button', { name: 'Create campaign', exact: true }).click();
  await page.getByLabel('Campaign name', { exact: true }).fill(name);
  await page.getByLabel('AiSensy API campaign name', { exact: true }).fill('Exact Live Campaign');
  await page.getByLabel('WhatsApp numbers', { exact: true }).fill(Array.from({ length: count }, (_, index) => String(9000000000 + index)).join('\n'));
}
async function campaigns(request: import('@playwright/test').APIRequestContext) {
  const response = await request.get(`${API}/api/v1/campaigns`, { headers: { Authorization: `Bearer ${token}` } });
  return (await response.json()).data;
}
test('501-number create, edit, IST schedule, clear and send end to end', async ({ page, request }) => {
  await createForm(page, 'Bulk browser campaign', 501);
  await expect(page.getByText('501 unique numbers; 0 duplicates removed; 0 invalid.')).toBeVisible();
  await expect(page.getByText('Template parameters (0)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  const article = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Bulk browser campaign' }) });
  await expect(article).toBeVisible();
  let records = await campaigns(request);
  expect(records).toHaveLength(1); expect(records[0].templateParams).toEqual([]); expect(records[0].audienceFilter.manualMobiles).toHaveLength(501);
  await article.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Schedule automatically', { exact: true }).check();
  const future = scheduleInputIndia(new Date(Date.now() + 3600000).toISOString());
  await page.getByLabel('Schedule date and time').fill(future);
  await page.getByRole('button', { name: 'Save schedule', exact: true }).click();
  await expect(article.getByText('SCHEDULED', { exact: true })).toBeVisible();
  records = await campaigns(request); expect(records[0].scheduledAt).toBe(scheduleIsoIndia(future));
  await article.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Schedule automatically', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(article.getByText('DRAFT', { exact: true })).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await article.getByRole('button', { name: 'Send now', exact: true }).click();
  await expect(article.getByText('SENDING', { exact: true })).toBeVisible();
  // Drain the real worker; provider sends are captured in the test server.
  for (let i = 0; i < 6; i++) await request.post(`${API}/test/scheduler`, { data: {} });
  await expect(article.getByText('COMPLETED', { exact: true })).toBeVisible();
  expect((await (await request.get(`${API}/test/provider-calls`)).json())).toHaveLength(501);
  await article.getByRole('button', { name: 'Delivery log', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Recipient delivery log' })).toBeVisible();
  await page.screenshot({ path: 'test-results/campaign-delivery-log.png', fullPage: true });
});
test('carousel has independent uploads and preserves parameter commas', async ({ page, request }) => {
  await createForm(page, 'Carousel browser campaign');
  await page.getByRole('button', { name: 'Add parameter', exact: true }).click();
  await page.getByLabel('Parameter 1', { exact: true }).fill('Hello, friend');
  await page.getByRole('combobox', { name: 'Template content', exact: true }).selectOption('CAROUSEL');
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7GQAAAAASUVORK5CYII=', 'base64');
  await page.getByLabel('Card 1 image', { exact: true }).setInputFiles({ name: 'one.png', mimeType: 'image/png', buffer: png });
  await page.getByLabel('Card 2 image', { exact: true }).setInputFiles({ name: 'two.png', mimeType: 'image/png', buffer: png });
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Carousel browser campaign', exact: true })).toBeVisible();
  const [campaign] = await campaigns(request);
  expect(campaign.templateParams).toEqual(['Hello, friend']); expect(campaign.carouselCards.map((card: { cardIndex: number }) => card.cardIndex)).toEqual([0, 1]);
  expect(campaign.carouselCards[0].imageUrl).not.toBe(campaign.carouselCards[1].imageUrl);
  await page.getByRole('article').filter({ hasText: 'Carousel browser campaign' }).getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByLabel('Parameter 1', { exact: true })).toHaveValue('Hello, friend');
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await page.getByRole('combobox', { name: 'Template content', exact: true }).selectOption('TEXT');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  const [updated] = await campaigns(request); expect(updated.carouselCards).toEqual([]); expect(updated.templateParams).toEqual([]);
});
test('document upload and due schedule run through the real scheduler', async ({ page, request }) => {
  await createForm(page, 'Document schedule');
  await page.getByRole('combobox', { name: 'Template content', exact: true }).selectOption('DOCUMENT');
  await page.getByLabel('Campaign attachment', { exact: true }).setInputFiles({ name: 'brochure.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nTest fixture') });
  await page.getByLabel('Schedule automatically', { exact: true }).check();
  await page.getByLabel('Schedule date and time').fill(scheduleInputIndia(new Date(Date.now() + 3600000).toISOString()));
  await page.getByRole('button', { name: 'Save schedule', exact: true }).click();
  const article = page.getByRole('article').filter({ hasText: 'Document schedule' });
  await expect(article.getByText('SCHEDULED', { exact: true })).toBeVisible();
  const [campaign] = await campaigns(request); expect(campaign.media.filename).toBe('brochure.pdf');
  await request.post(`${API}/test/scheduler`, { data: { id: campaign._id } });
  await expect(article.getByText('COMPLETED', { exact: true })).toBeVisible();
  const calls = await (await request.get(`${API}/test/provider-calls`)).json(); expect(calls[0].media.filename).toBe('brochure.pdf');
});
test('invalid numbers are visible and block saving', async ({ page, request }) => {
  await createForm(page, 'Invalid input');
  await page.getByLabel('WhatsApp numbers', { exact: true }).fill('9876543210\nnot-a-phone');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('invalid number');
  expect(await campaigns(request)).toHaveLength(0);
  await page.screenshot({ path: 'test-results/campaign-editor-validation.png', fullPage: true });
});
test('CSV import deduplicates numbers and the editor works at mobile width', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await createForm(page, 'Imported list');
  await page.getByLabel('Import a TXT / CSV list').setInputFiles({ name: 'numbers.csv', mimeType: 'text/csv', buffer: Buffer.from('9876543210\n+919876543210\n9123456789') });
  await expect(page.getByText('2 unique numbers; 1 duplicates removed; 0 invalid.')).toBeVisible();
  await page.screenshot({ path: 'test-results/campaign-mobile-editor.png', fullPage: true });
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Imported list', exact: true })).toBeVisible();
  const [campaign] = await campaigns(request); expect(campaign.audienceFilter.manualMobiles).toHaveLength(2);
});
test('failed media upload never schedules a partial campaign and retry reuses the draft', async ({ page, request }) => {
  await page.unroute('https://api.cloudinary.com/**');
  await page.route('https://api.cloudinary.com/**', route => route.fulfill({ status: 500, json: { error: 'fixture upload failure' } }));
  await createForm(page, 'Upload recovery');
  await page.getByRole('combobox', { name: 'Template content', exact: true }).selectOption('VIDEO');
  await page.getByLabel('Campaign attachment', { exact: true }).setInputFiles({ name: 'clip.mp4', mimeType: 'video/mp4', buffer: Buffer.from('video-fixture') });
  await page.getByLabel('Schedule automatically', { exact: true }).check();
  await page.getByLabel('Schedule date and time').fill(scheduleInputIndia(new Date(Date.now() + 3600000).toISOString()));
  await page.getByRole('button', { name: 'Save schedule', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('draft is saved');
  let records = await campaigns(request); expect(records).toHaveLength(1); expect(records[0].status).toBe('DRAFT');
  await page.unroute('https://api.cloudinary.com/**');
  await page.route('https://api.cloudinary.com/**', route => route.fulfill({ json: { public_id: 'video', secure_url: 'https://example.com/clip.mp4' } }));
  await page.getByRole('button', { name: 'Save schedule', exact: true }).click();
  await expect(page.getByRole('article').filter({ hasText: 'Upload recovery' }).getByText('SCHEDULED', { exact: true })).toBeVisible();
  records = await campaigns(request); expect(records).toHaveLength(1); expect(records[0].contentType).toBe('VIDEO');
});
