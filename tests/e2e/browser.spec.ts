import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { artifacts, getModel } from '../../src/lib/data';
import { predict, toInput } from '../../src/lib/inference';
const routes = ['/', '/classification','/regression','/prediction','/decision-path','/pruning','/algorithm'];
async function ready(page: Page, route: string) {
  const response = await page.goto(route);
  expect(response?.status()).toBe(200);
  await expect(page.locator('h1')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}
test('every page renders, refreshes, performs a real action, and has no browser errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  for (const route of routes) {
    await ready(page, route);
    if (route === '/') await expect(page.getByRole('link',{name:'Bắt đầu trải nghiệm'})).toHaveAttribute('href','/prediction');
    if (route === '/classification' || route === '/regression') {
      const a = route === '/classification' ? artifacts.classification : artifacts.regression;
      await page.getByLabel('Mô hình đã huấn luyện').selectOption(a.baseline);
      await expect(page.locator('.model-details')).toContainText('α =');
      await page.getByRole('button',{name:'Phóng to cây'}).click();
      await page.getByLabel('Chọn node để kiểm tra').selectOption('1');
      await expect(page.locator('.node-details')).toContainText('#1');
    }
    if (route === '/prediction') {
      await page.getByRole('button',{name:'Predict · tính dự báo'}).click();
      await expect(page.getByTestId('prediction-result')).toBeVisible();
      const a = artifacts.classification, result = predict(a,getModel(a),toInput(a,a.demos[0].values));
      await expect(page.locator('.result-value')).toContainText(result.prediction ? 'malignant' : 'benign');
      await expect(page.locator('[data-path-node="true"]')).toHaveCount(result.path.length);
      await expect(page.locator('[data-path-edge="true"]')).toHaveCount(result.path.length-1);
      await page.getByRole('button',{name:'Regression',exact:true}).click();
      await page.getByRole('button',{name:'Predict · tính dự báo'}).click();
      await expect(page.getByTestId('prediction-result')).toContainText('regression-06');
    }
    if (route === '/decision-path') {
      await expect(page.locator('.path-leaf')).toBeVisible();
      await page.getByLabel('Mẫu demo từ tập test').selectOption(String(artifacts.classification.demos[1].id));
      await page.getByRole('button',{name:'Truy vết đường đi'}).click();
      await expect(page.locator('.path-leaf')).toContainText('THEN');
      await page.locator('.path-step').first().click();
      await expect(page.locator('.node-details')).toContainText('#0');
    }
    if (route === '/pruning') {
      await page.getByLabel('Alpha · chỉ các cấu hình đã huấn luyện').selectOption('classification-11');
      await expect(page.locator('.model-details')).toContainText('1 lá');
      await page.getByRole('button',{name:'Regression',exact:true}).click();
      await expect(page.locator('.model-details')).toContainText('160');
    }
    if (route === '/algorithm') {
      const slider = page.getByRole('slider',{name:'Số mẫu benign'});
      await slider.fill('0');
      await expect(page.getByTestId('gini-value')).toHaveText('0');
    }
    await page.screenshot({path:`evidence/screenshots/${route === '/' ? 'overview' : route.slice(1)}-dark.png`,fullPage:true});
    await page.reload(); await expect(page.locator('h1')).toBeVisible();
  }
  expect(errors).toEqual([]);
});
test('rejects missing and out-of-range input, clears stale prediction', async ({ page }) => {
  await ready(page,'/prediction');
  const button = page.getByRole('button',{name:'Predict · tính dự báo'});
  await button.click(); await expect(page.getByTestId('prediction-result')).toBeVisible();
  const input = page.locator('input[name="mean radius"]');
  await input.fill(''); await expect(page.getByTestId('prediction-result')).toHaveCount(0);
  await button.click(); await expect(page.locator('.input-error')).toContainText('không được để trống');
  await input.fill('9999'); await button.click(); await expect(page.locator('.input-error')).toContainText('ngoài miền');
  await page.getByLabel('Mẫu demo từ tập test').selectOption(String(artifacts.classification.demos[2].id));
  await button.click(); await expect(page.getByTestId('prediction-result')).toBeVisible();
});
test('desktop dark/light accessibility and persistent theme', async ({ page }) => {
  for (const theme of ['dark','light']) {
    await page.addInitScript(value => localStorage.setItem('cart-theme',value),theme);
    for (const route of routes) {
      await ready(page,route);
      const results = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
      expect(results.violations.map(v => ({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
    }
    await page.screenshot({path:`evidence/screenshots/algorithm-${theme}.png`,fullPage:true});
  }
  await page.getByRole('button',{name:'Chuyển sang giao diện tối'}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  // Remove forced init scripts by checking persisted preference through actual localStorage.
  expect(await page.evaluate(()=>localStorage.getItem('cart-theme'))).toBe('dark');
});
test('mobile and tablet layout, navigation, and text enlargement', async ({ page }) => {
  for (const width of [390,768]) {
    await page.setViewportSize({width,height:844});
    for (const route of routes) {
      await ready(page,route);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),`${width}px ${route}`).toBe(true);
    }
    await ready(page,'/');
    await page.screenshot({path:`evidence/screenshots/overview-${width}.png`,fullPage:true});
    if (width===390) {
      await page.getByRole('button',{name:'Mở menu điều hướng'}).click();
      await page.getByRole('link',{name:'Phòng phân loại'}).click();
      await expect(page).toHaveURL(/classification/);
    }
  }
  await page.setViewportSize({width:1440,height:1000});
  await ready(page,'/prediction');
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
});
