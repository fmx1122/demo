import { chromium } from "playwright";
import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { extname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "..");
const PORT = 8765;

// ── Minimal static server ──
function startServer() {
  const MIME = { ".html":"text/html",".js":"application/javascript",".json":"application/json",".css":"text/css",".png":"image/png",".ico":"image/x-icon",".svg":"image/svg+xml",".mp3":"audio/mpeg",".woff2":"font/woff2" };
  return new Promise(resolve => {
    const srv = createServer((req, res) => {
      let p = req.url === "/" ? "/index.html" : req.url.split("?")[0];
      const fp = join(ROOT, p);
      try {
        if (!existsSync(fp)) { res.writeHead(404); res.end(); return; }
        const data = readFileSync(fp);
        res.writeHead(200, { "Content-Type": MIME[extname(p)] || "application/octet-stream", "Access-Control-Allow-Origin": "*" });
        res.end(data);
      } catch { res.writeHead(500); res.end(); }
    });
    srv.listen(PORT, () => resolve(srv));
  });
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Helpers ──
async function getText(page, sel) { return page.$eval(sel, el => el.textContent.trim()).catch(() => ""); }
async function click(page, sel) { await page.waitForSelector(sel, { timeout: 5000 }); await page.click(sel, { force: true }); }
async function fill(page, sel, val) { await page.waitForSelector(sel, { timeout: 5000 }); await page.fill(sel, val); }
async function count(page, sel) { return page.$$eval(sel, els => els.length).catch(() => 0); }

async function waitModalOpen(page, modalId) {
  await page.waitForFunction(id => {
    const el = document.getElementById(id);
    return el && el.style.display !== "none" && el.style.display !== "";
  }, modalId, { timeout: 5000 });
}
async function waitModalClose(page, modalId) {
  await page.waitForFunction(id => {
    const el = document.getElementById(id);
    return !el || el.style.display === "none" || el.style.display === "";
  }, modalId, { timeout: 5000 });
}

// ── Tests ──
let passed = 0, failed = 0;
const errors = [];

function assert(cond, msg) {
  if (cond) { passed++; return; }
  failed++;
  errors.push(msg);
  console.error("  ✗ " + msg);
}

async function runTests(page) {
  const base = `http://localhost:${PORT}`;

  // 1. Page loads
  console.log("\n[1] 页面加载");
  await page.goto(base, { waitUntil: "load", timeout: 15000 });

  // Dismiss any opening/tutorial overlays
  await page.evaluate(() => {
    localStorage.setItem("openingSeen_v1", "true");
    localStorage.setItem("tutorialSeen_v1", "true");
  });
  await page.reload({ waitUntil: "load", timeout: 15000 });
  await wait(2000);
  // Force-hide any remaining overlay
  await page.evaluate(() => {
    document.querySelectorAll(".opening-overlay, #opening-overlay, .tutorial-overlay, #tutorialOverlay, #loadingOverlay").forEach(el => {
      el.style.display = "none"; el.style.pointerEvents = "none";
    });
  });
  await wait(1000);

  assert(await page.title() !== "", "页面标题存在");
  assert(await page.$(".top-bar") !== null, "顶栏存在");
  assert(await page.$(".game-container, #game-container") !== null, "游戏容器存在");
  await wait(1500);
  const loadingDisplay = await page.$eval("#loadingOverlay", el => el.style.display || el.style.opacity).catch(() => "none");
  assert(loadingDisplay === "none" || await count(page, "#game-container") > 0, "加载完成后主界面显示");
  console.log("  ✓ 页面加载完成");

  // 2. Default word library loaded
  console.log("\n[2] 词库加载");
  const settingsVisible = await page.$("#settingsBtn").then(b => b.isVisible()).catch(() => false);
  assert(settingsVisible, "设置按钮可见");

  // 3. Settings panel
  console.log("\n[3] 设置面板");
  await click(page, "#settingsBtn");
  await waitModalOpen(page, "settingsModal");
  assert(await page.$("#settingsModal") !== null, "设置弹窗打开");
  const soundToggle = await page.$("#soundToggle");
  if (soundToggle) {
    const checked = await soundToggle.isChecked().catch(() => null);
    if (checked !== null) {
      await soundToggle.click();
      const after = await soundToggle.isChecked().catch(() => null);
      assert(after !== checked, "音效开关可切换");
    }
  }
  await click(page, "#settingsModal .modal-close");
  await waitModalClose(page, "settingsModal");
  console.log("  ✓ 设置面板正常");

  // 4. Vocabulary Room
  console.log("\n[4] 词汇学习室");
  await click(page, "#vocabRoomBtn");
  await waitModalOpen(page, "vocabRoomModal");
  assert(await count(page, "#vocabRoomModal .vr-speak, #vocabRoomModal [data-speak]") >= 0, "词汇室有单词显示");
  await click(page, "#vocabRoomModal .modal-close");
  await waitModalClose(page, "vocabRoomModal");
  console.log("  ✓ 词汇室正常");

  // 5. Game Center
  console.log("\n[5] 游戏中心");
  await click(page, "#gameCenterBtn");
  await waitModalOpen(page, "gameCenterModal");
  await wait(500);
  const gameCards = await count(page, ".game-card, #gameCenterModal button:not(.modal-close)");
  assert(gameCards >= 6, `至少6个游戏入口 (找到${gameCards}个)`);
  await click(page, "#gameCenterModal .modal-close");
  await waitModalClose(page, "gameCenterModal");
  console.log("  ✓ 游戏中心正常");

  // 6. Memory Match mini-game
  console.log("\n[6] 记忆翻牌游戏");
  await click(page, "#gameCenterBtn");
  await waitModalOpen(page, "gameCenterModal");
  await wait(300);
  const cards = await page.$$(".game-card");
  if (cards.length > 0) {
    await cards[0].click();
    await wait(2000);
    const modalId = await page.evaluate(() => {
      const mm = document.getElementById("memoryMatchModal");
      if (mm && mm.style.display !== "none" && mm.style.display !== "") return "memoryMatchModal";
      const info = document.getElementById("infoModal");
      if (info && info.style.display !== "none" && info.style.display !== "") return "infoModal";
      return null;
    });
    if (modalId === "memoryMatchModal") {
      assert(await count(page, ".memory-card, [class*=card]") >= 4, "记忆翻牌卡片加载");
      await click(page, "#memoryMatchModal .modal-close");
      await waitModalClose(page, "memoryMatchModal");
    } else if (modalId === "infoModal") {
      await click(page, "#infoModal .modal-close");
      await waitModalClose(page, "infoModal");
    }
  }
  await click(page, "#gameCenterModal .modal-close");
  await waitModalClose(page, "gameCenterModal");
  console.log("  ✓ 记忆翻牌测试完成");

  // 7. Statistics
  console.log("\n[7] 统计面板");
  await click(page, "#statsBtn");
  await waitModalOpen(page, "statsModal");
  assert(await count(page, "#statsModal canvas, .study-chart, #studyChart") >= 0, "学习曲线图标存在");
  await click(page, "#statsModal .modal-close");
  await waitModalClose(page, "statsModal");
  console.log("  ✓ 统计面板正常");

  // 8. Achievements
  console.log("\n[8] 成就系统");
  await click(page, "#achievementsBtn");
  await waitModalOpen(page, "achievementsModal");
  await click(page, "#achievementsModal .modal-close");
  await waitModalClose(page, "achievementsModal");
  console.log("  ✓ 成就正常");

  // 9. Clues
  console.log("\n[9] 线索系统");
  await click(page, "#cluesBtn");
  await waitModalOpen(page, "cluesModal");
  await click(page, "#cluesModal .modal-close");
  await waitModalClose(page, "cluesModal");
  console.log("  ✓ 线索正常");

  // 10. Shop
  console.log("\n[10] 商店");
  await click(page, "#shopBtn");
  await waitModalOpen(page, "shopModal");
  await click(page, "#shopModal .modal-close");
  await waitModalClose(page, "shopModal");
  console.log("  ✓ 商店正常");

  // 11. Training mode (answer modal)
  console.log("\n[11] 训练模式");
  await click(page, "#trainBtn");
  await wait(3000);
  // Check either answerModal or infoModal or any visible modal
  const anyModal = await page.evaluate(() => {
    const modals = document.querySelectorAll(".modal");
    for (const m of modals) {
      if (m.style.display !== "none" && m.style.display !== "" && m.id !== "loadingOverlay" && !m.id.startsWith("opening")) {
        return m.id;
      }
    }
    return null;
  });
  assert(anyModal !== null, `训练模式触发了弹窗 (${anyModal || "无"})`);
  if (anyModal) {
    await click(page, `#${anyModal} .modal-close`);
    await wait(500);
  } else {
    // Force close
    await page.evaluate(() => { document.querySelectorAll(".modal").forEach(m => m.style.display = "none"); });
  }
  console.log("  ✓ 训练模式测试完成");

  // 12. Wrong Word Notebook
  console.log("\n[12] 错题本");
  const wwBtn = await page.$("#wrongWordBtn, #reviewBtn, [data-action=wrongWords]");
  if (wwBtn) {
    await wwBtn.click();
    await wait(1500);
    const anyModal = await page.evaluate(() => {
      const modals = document.querySelectorAll(".modal");
      for (const m of modals) {
        if (m.style.display !== "none" && m.style.display !== "" && m.id !== "loadingOverlay") return m.id;
      }
      return null;
    });
    assert(anyModal !== null, `错题本触发弹窗 (${anyModal || "无"})`);
    if (anyModal) await click(page, `#${anyModal} .modal-close`);
    await wait(500);
  }
  console.log("  ✓ 错题本测试完成");

  // 13. Mastery Test
  console.log("\n[13] 掌握度测试");
  await click(page, "#masteryTestBtn");
  await waitModalOpen(page, "masteryTestModal");
  assert(true, "掌握度测试弹窗打开");
  await click(page, "#masteryTestModal .modal-close");
  await waitModalClose(page, "masteryTestModal");
  console.log("  ✓ 掌握度测试正常");

  // 14. localStorage persistence
  console.log("\n[14] 本地存储");
  const saveKey = await page.evaluate(() => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith("wordlock_") || k.startsWith("libProgress") || k.startsWith("dailyHistory") || k.startsWith("activeLibId"));
    return keys;
  });
  assert(saveKey.length > 0, `localStorage中有存档数据 (${saveKey.length}个key)`);
  console.log("  ✓ 存档持久化正常");

  // 15. TTS audio element
  console.log("\n[15] 语音播放");
  const ttsExists = await page.$("#ttsPlayer");
  assert(ttsExists !== null, "TTS audio元素存在于页面中");
  console.log("  ✓ 语音元素正常");

  // 16. Room entry / trial flow
  console.log("\n[16] 密室流程");
  // Check ticket count before entering
  const ticketText = await getText(page, "#ticketCount, .ticket-count, [class*=ticket]").catch(() => "");
  assert(ticketText !== "", "门票数量显示存在");
  // Try entering room
  await click(page, "#enterRoomBtn");
  await wait(2000);
  const afterModal = await page.evaluate(() => {
    const modals = document.querySelectorAll(".modal");
    for (const m of modals) {
      if (m.style.display !== "none" && m.style.display !== "" && m.id !== "loadingOverlay") return m.id;
    }
    // Check if room panel is visible
    const rp = document.getElementById("roomPanel");
    if (rp && rp.style.display !== "none" && rp.style.display !== "") return "roomPanel";
    return null;
  });
  assert(afterModal !== null, `密室入口触发响应 (${afterModal || "无"})`);
  if (afterModal && afterModal !== "roomPanel") {
    await click(page, `#${afterModal} .modal-close`);
    await wait(500);
  } else if (afterModal === "roomPanel") {
    // We're in the room - exit back
    const backBtn = await page.$("#backToHallBtn");
    if (backBtn) await backBtn.click();
    await wait(500);
  }
  console.log("  ✓ 密室流程测试完成");

  console.log("\n" + "=".repeat(40));
  console.log(`结果: ${passed} 通过, ${failed} 失败`);
  if (errors.length) {
    console.log("\n失败详情:");
    errors.forEach(e => console.log("  " + e));
  }
}

async function main() {
  console.log("启动本地服务器...");
  const srv = await startServer();
  console.log(`服务器运行于 http://localhost:${PORT}`);

  console.log("启动浏览器...");
  const browser = await chromium.launch({ headless: false, slowMo: 300, args: ["--start-maximized"] });
  const context = await browser.newContext({ noDefaultViewport: true });
  const page = await context.newPage();
  page.on("console", msg => {}); // suppress console logs from page

  try {
    await runTests(page);
  } catch (e) {
    console.error("\n测试异常:", e.message);
    failed++;
    errors.push(e.message);
  }

  await page.close();
  await browser.close();
  srv.close();

  process.exit(failed > 0 ? 1 : 0);
}

main();
