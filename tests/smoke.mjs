import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:4173';
const SHOT_DIR = process.env.SHOT_DIR ?? '.';
const EP2_KEY = 'midnight-will:save:episode_02:v1';
const EP1_KEY = 'midnight-will:save:v1';

function log(msg) {
  console.log(`[smoke] ${msg}`);
}

async function getFlags(page, storageKey) {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw).state.flags : [];
  }, storageKey);
}

async function assertFlags(page, storageKey, expected, label) {
  const flags = await getFlags(page, storageKey);
  const missing = expected.filter((flag) => !flags.includes(flag));
  if (missing.length) throw new Error(`${label}: フラグ未設定 ${missing.join(', ')} (現在: ${flags.join(', ')})`);
  log(`${label} OK`);
}

async function clickCommand(page, label) {
  await page.locator('.command-grid button', { hasText: label }).click();
}

async function inspect(page, actionLabel) {
  await clickCommand(page, '調べる');
  await page.locator('.action-stack button', { hasText: actionLabel }).first().click();
}

async function moveTo(page, locationLabel) {
  await clickCommand(page, '移動');
  await page.locator('.action-stack button', { hasText: locationLabel }).first().click();
}

async function talk(page, characterName, talkLabel) {
  await clickCommand(page, '話す');
  await page
    .locator('.action-stack button', { hasText: characterName })
    .filter({ hasText: talkLabel })
    .first()
    .click();
}

async function present(page, characterName, evidenceName) {
  await clickCommand(page, '見せる');
  await page.selectOption('#character-select', { label: characterName });
  await page.selectOption('#evidence-select', { label: evidenceName });
  await page.locator('button', { hasText: '突きつける' }).click();
}

async function playEpisode2(page) {
  await page.goto(`${BASE}/?ep=episode_02`);
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  await page.waitForSelector('h1');
  const title = await page.locator('h1').textContent();
  if (!title.includes('消えた準備書面')) throw new Error(`第2話タイトルが出ない: ${title}`);
  log(`タイトル表示 OK: ${title}`);
  await page.screenshot({ path: `${SHOT_DIR}/ep2-title.png` });

  await page.locator('button', { hasText: '調査を始める' }).click();
  await page.locator('button', { hasText: '導入をスキップ' }).click();
  log('導入スキップ → 調査開始');

  // 所長室: 証拠3点
  await inspect(page, '提出セット');
  await inspect(page, '決裁ファイル');
  await inspect(page, '事件管理端末');
  await assertFlags(page, EP2_KEY, ['found_draft_new', 'found_draft_old', 'found_update_log'], '所長室の証拠3点');
  await page.screenshot({ path: `${SHOT_DIR}/ep2-investigation.png` });

  // 三上に事情を聞く(梶原と同名ラベルなので人物名で絞る)
  await talk(page, '三上悠人', '事情を聞く');
  await assertFlags(page, EP2_KEY, ['mikami_claims_typo'], '三上の供述');

  // 受付: 勤怠記録 → remote_edit 自動イベント
  await moveTo(page, '受付');
  await inspect(page, '勤怠記録');
  await assertFlags(page, EP2_KEY, ['found_exit_record', 'remote_edit_established'], '自動イベント remote_edit');

  // コピー機前: プリンタ履歴 → 野崎からメール履歴
  await moveTo(page, 'コピー機前');
  await inspect(page, 'プリンタ履歴');
  await talk(page, '野崎真由', '印刷の経緯を聞く');
  await assertFlags(page, EP2_KEY, ['found_print_log', 'found_mail_log', 'clerk_explained_print'], 'プリンタ履歴とメール履歴');

  // 三上への追い込み
  await present(page, '三上悠人', '更新ログ');
  await present(page, '三上悠人', '退勤記録');
  await present(page, '三上悠人', 'メール履歴');
  await assertFlags(page, EP2_KEY, ['pressed_mikami_log', 'pressed_mikami_remote', 'mikami_admitted'], '三上の自白');

  // 榊原と所長 → 最終推理開放
  await present(page, '榊原恒雄', 'メール履歴');
  await present(page, '梶原誠', '準備書面 新版');
  await assertFlags(page, EP2_KEY, ['client_pressed', 'director_confirmed_intentional', 'final_unlocked'], '最終推理の開放');

  // 不正解 → 失敗パネル
  await clickCommand(page, '推理する');
  await page.locator('input[name="culprit"][value="clerk"]').check();
  await page.locator('input[name="method"][value="typo_accident"]').check();
  await page.locator('input[name="proof"][value="print_log"]').check();
  await page.locator('button', { hasText: '結論を出す' }).click();
  await page.waitForSelector('.deduction-failure-panel');
  log('不正解 → 推理不成立パネル OK');
  await page.locator('button', { hasText: '推理に戻る' }).click();

  // 正解
  await page.locator('input[name="culprit"][value="associate"]').check();
  await page.locator('input[name="method"][value="remote_edit"]').check();
  await page.locator('input[name="proof"][value="update_log"]').check();
  await page.locator('button', { hasText: '結論を出す' }).click();
  await page.waitForSelector('.ending-progress');
  await assertFlags(page, EP2_KEY, ['cleared'], '正解 → エンディング開始');

  // エンディングを最後まで送る
  for (let i = 0; i < 12; i++) {
    const next = page.locator('.ending-actions button', { hasText: '次へ' });
    if ((await next.count()) === 0) break;
    await next.click();
  }
  const endingTitle = await page.locator('.story-panel h1').textContent();
  if (!endingTitle.includes('第2話 完')) throw new Error(`クリア表示が出ない: ${endingTitle}`);
  log('第2話 完 まで到達 OK');
  await page.screenshot({ path: `${SHOT_DIR}/ep2-clear.png` });
}

async function checkEpisode1(page) {
  await page.goto(BASE);
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.waitForSelector('h1');
  const title = await page.locator('h1').textContent();
  if (!title.includes('午前0時の遺言書')) throw new Error(`第1話タイトルが出ない: ${title}`);
  log(`第1話デフォルト表示 OK: ${title}`);

  // エピソード切替
  await page.locator('.episode-card', { hasText: '第2話' }).click();
  const t2 = await page.locator('h1').textContent();
  if (!t2.includes('消えた準備書面')) throw new Error('カード切替で第2話にならない');
  await page.locator('.episode-card', { hasText: '第1話' }).click();
  const t1 = await page.locator('h1').textContent();
  if (!t1.includes('午前0時の遺言書')) throw new Error('カード切替で第1話に戻らない');
  log('エピソード切替 OK');

  // 第1話の冒頭が従来どおり動くこと
  await page.locator('button', { hasText: '調査を始める' }).click();
  await page.locator('button', { hasText: '導入をスキップ' }).click();
  await inspect(page, '金庫');
  await assertFlags(page, EP1_KEY, ['found_empty_envelope'], '第1話 冒頭動作');
}

async function checkMobile(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?ep=episode_02`);
  await page.waitForSelector('h1');
  await page.screenshot({ path: `${SHOT_DIR}/ep2-title-mobile.png` });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (overflow) throw new Error('モバイル幅で横スクロールが発生');
  log('モバイル幅レイアウト OK');
  await ctx.close();
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
page.on('pageerror', (err) => {
  console.error(`[pageerror] ${err.message}`);
  process.exitCode = 1;
});

try {
  await playEpisode2(page);
  await checkEpisode1(page);
  await checkMobile(browser);
  log('ALL OK');
} finally {
  await browser.close();
}
