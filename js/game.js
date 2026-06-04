// ---------- 全局变量 ----------
let tickets = 5;
let currentRoomLevel = 1;
let trainingStreak = 0;
let roomPassed1 = false, roomPassed2 = false, roomPassed3 = false;
let quizMode = "random";
let currentVoiceType = "en-US";   // en-US 美式, en-GB 英式

let allWords = null;
let currentWordList = [];

let inRoom = false;
let roomPassed = false;
let trialActive = false;
let correctAnswers = 0, mistakesLeft = 3;
let currentTrialWordList = [];

let trainingActive = false;
let remainingWords = [];

let timerInterval = null, timeLeft = 30;
let originalTimeLimit = 30; // 修复：缓存原始限时用于加时后的进度条计算

let wrongWords = [];

let dailyChallengeCompleted = false;
let dailyChallengeDate = "";

// ---------- 词库来源管理 ----------
const DICT_API_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en/";
const WORD_LIB_CACHE_KEY = "wordLibCache_v1";
const WORD_LIB_SOURCE_KEY = "wordLibSource_v1";
const WORD_LIB_TIME_KEY = "wordLibCacheTime_v1";
const WORD_LIB_CACHE_LIB_KEY = "wordLibCacheLib_v1";
const WORD_ENRICH_CACHE_KEY = "wordEnrichCache_v1";
let wordSourceUrl = localStorage.getItem(WORD_LIB_SOURCE_KEY) || "";
let wordEnrichCache = JSON.parse(localStorage.getItem(WORD_ENRICH_CACHE_KEY) || "{}");

let achievements = {
    totalCorrect: 0,
    roomsCompleted: 0,
    perfectTrials: 0,
    unlocked100: false,
    unlocked500: false,
    unlocked1000: false
};

let shopItems = {
    hint: { price: 3, count: 0 },
    extraTime: { price: 2, count: 0 },
    revive: { price: 5, count: 0 }
};

let audioCtx = null;
let bgMusic = null;
let soundEnabled = true;
let musicEnabled = true;
let musicPlaying = false;

const GAME_DIFF_KEY = "gameDifficulty_v1";
let gameDifficulty = localStorage.getItem(GAME_DIFF_KEY) || "medium";
function getDifficultyLevels() {
    if (gameDifficulty === "easy") return [1];
    if (gameDifficulty === "hard") return [1, 2, 3];
    return [1, 2]; // medium
}

let modalResolve = null;
let currentQuestionWordObj = null;
let currentDirection = "en2zh";
let currentTotal = 20;
let currentMode = "trial";

// DOM
const ticketSpan = document.getElementById("ticketCount");
const currentLevelDisplay = document.getElementById("currentLevelDisplay");
const enterRoomBtn = document.getElementById("enterRoomBtn");
const trainBtn = document.getElementById("trainBtn");
const reviewBtn = document.getElementById("reviewBtn");
const dailyBtn = document.getElementById("dailyBtn");
const shopBtn = document.getElementById("shopBtn");
const achievementsBtn = document.getElementById("achievementsBtn");
const gameCenterBtn = document.getElementById("gameCenterBtn");
const cluesBtn = document.getElementById("cluesBtn");
const storyBtn = document.getElementById("storyBtn");
const roomPanel = document.getElementById("roomPanel");
const startTrialBtn = document.getElementById("startTrialBtn");
const completeRoomBtn = document.getElementById("completeRoomBtn");
const backToHallBtn = document.getElementById("backToHallBtn");
const roomLevelSpan = document.getElementById("roomLevelSpan");
const correctCountSpan = document.getElementById("correctCount");
const remainingMistakesSpan = document.getElementById("remainingMistakes");
const trialMessageDiv = document.getElementById("trialMessage");

const answerModal = document.getElementById("answerModal");
const answerTitle = document.getElementById("answerTitle");
const modalWordSpan = document.getElementById("modalWord");
const speakerWordBtn = document.getElementById("speakerWordBtn");
const toggleVoiceBtn = document.getElementById("toggleVoiceBtn");
const voiceLabelSpan = document.getElementById("voiceLabel");
const questionHintSpan = document.getElementById("questionHint");
const modalAnswerInput = document.getElementById("modalAnswer");
const modalCurrentNumSpan = document.getElementById("modalCurrentNum");
const modalTotalNumSpan = document.getElementById("modalTotalNum");
const timerSecondsSpan = document.getElementById("timerSeconds");
const timerProgressDiv = document.getElementById("timerProgress");
const modalSubmitBtn = document.getElementById("modalSubmitBtn");
const modalCancelBtn = document.getElementById("modalCancelBtn");
const hintBtn = document.getElementById("hintBtn");
const extraTimeBtn = document.getElementById("extraTimeBtn");

const trainingRemainingSpan = document.createElement("span");
trainingRemainingSpan.id = "trainingRemaining";
trainingRemainingSpan.className = "ticket";
trainingRemainingSpan.style.fontSize = "16px";
trainingRemainingSpan.style.marginLeft = "10px";
document.querySelector(".top-bar").appendChild(trainingRemainingSpan);

// ========== 语音朗读函数 ==========
function speakText(text) {
    if (!text) return;
    try {
        const isZh = currentVoiceType.startsWith("zh");
        const a = document.getElementById("ttsPlayer");
        if (!a) return;
        a.src = "https://dict.youdao.com/dictvoice?audio=" + encodeURIComponent(text) + "&type=" + (isZh ? 1 : 0) + "&_t=" + Date.now();
        a.play().catch(() => {});
    } catch(e) {}
}

// 更新发音切换按钮的显示文字
function updateVoiceButtonUI() {
    if (voiceLabelSpan) {
        voiceLabelSpan.innerText = currentVoiceType === "en-US" ? "美式" : "英式";
    }
    if (toggleVoiceBtn) {
        toggleVoiceBtn.title = currentVoiceType === "en-US" ? "点击切换为英式发音" : "点击切换为美式发音";
    }
}

// 切换发音
function toggleVoice() {
    currentVoiceType = currentVoiceType === "en-US" ? "en-GB" : "en-US";
    updateVoiceButtonUI();
    saveGame();
    // 可选：朗读切换提示
    speakText(currentVoiceType === "en-US" ? "American English" : "British English");
}

// 喇叭按钮事件
if (speakerWordBtn) {
    speakerWordBtn.onclick = (e) => {
        e.stopPropagation();
        if (currentQuestionWordObj && currentQuestionWordObj.word) {
            speakText(currentQuestionWordObj.word);
        } else if (modalWordSpan && modalWordSpan.innerText && modalWordSpan.innerText.trim()) {
            // 修复：之前硬编码 !== "apple" 会让首题抽到 apple 时 TTS 失败
            speakText(modalWordSpan.innerText);
        } else {
            console.warn("没有可朗读的单词");
        }
    };
}
if (toggleVoiceBtn) {
    toggleVoiceBtn.onclick = (e) => {
        e.stopPropagation();
        toggleVoice();
    };
}

// ---------- 辅助函数 ----------
function showInfoMessage(title, msg, isHtml = true) {
    return new Promise(resolve => {
        const infoModal = document.getElementById("infoModal");
        const infoTitle = document.getElementById("infoTitle");
        const infoMessage = document.getElementById("infoMessage");
        const infoConfirm = document.getElementById("infoConfirmBtn");
        infoTitle.innerText = title;
        if (isHtml) infoMessage.innerHTML = msg;
        else infoMessage.innerText = msg;
        infoModal.style.display = "flex";
        const onConfirm = () => {
            infoModal.style.display = "none";
            infoConfirm.removeEventListener("click", onConfirm);
            resolve();
        };
        infoConfirm.addEventListener("click", onConfirm);
    });
}

function showGameEndModal(title, msg, hasRetry = true) {
    return new Promise(resolve => {
        const infoModal = document.getElementById("infoModal");
        const infoTitle = document.getElementById("infoTitle");
        const infoMessage = document.getElementById("infoMessage");
        const infoConfirm = document.getElementById("infoConfirmBtn");
        infoTitle.innerText = title;
        infoMessage.innerHTML = msg;
        let btnRow = infoMessage.querySelector(".game-end-btns");
        if (!btnRow) {
            btnRow = document.createElement("div");
            btnRow.className = "game-end-btns";
            btnRow.style.cssText = "display:flex;gap:10px;justify-content:center;margin-top:16px;flex-wrap:wrap;";
            infoMessage.appendChild(btnRow);
        } else {
            btnRow.innerHTML = "";
        }
        if (hasRetry) {
            const retryBtn = document.createElement("button");
            retryBtn.innerText = "🔄 再来一局";
            retryBtn.style.cssText = "background:var(--accent,#27ae60);color:#fff;border:none;padding:10px 24px;border-radius:25px;font-size:16px;cursor:pointer;";
            btnRow.appendChild(retryBtn);
            retryBtn.onclick = () => { infoModal.style.display = "none"; resolve("retry"); };
        }
        const closeBtn = document.createElement("button");
        closeBtn.innerText = "🚪 返回";
        closeBtn.style.cssText = "background:var(--bg-mid,#555);color:#fff;border:none;padding:10px 24px;border-radius:25px;font-size:16px;cursor:pointer;";
        btnRow.appendChild(closeBtn);
        closeBtn.onclick = () => { infoModal.style.display = "none"; resolve("close"); };
        infoModal.style.display = "flex";
        infoConfirm.style.display = "none";
        const restoreConfirm = () => { infoConfirm.style.display = ""; };
        infoModal.addEventListener("transitionend", restoreConfirm, { once: true });
        setTimeout(restoreConfirm, 1000);
    });
}

function updateTicketUI() { ticketSpan.innerText = tickets; saveGame(); }
function updateTrainingRemainingUI() {
    if (trainingActive && remainingWords.length) {
        trainingRemainingSpan.innerText = `📝 本轮剩余: ${remainingWords.length} 词`;
    } else if (trainingActive && remainingWords.length === 0) {
        trainingRemainingSpan.innerText = `🎉 本轮完成！即将重置`;
    } else {
        trainingRemainingSpan.innerText = `🏆 累计正确: ${trainingStreak}`;
    }
}
function updateTrialUI() { correctCountSpan.innerText = correctAnswers; remainingMistakesSpan.innerText = mistakesLeft; }
function shuffleArray(arr) { for (let i=arr.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }
function getRandomDistinctWords(count) {
    if (currentWordList.length < count) return null;
    return shuffleArray([...currentWordList]).slice(0, count);
}

// 同义词映射（保持原有）
const synonymMap = {
    "快乐":["高兴","愉快","欢乐"],"高兴":["快乐","愉快","欢乐"],"美丽":["漂亮","好看","秀丽"],"漂亮":["美丽","好看","秀丽"],
    "快速":["飞快","迅速","急速"],"迅速":["快速","飞快","急速"],"悲伤":["难过","伤心","悲痛"],"难过":["悲伤","伤心","悲痛"],
    "理解":["明白","懂得","了解"],"明白":["理解","懂得","了解"],"重要":["关键","主要","重大"],"关键":["重要","主要","重大"],
    "不同":["差异","区别","相异"],"经验":["阅历","经历"],"决定":["决心","抉择"],"挑战":["考验","难题"],"实现":["达成","完成"],
    "相信":["信任","确信"],"考虑":["思考","斟酌"],"发展":["进步","成长"],"环境":["周围","生态"],"政府":["当局","内阁"],
    "健康":["强健","良好"],"增加":["增长","提高"],"知识":["学识","学问"],"管理":["治理","管控"],"自然":["天然","当然"],
    "提供":["供应","给予"],"产生":["生成","发生"],"假设":["假定","猜想"],"阐明":["解释","说明"],"证明":["证实","佐证"],
    "修改":["改动","调整"],"忽视":["忽略","无视"],"获得":["得到","取得"],"参加":["参与","加入"],"数量":["数目","总量"],
    "研究":["钻研","探讨"],"独特":["特别","与众不同"],"有效":["管用","灵验"]
};
function isMeaningSimilar(user, correct) {
    if (!user) return false;
    let u = user.trim().toLowerCase(), c = correct.trim().toLowerCase();
    if (u === c) return true;
    if (u.includes(c) || c.includes(u)) return true;
    for (let [key, syns] of Object.entries(synonymMap)) {
        if (key === c || syns.includes(c)) if (u === key || syns.includes(u)) return true;
        if (key === u || syns.includes(u)) if (c === key || syns.includes(c)) return true;
    }
    return false;
}

// ---------- 音效 ----------
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (!bgMusic) {
        bgMusic = new Audio('https://ssl.gstatic.com/trends/music/trends_song_1.mp3');
        bgMusic.loop = true;
        bgMusic.volume = 0.3;
    }
}
function playBeep(type) {
    if (!soundEnabled) return;
    if (!audioCtx) initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume().then(() => actuallyPlayBeep(type));
    else actuallyPlayBeep(type);
}
function actuallyPlayBeep(type) {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    if (type === 'correct') {
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
        osc.start();
        osc.stop(now + 0.5);
    } else if (type === 'click') {
        osc.frequency.value = 660;
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
        osc.start();
        osc.stop(now + 0.1);
    } else {
        osc.frequency.value = 440;
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
        osc.start();
        osc.stop(now + 0.5);
    }
}
function startBackgroundMusic() {
    if (!musicEnabled) return;
    if (!bgMusic) initAudio();
    bgMusic.play().catch(e => console.log("自动播放被阻止"));
    musicPlaying = true;
}
function stopBackgroundMusic() {
    if (bgMusic) { bgMusic.pause(); bgMusic.currentTime = 0; }
    musicPlaying = false;
}
function setMusicEnabled(enabled) {
    musicEnabled = enabled;
    if (enabled && !musicPlaying) startBackgroundMusic();
    else if (!enabled && musicPlaying) stopBackgroundMusic();
}
function setMusicVolume(volume) {
    if (bgMusic) bgMusic.volume = volume;
}
function onUserInteraction() {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    if (musicEnabled && bgMusic && bgMusic.paused) bgMusic.play().catch(e=>console.log);
}
document.body.addEventListener('click', onUserInteraction, { once: true });

// ---------- 进度保存/加载 ----------
function saveGame() {
    const save = {
        tickets, currentRoomLevel, trainingStreak,
        roomPassed1, roomPassed2, roomPassed3,
        soundEnabled, musicEnabled, quizMode, currentVoiceType,
        wrongWords, achievements, dailyChallengeCompleted, dailyChallengeDate,
        shopItems
    };
    localStorage.setItem("wordlock_save", JSON.stringify(save));
}
function loadGame() {
    const data = localStorage.getItem("wordlock_save");
    if (data) {
        try {
            const save = JSON.parse(data);
            tickets = save.tickets ?? 5;
            currentRoomLevel = save.currentRoomLevel ?? 1;
            trainingStreak = save.trainingStreak ?? 0;
            roomPassed1 = save.roomPassed1 ?? false;
            roomPassed2 = save.roomPassed2 ?? false;
            roomPassed3 = save.roomPassed3 ?? false;
            soundEnabled = save.soundEnabled ?? true;
            musicEnabled = save.musicEnabled ?? true;
            quizMode = save.quizMode ?? "random";
            currentVoiceType = save.currentVoiceType ?? "en-US";
            wrongWords = save.wrongWords ?? [];
            achievements = save.achievements ?? { totalCorrect:0, roomsCompleted:0, perfectTrials:0, unlocked100:false, unlocked500:false, unlocked1000:false };
            dailyChallengeCompleted = save.dailyChallengeCompleted ?? false;
            dailyChallengeDate = save.dailyChallengeDate ?? "";
            shopItems = save.shopItems ?? { hint:{price:3,count:0}, extraTime:{price:2,count:0}, revive:{price:5,count:0} };
            document.getElementById("quizModeSelect").value = quizMode;
            updateSoundToggleUI();
            updateMusicToggleUI();
            setMusicEnabled(musicEnabled);
            updateShopUI();
            updateAchievementsUI();
            updateVoiceButtonUI();
        } catch(e) {}
    }
    updateTicketUI();
    if (allWords) switchWordLevel(currentRoomLevel);
    updateTrainingRemainingUI();
}
function resetProgress() {
    tickets = 5;
    currentRoomLevel = 1;
    trainingStreak = 0;
    roomPassed1 = roomPassed2 = roomPassed3 = false;
    wrongWords = [];
    achievements = { totalCorrect:0, totalAttempts:0, roomsCompleted:0, perfectTrials:0, unlocked100:false, unlocked500:false, unlocked1000:false };
    dailyChallengeCompleted = false;
    dailyChallengeDate = "";
    shopItems = { hint:{price:3,count:0}, extraTime:{price:2,count:0}, revive:{price:5,count:0} };
    // 清除密室主题相关数据
    localStorage.removeItem(CLUES_KEY);
    localStorage.removeItem(ENDING_KEY);
    localStorage.removeItem("dailyHistory_v1");
    wordEnrichCache = {};
    localStorage.removeItem(WORD_ENRICH_CACHE_KEY);
    applyTheme(1);
    if (inRoom) backToHallBtn.click();
    switchWordLevel(1);
    updateTicketUI();
    updateTrainingRemainingUI();
    updateShopUI();
    updateAchievementsUI();
    refreshMainMenuStats();
    saveGame();
    showInfoMessage("重置成功", "游戏进度、线索、结局、统计已全部重置。");
}

function switchWordLevel(level) {
    if (allWords && allWords[level]) {
        currentWordList = allWords[level];
        currentLevelDisplay.innerText = `Lv.${level}`;
        if (inRoom && currentWordList.length < 20) {
            startTrialBtn.disabled = true;
            trialMessageDiv.innerText = "⚠️词库不足20词，无法试炼";
        } else if (inRoom) {
            startTrialBtn.disabled = false;
            trialMessageDiv.innerText = "";
        }
        saveGame();
    }
}

// ============================================================
// 📚 词库管理系统（多词库切换 + 进度跟踪）
// ============================================================
const ACTIVE_LIB_KEY = "activeLibId_v1";
const LIB_PROGRESS_KEY = "libProgress_v1";
let availableLibraries = [];   // 从 libraries.json 加载
let activeLibraryId = localStorage.getItem(ACTIVE_LIB_KEY) || "cet4";

function getLibProgress(libId) {
    try {
        const all = JSON.parse(localStorage.getItem(LIB_PROGRESS_KEY)) || {};
        return all[libId] || { mastered: {}, attempts: 0, bestScore: 0 };
    } catch (e) {
        return { mastered: {}, attempts: 0, bestScore: 0 };
    }
}
function setLibProgress(libId, progress) {
    try {
        const all = JSON.parse(localStorage.getItem(LIB_PROGRESS_KEY)) || {};
        all[libId] = progress;
        localStorage.setItem(LIB_PROGRESS_KEY, JSON.stringify(all));
    } catch (e) { /* ignore */ }
}
function markWordMastered(libId, word) {
    const p = getLibProgress(libId);
    p.mastered[word.toLowerCase()] = { at: Date.now(), tries: (p.mastered[word.toLowerCase()]?.tries || 0) + 1 };
    p.attempts++;
    setLibProgress(libId, p);
}
function unmarkWordMastered(libId, word) {
    const p = getLibProgress(libId);
    delete p.mastered[word.toLowerCase()];
    setLibProgress(libId, p);
}
function getMasteryStats(libId, currentAllWords) {
    if (!currentAllWords) return { total: 0, mastered: 0, percent: 0 };
    const allWordSet = new Set();
    for (const lv of [1, 2, 3]) {
        for (const w of (currentAllWords[lv] || [])) {
            allWordSet.add(w.word.toLowerCase());
        }
    }
    const p = getLibProgress(libId);
    const masteredSet = new Set(Object.keys(p.mastered));
    const mastered = [...allWordSet].filter(w => masteredSet.has(w)).length;
    return {
        total: allWordSet.size,
        mastered,
        percent: allWordSet.size > 0 ? Math.round((mastered / allWordSet.size) * 100) : 0
    };
}

function setLoadingLibName(name) {
    const el = document.getElementById("loadingLibName");
    if (el) el.innerText = name || "";
}
function hideLoading() {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.style.display = "none";
}
function showLoadingError(msg) {
    const overlay = document.getElementById("loadingOverlay");
    if (!overlay) return;
    overlay.innerHTML = `<div style="color:#e74c3c;font-size:20px;margin-bottom:12px;">⚠️</div><div>${msg}</div><button onclick="location.reload()" style="margin-top:16px;padding:8px 24px;border-radius:20px;background:var(--primary);color:#fff;border:none;cursor:pointer;">重新加载</button>`;
}

async function loadLibrariesIndex() {
    try {
        const resp = await fetch("data/libraries.json");
        const data = await resp.json();
        availableLibraries = data.libraries || [];
        return availableLibraries;
    } catch (e) {
        console.warn("libraries.json 加载失败，使用默认", e);
        availableLibraries = [{
            id: "default", name: "默认词库", nameFull: "默认", icon: "📚",
            color: "#3498db", desc: "内置默认词库", wordCount: 0, level: 1, file: "words.json", builtIn: true
        }];
        return availableLibraries;
    }
}

async function loadWordLibraryById(libId) {
    const lib = availableLibraries.find(l => l.id === libId);
    if (!lib) {
        console.warn("未找到词库:", libId);
        return null;
    }
    // 自定义库：使用 URL 缓存
    if (libId === "custom") {
        if (!wordSourceUrl) return null;
        return await fetchWordLibraryFromUrl(wordSourceUrl);
    }
    // 内置库：尝试本地文件，失败回退到 words.json
    try {
        const resp = await fetch(lib.file);
        return await resp.json();
    } catch (e) {
        console.warn(`词库 ${lib.file} 加载失败:`, e);
        // 回退到 words.json
        const resp = await fetch("data/words.json");
        return await resp.json();
    }
}

async function switchActiveLibrary(libId) {
    const lib = availableLibraries.find(l => l.id === libId);
    if (!lib) return false;
    const data = await loadWordLibraryById(libId);
    if (!data || !validateWordLibrary(data)) {
        showInfoMessage("❌ 切换失败", `词库 ${lib.name} 数据格式不正确`);
        return false;
    }
    allWords = data;
    currentWordList = allWords[1];
    activeLibraryId = libId;
    localStorage.setItem(ACTIVE_LIB_KEY, libId);
    saveWordCache(data, libId === "custom" ? wordSourceUrl : lib.file);
    switchWordLevel(currentRoomLevel);
    updateWordSourceUI();
    renderLibraryPicker();  // 刷新高亮
    resetDailyPool();       // 重置每日词池
    console.log("已切换词库:", libId, lib.name);
    return true;
}

function renderLibraryPicker() {
    const container = document.getElementById("libPickerContainer");
    if (!container) return;
    container.innerHTML = "";
    if (!availableLibraries.length) {
        container.innerHTML = '<div style="color:#aaa; font-size:13px;">词库索引加载中...</div>';
        return;
    }
    availableLibraries.forEach(lib => {
        const stats = getMasteryStats(lib.id, allWords && activeLibraryId === lib.id ? allWords : null);
        const card = document.createElement("div");
        card.className = "lib-pick-card" + (activeLibraryId === lib.id ? " active" : "");
        card.style.borderColor = activeLibraryId === lib.id ? lib.color : "rgba(255,255,255,0.15)";
        const progressPct = stats.percent;
        card.innerHTML = `
            <div class="lib-icon">${lib.icon}</div>
            <div class="lib-name">${escapeHtml(lib.name)}</div>
            <div class="lib-desc">${escapeHtml(lib.nameFull)}</div>
            <div class="lib-progress">
                <div class="lib-progress-fill" style="width:${progressPct}%"></div>
            </div>
            <div class="lib-stat">${activeLibraryId === lib.id ? `${stats.mastered}/${stats.total} 已掌握 (${progressPct}%)` : "未激活"}</div>
        `;
        card.title = lib.desc;
        card.onclick = async () => {
            if (activeLibraryId === lib.id) return;
            if (lib.id === "custom") {
                showInfoMessage("🔧 自定义词库", "请在下方输入词库 URL，然后点击「立即更新」按钮。");
                return;
            }
            const ok = await switchActiveLibrary(lib.id);
            if (ok) {
                showInfoMessage("✅ 已切换", `当前词库：${lib.icon} ${lib.nameFull}\n共 ${stats.total} 词，${stats.mastered} 已掌握`);
            }
        };
        container.appendChild(card);
    });
}

async function loadWordLibrary() {
    // 0. 先加载词库索引
    await loadLibrariesIndex();

    // 1. 优先使用本地缓存（仅当缓存的 libId 与当前激活一致时）
    const cached = localStorage.getItem(WORD_LIB_CACHE_KEY);
    const cachedLibId = localStorage.getItem(WORD_LIB_CACHE_LIB_KEY) || "";
    if (cached && cachedLibId === activeLibraryId) {
        try {
            const data = JSON.parse(cached);
            if (validateWordLibrary(data)) {
                allWords = data;
                currentWordList = allWords[1];
                hideLoading();
                loadGame();
                console.log("已使用本地缓存词库");
                renderLibraryPicker();
                return;
            }
        } catch (e) { /* 缓存损坏，继续 */ }
    }

    // 2. 尝试加载激活的词库
    const lib = availableLibraries.find(l => l.id === activeLibraryId);
    if (lib) setLoadingLibName(`${lib.icon} ${lib.name} - ${lib.nameFull}`);
    const data = await loadWordLibraryById(activeLibraryId);
    if (data && validateWordLibrary(data)) {
        allWords = data;
        currentWordList = allWords[1];
        const cacheKey = (lib && lib.id === "custom") ? wordSourceUrl : (lib ? lib.file : "");
        saveWordCache(data, cacheKey);
        hideLoading();
        loadGame();
        renderLibraryPicker();
        console.log("已加载激活词库:", activeLibraryId, lib ? lib.name : "");
        return;
    }

    // 3. 回退到默认词库 (cet4)
    setLoadingLibName("📖 CET-4 大学英语四级");
    try {
        const response = await fetch("data/cet4.json");
        const fallback = await response.json();
        allWords = fallback;
        currentWordList = allWords[1];
        activeLibraryId = "cet4";
        localStorage.setItem(ACTIVE_LIB_KEY, "cet4");
        saveWordCache(fallback, "cet4.json");
        hideLoading();
        loadGame();
        renderLibraryPicker();
        console.log("已使用默认词库 cet4.json");
    } catch (error) {
        console.error("默认词库加载失败", error);
        showLoadingError("词库加载失败，请检查网络或使用本地服务器。");
    }
}

function validateWordLibrary(data) {
    if (!data || typeof data !== "object") return false;
    for (let k of ["1", "2", "3"]) {
        if (!Array.isArray(data[k])) return false;
    }
    return true;
}

function saveWordCache(data, sourceUrl) {
    try {
        localStorage.setItem(WORD_LIB_CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(WORD_LIB_SOURCE_KEY, sourceUrl || "");
        localStorage.setItem(WORD_LIB_TIME_KEY, String(Date.now()));
        localStorage.setItem(WORD_LIB_CACHE_LIB_KEY, activeLibraryId);
    } catch (e) {
        console.warn("词库缓存保存失败:", e);
    }
}

async function fetchWordLibraryFromUrl(url) {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    return await response.json();
}

function getWordSourceInfo() {
    const hasCache = !!localStorage.getItem(WORD_LIB_CACHE_KEY);
    const source = localStorage.getItem(WORD_LIB_SOURCE_KEY) || "";
    const time = parseInt(localStorage.getItem(WORD_LIB_TIME_KEY) || "0");
    let counts = { 1: 0, 2: 0, 3: 0 };
    if (allWords) {
        counts[1] = (allWords[1] || []).length;
        counts[2] = (allWords[2] || []).length;
        counts[3] = (allWords[3] || []).length;
    }
    let sourceLabel = "本地 (words.json)";
    if (source) sourceLabel = "在线 (" + source.split("/").slice(-2).join("/") + ")";
    else if (hasCache) sourceLabel = "本地缓存";
    let timeStr = "从未";
    if (time) {
        const d = new Date(time);
        timeStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
    }
    return {
        source: sourceLabel,
        hasCache,
        time: timeStr,
        counts,
        rawSource: source
    };
}

function updateWordSourceUI() {
    const info = getWordSourceInfo();
    const infoDiv = document.getElementById("wordSourceInfo");
    if (!infoDiv) return;
    const lib = availableLibraries.find(l => l.id === activeLibraryId);
    const libLabel = lib ? `${lib.icon} ${lib.name} - ${lib.nameFull}` : info.source;
    const stats = getMasteryStats(activeLibraryId, allWords);
    infoDiv.innerHTML =
        `📍 <b>当前词库：</b>${libLabel}<br>` +
        `🕒 <b>更新时间：</b>${info.time}<br>` +
        `📊 <b>词数：</b>Lv.1=${info.counts[1]} | Lv.2=${info.counts[2]} | Lv.3=${info.counts[3]} (共 ${stats.total})<br>` +
        `🏆 <b>已掌握：</b>${stats.mastered} 词 (${stats.percent}%)`;
    const input = document.getElementById("wordSourceUrlInput");
    if (input && info.rawSource) input.value = info.rawSource;
}

// ====== 立即更新词库 ======
async function handleUpdateWordLibrary() {
    const input = document.getElementById("wordSourceUrlInput");
    const url = (input.value || "").trim();
    const progress = document.getElementById("wordLibProgress");
    if (!url) {
        if (progress) progress.innerText = "⚠️ 请先输入远程词库 URL";
        return;
    }
    if (progress) progress.innerText = "⏳ 正在从远程拉取词库...";
    try {
        const data = await fetchWordLibraryFromUrl(url);
        if (!validateWordLibrary(data)) {
            throw new Error("JSON 结构不合法（需包含 1/2/3 三个数组键）");
        }
        allWords = data;
        currentWordList = allWords[1];
        wordSourceUrl = url;
        localStorage.setItem(WORD_LIB_SOURCE_KEY, url);
        saveWordCache(data, url);
        switchWordLevel(currentRoomLevel);
        updateWordSourceUI();
        if (progress) progress.innerText = `✅ 更新成功！Lv.1=${data[1].length} Lv.2=${data[2].length} Lv.3=${data[3].length}`;
        await showInfoMessage("✅ 词库已更新", `已加载远程词库，共 ${data[1].length+data[2].length+data[3].length} 个单词。`);
    } catch (e) {
        console.error(e);
        if (progress) progress.innerText = "❌ 更新失败：" + e.message;
    }
}

// ====== 联网补全释义（Free Dictionary API）======
async function handleEnrichWordLibrary() {
    const progress = document.getElementById("wordLibProgress");
    if (!allWords) { if (progress) progress.innerText = "❌ 词库未加载"; return; }
    const allWordList = [...(allWords[1]||[]), ...(allWords[2]||[]), ...(allWords[3]||[])];
    if (!confirm(`即将调用 Free Dictionary API 联网补全 ${allWordList.length} 个单词的释义，可能需要数分钟。继续？`)) return;

    let success = 0, failed = 0, skipped = 0;
    if (progress) progress.innerText = `⏳ 开始补全 0/${allWordList.length}...`;

    for (let i = 0; i < allWordList.length; i++) {
        const w = allWordList[i];
        const key = w.word.toLowerCase();
        if (wordEnrichCache[key]) { skipped++; continue; }
        if (progress) progress.innerText = `⏳ 补全中 ${i+1}/${allWordList.length}（${w.word}）...`;
        try {
            const enriched = await fetchWordDefinition(w.word);
            if (enriched) {
                wordEnrichCache[key] = enriched;
                Object.assign(w, enriched);
                success++;
            } else {
                failed++;
            }
        } catch (e) {
            failed++;
        }
        localStorage.setItem(WORD_ENRICH_CACHE_KEY, JSON.stringify(wordEnrichCache));
        // 礼貌限流：每个请求间隔 120ms
        await new Promise(r => setTimeout(r, 120));
    }
    saveWordCache(allWords, wordSourceUrl);
    updateWordSourceUI();
    if (progress) progress.innerText = `✅ 补全完成：成功 ${success} 失败 ${failed} 跳过(已缓存) ${skipped}`;
    await showInfoMessage("🌐 联网补全完成", `成功 ${success} 个，失败 ${failed} 个，跳过 ${skipped} 个。已写入本地缓存。`);
}

async function fetchWordDefinition(word) {
    try {
        const resp = await fetch(DICT_API_BASE + encodeURIComponent(word));
        if (!resp.ok) return null;
        const arr = await resp.json();
        if (!Array.isArray(arr) || !arr.length) return null;
        const entry = arr[0];
        const result = { phonetic: entry.phonetic || "" };
        const meanings = entry.meanings || [];
        if (!meanings.length) return null;
        const m = meanings[0];
        result.pos = m.partOfSpeech || "";
        const defs = m.definitions || [];
        if (defs.length) {
            result.fullMeaning = defs[0].definition || "";
            result.meaning = result.fullMeaning.split(/[;,；，]/)[0].trim();
            for (let d of defs) {
                if (d.example) {
                    result.example = d.example;
                    result.example_zh = "";
                    break;
                }
            }
        }
        const syns = new Set();
        meanings.forEach(mm => (mm.synonyms || []).forEach(s => syns.add(s)));
        if (syns.size) result.phrases = Array.from(syns).slice(0, 6).map(s => ({ en: s, zh: "" }));
        return result;
    } catch (e) {
        return null;
    }
}

// ====== 恢复本地词库 ======
function handleResetWordLibrary() {
    if (!confirm("确定要清除在线缓存并恢复为本地 words.json 吗？")) return;
    localStorage.removeItem(WORD_LIB_CACHE_KEY);
    localStorage.removeItem(WORD_LIB_SOURCE_KEY);
    localStorage.removeItem(WORD_LIB_TIME_KEY);
    localStorage.removeItem(WORD_LIB_CACHE_LIB_KEY);
    localStorage.removeItem(WORD_ENRICH_CACHE_KEY);
    wordEnrichCache = {};
    wordSourceUrl = "";
    location.reload();
}

// ====== 随机背景轮播图 ======
function initBackgroundSlider() {
    const slider = document.getElementById("bgSlider");
    if (!slider) return;
    const SLIDE_COUNT = 8;
    const usedIds = new Set();
    while (usedIds.size < SLIDE_COUNT) {
        usedIds.add(Math.floor(Math.random() * 1000) + 1);
    }
    const ids = Array.from(usedIds);
    slider.innerHTML = "";
    ids.forEach((id, idx) => {
        const div = document.createElement("div");
        div.className = "slide" + (idx === 0 ? " active" : "");
        // picsum.photos 支持 random/id 形式，加 ?rand= 避免浏览器缓存
        div.style.backgroundImage = `url('https://picsum.photos/id/${id}/1920/1080?rand=${Date.now()}_${id}')`;
        slider.appendChild(div);
    });
    startBackgroundRotation();
}

function startBackgroundRotation() {
    const slides = document.querySelectorAll("#bgSlider .slide");
    if (slides.length <= 1) return;
    let idx = 0;
    setInterval(() => {
        slides[idx].classList.remove("active");
        idx = (idx + 1) % slides.length;
        slides[idx].classList.add("active");
    }, 5000);
}

// 错题本记录（带 SRS 字段）
function recordWrongWord(wordObj, level) {
    const existing = wrongWords.find(w => w.word === wordObj.word);
    if (existing) {
        existing.times++;
        existing.lastWrong = Date.now();
        // SRS：答错后 1 分钟后再出
        existing.interval = 1; // 分钟
        existing.ease = Math.max(1.3, (existing.ease || 2.5) - 0.2);
        existing.nextReview = Date.now() + 60 * 1000;
        existing.streak = 0;
    } else {
        wrongWords.push({
            word: wordObj.word,
            meaning: wordObj.meaning,
            pos: wordObj.pos,
            fullMeaning: wordObj.fullMeaning,
            level: level,
            times: 1,
            correctStreak: 0,
            lastWrong: Date.now(),
            nextReview: Date.now(), // 立即可复习
            interval: 0,           // 当前间隔（分钟）
            ease: 2.5,             // 难度系数
            streak: 0              // 连续答对次数
        });
    }
    if (wrongWords.length > 200) wrongWords.shift();
    saveGame();
}

// 答对错题时更新 SRS（SM-2 简化版）
function markWordRemembered(word) {
    const w = wrongWords.find(x => x.word === word);
    if (!w) return;
    w.streak = (w.streak || 0) + 1;
    w.correctStreak = (w.correctStreak || 0) + 1;
    w.ease = Math.min(2.8, (w.ease || 2.5) + 0.1);
    if (w.streak === 1)      w.interval = 1;     // 1 分钟后再出
    else if (w.streak === 2) w.interval = 10;    // 10 分钟
    else                     w.interval = Math.round((w.interval || 1) * (w.ease || 2.5));
    w.nextReview = Date.now() + w.interval * 60 * 1000;
    // 连续 5 次答对 → 移出错题本（已掌握）
    if (w.streak >= 5) {
        wrongWords = wrongWords.filter(x => x.word !== w.word);
    }
    saveGame();
}

// 获取"到期需复习"的错题
function getDueWords(limit = 10) {
    const now = Date.now();
    return wrongWords
        .filter(w => (w.nextReview || 0) <= now)
        .sort((a, b) => (a.nextReview || 0) - (b.nextReview || 0))
        .slice(0, limit);
}

// 成就更新
// 每日活动记录
const DAILY_HISTORY_KEY = "dailyHistory_v1";
function recordDailyActivity(correct, total) {
    let hist = {};
    try { hist = JSON.parse(localStorage.getItem(DAILY_HISTORY_KEY)) || {}; } catch (e) { hist = {}; }
    const today = new Date().toISOString().slice(0, 10);
    if (!hist[today]) hist[today] = { correct: 0, attempts: 0 };
    hist[today].correct += correct;
    hist[today].attempts += total;
    // 只保留最近 30 天
    const keys = Object.keys(hist).sort();
    while (keys.length > 30) {
        delete hist[keys.shift()];
    }
    try { localStorage.setItem(DAILY_HISTORY_KEY, JSON.stringify(hist)); } catch (e) {}
}

function updateAchievementsOnCorrect() {
    achievements.totalCorrect = (achievements.totalCorrect || 0) + 1;
    achievements.totalAttempts = (achievements.totalAttempts || 0) + 1;
    // 记录每日活动
    recordDailyActivity(1, 1);
    if (achievements.totalCorrect >= 100 && !achievements.unlocked100) {
        achievements.unlocked100 = true;
        tickets += 10;
        showInfoMessage("🏆 成就解锁", "累计正确100词！获得10门票！");
        fireConfetti(20);
        updateTicketUI();
    }
    if (achievements.totalCorrect >= 500 && !achievements.unlocked500) {
        achievements.unlocked500 = true;
        tickets += 30;
        showInfoMessage("🏆 成就解锁", "累计正确500词！获得30门票！");
        fireConfetti(30);
        updateTicketUI();
    }
    if (achievements.totalCorrect >= 1000 && !achievements.unlocked1000) {
        achievements.unlocked1000 = true;
        tickets += 100;
        showInfoMessage("🏆 成就解锁", "累计正确1000词！获得100门票！");
        fireConfetti(60);
        updateTicketUI();
    }
    saveGame();
}

function recordWrongAttempt() {
    achievements.totalAttempts = (achievements.totalAttempts || 0) + 1;
    recordDailyActivity(0, 1);
    saveGame();
}

function updateAchievementsUI() {
    const listDiv = document.getElementById("achievementsList");
    if (!listDiv) return;
    listDiv.innerHTML = `
        <div>📊 累计正确单词: ${achievements.totalCorrect}</div>
        <div>🏆 通关密室数: ${achievements.roomsCompleted}/3</div>
        <div>⭐ 完美试炼次数: ${achievements.perfectTrials}</div>
        ${achievements.unlocked100 ? '<div class="achievement-badge">✅ 百词斩</div>' : '<div class="achievement-badge" style="background:gray;">🔒 百词斩 (累计100正确)</div>'}
        ${achievements.unlocked500 ? '<div class="achievement-badge">✅ 五百词豪</div>' : '<div class="achievement-badge" style="background:gray;">🔒 五百词豪 (累计500正确)</div>'}
        ${achievements.unlocked1000 ? '<div class="achievement-badge">✅ 千词大神</div>' : '<div class="achievement-badge" style="background:gray;">🔒 千词大神 (累计1000正确)</div>'}
    `;
}

// 商店
function updateShopUI() {
    document.getElementById("hintCount").innerText = shopItems.hint.count;
    document.getElementById("extraTimeCount").innerText = shopItems.extraTime.count;
    document.getElementById("reviveCount").innerText = shopItems.revive.count;
}
function buyItem(itemKey) {
    const item = shopItems[itemKey];
    if (tickets >= item.price) {
        tickets -= item.price;
        item.count++;
        updateTicketUI();
        updateShopUI();
        saveGame();
        showInfoMessage("购买成功", `你购买了 ${itemKey} 道具，剩余门票: ${tickets}`);
    } else {
        showInfoMessage("门票不足", `需要 ${item.price} 张门票，当前只有 ${tickets} 张。`);
    }
}
function useHint() {
    if (shopItems.hint.count > 0) {
        shopItems.hint.count--;
        updateShopUI();
        saveGame();
        let hint = "";
        if (currentDirection === "en2zh") {
            hint = currentQuestionWordObj.word[0] + "***";
        } else {
            hint = currentQuestionWordObj.meaning[0] + "***";
        }
        showInfoMessage("提示", `提示：${hint}`);
    } else {
        showInfoMessage("道具不足", "没有提示道具，请前往商店购买。");
    }
}
function useExtraTime() {
    if (shopItems.extraTime.count > 0) {
        shopItems.extraTime.count--;
        updateShopUI();
        saveGame();
        if (timerInterval) {
            timeLeft += 15;
            timerSecondsSpan.innerText = timeLeft;
            // 修复：基于原始限时计算进度条宽度
            if (originalTimeLimit > 0) {
                const pct = Math.min(100, (timeLeft / originalTimeLimit) * 100);
                timerProgressDiv.style.width = pct + "%";
            }
        }
        showInfoMessage("加时", "答题时间增加15秒！");
    } else {
        showInfoMessage("道具不足", "没有加时道具，请前往商店购买。");
    }
}
function useRevive() {
    if (shopItems.revive.count > 0 && currentMode === "trial" && mistakesLeft === 0) {
        shopItems.revive.count--;
        updateShopUI();
        saveGame();
        mistakesLeft = 3;
        updateTrialUI();
        showInfoMessage("复活", "错误次数已重置为3次，继续挑战！");
    } else if (currentMode !== "trial") {
        showInfoMessage("无法使用", "复活道具仅限试炼模式。");
    } else if (mistakesLeft > 0) {
        showInfoMessage("无需复活", "你还有剩余错误次数，无需使用。");
    } else {
        showInfoMessage("道具不足", "没有复活道具，请前往商店购买。");
    }
}

// 模态框倒计时
function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }
function startTimer(seconds, onTimeout) {
    stopTimer();
    timeLeft = seconds;
    originalTimeLimit = seconds; // 修复：缓存原始限时供加时计算
    timerSecondsSpan.innerText = timeLeft;
    timerProgressDiv.style.width = "100%";
    timerInterval = setInterval(() => {
        if (timeLeft <= 1) {
            clearInterval(timerInterval);
            timerInterval = null;
            onTimeout();
        } else {
            timeLeft--;
            timerSecondsSpan.innerText = timeLeft;
            timerProgressDiv.style.width = (timeLeft / seconds * 100) + "%";
        }
    }, 1000);
}
function closeAnswerModal() { stopTimer(); answerModal.style.display = "none"; }
function getRandomDirection() {
    if (quizMode === "en2zh") return "en2zh";
    if (quizMode === "zh2en") return "zh2en";
    return Math.random() < 0.5 ? "en2zh" : "zh2en";
}
function showAnswerModal(options) {
    return new Promise((resolve) => {
        currentMode = options.mode;
        currentDirection = options.direction;
        answerTitle.innerText = options.title;
        if (options.direction === "en2zh") {
            modalWordSpan.innerText = options.wordObj.word;
            questionHintSpan.innerText = "📖 请写出中文意思";
            modalAnswerInput.placeholder = "输入中文意思";
        } else {
            modalWordSpan.innerText = options.wordObj.meaning;
            questionHintSpan.innerText = "✍️ 请写出对应的英文单词";
            modalAnswerInput.placeholder = "输入英文单词";
        }
        currentQuestionWordObj = options.wordObj;
        modalAnswerInput.value = "";
        modalCurrentNumSpan.innerText = options.currentNum;
        modalTotalNumSpan.innerText = options.total;
        currentTotal = options.total;
        timerSecondsSpan.innerText = options.timeLimit;
        answerModal.style.display = "flex";
        modalAnswerInput.focus();
        modalResolve = resolve;
        startTimer(options.timeLimit, () => {
            if (modalResolve) {
                closeAnswerModal();
                modalResolve({ isTimeout: true });
                modalResolve = null;
            }
        });
    });
}
function onAnswerSubmit() {
    if (!modalResolve) return;
    const answer = modalAnswerInput.value.trim().toLowerCase();
    let isCorrect = false;
    if (currentDirection === "en2zh") {
        isCorrect = isMeaningSimilar(answer, currentQuestionWordObj.meaning);
    } else {
        isCorrect = (answer === currentQuestionWordObj.word.toLowerCase());
    }
    const modalContent = document.querySelector("#answerModal .modal-content");
    if (isCorrect) {
        modalContent.classList.add("correct-animation");
        setTimeout(() => modalContent.classList.remove("correct-animation"), 400);
        playBeep("correct");
        updateAchievementsOnCorrect();
        // 如果是曾错过的词，标记 SRS 进度
        if (wrongWords.find(x => x.word === currentQuestionWordObj.word)) {
            markWordRemembered(currentQuestionWordObj.word);
        }

        const w = currentQuestionWordObj;
        let detailHtml = `<div class="word-detail">`;
        detailHtml += `<div class="word-detail-header">`;
        detailHtml += `<span class="status-badge">✅ 正确</span>`;
        detailHtml += `<span class="detail-word">${w.word}</span>`;
        detailHtml += `<button class="speaker-btn" style="width:38px;height:38px;font-size:18px;" onclick="speakText('${w.word.replace(/'/g, "\\'")}')" title="朗读单词">🔊</button>`;
        detailHtml += `</div>`;

        detailHtml += `<div class="detail-row label-pos"><span class="label">词性</span><span class="content">${w.pos}</span></div>`;
        detailHtml += `<div class="detail-row label-meaning"><span class="label">释义</span><span class="content">${w.fullMeaning}</span></div>`;

        if (w.phrases && w.phrases.length) {
            let phrasesHtml = '<div class="phrases-list">';
            for (let p of w.phrases) {
                if (typeof p === 'string') {
                    phrasesHtml += `<span class="phrase-item no-zh">${p}</span>`;
                } else if (p.en && p.zh) {
                    phrasesHtml += `<span class="phrase-item"><span class="phrase-en">${p.en}</span><span class="phrase-zh">${p.zh}</span></span>`;
                } else {
                    const txt = (p.en || p.zh || '');
                    phrasesHtml += `<span class="phrase-item no-zh">${txt}</span>`;
                }
            }
            phrasesHtml += '</div>';
            detailHtml += `<div class="detail-row label-phrase"><span class="label">常用短语</span><span class="content">${phrasesHtml}</span></div>`;
        }

        if (w.example) {
            let exampleHtml = `<div class="example-box">`;
            exampleHtml += `<div class="example-en">"${w.example}" <button class="inline-speaker" onclick="speakText('${w.example.replace(/'/g, "\\'")}')" title="朗读例句">🔊</button></div>`;
            if (w.example_zh) {
                exampleHtml += `<div class="example-zh">${w.example_zh}</div>`;
            }
            exampleHtml += `</div>`;
            detailHtml += `<div class="detail-row label-example"><span class="label">例句</span><span class="content">${exampleHtml}</span></div>`;
        }
        if (w.image) {
            detailHtml += `<img class="detail-image" src="${w.image}" alt="${w.word}">`;
        }
        detailHtml += `</div>`;

        showInfoMessage("单词详解", detailHtml).then(() => {
            stopTimer();
            closeAnswerModal();
            modalResolve({ isCorrect: true, isTimeout: false, answer });
            modalResolve = null;
        });
    } else {
        modalContent.classList.add("wrong-animation");
        setTimeout(() => modalContent.classList.remove("wrong-animation"), 400);
        playBeep("wrong");
        recordWrongWord(currentQuestionWordObj, currentRoomLevel);
        recordWrongAttempt();
        stopTimer();
        closeAnswerModal();
        modalResolve({ isCorrect: false, isTimeout: false, answer });
        modalResolve = null;
    }
}
function onAnswerCancel() {
    if (!modalResolve) return;
    stopTimer();
    closeAnswerModal();
    modalResolve({ isCancel: true });
    modalResolve = null;
}
modalSubmitBtn.onclick = onAnswerSubmit;
modalCancelBtn.onclick = onAnswerCancel;
modalAnswerInput.addEventListener("keypress", e => { if (e.key === "Enter") onAnswerSubmit(); });
hintBtn.onclick = useHint;
extraTimeBtn.onclick = useExtraTime;

// 试炼逻辑
async function askNextTrialQuestion() {
    if (!trialActive) return;
    if (correctAnswers >= 20) {
        trialActive = false;
        trialMessageDiv.innerText = "🎉 试炼通过！可进入下一层。";
        if (currentRoomLevel === 1) roomPassed1 = true;
        else if (currentRoomLevel === 2) roomPassed2 = true;
        else if (currentRoomLevel === 3) roomPassed3 = true;
        if (mistakesLeft === 3) {
            achievements.perfectTrials++;
            saveGame();
            fireConfetti(50);
            showAchievementToast("完美试炼！", "⭐");
            await showInfoMessage("🏆 成就", "完美试炼！未使用任何错误机会！");
        }
        achievements.roomsCompleted = (roomPassed1?1:0)+(roomPassed2?1:0)+(roomPassed3?1:0);
        saveGame();
        roomPassed = true;
        stopCountdown();
        completeRoomBtn.disabled = false;
        startTrialBtn.disabled = true;
        await showInfoMessage("试炼成功", "你通过了最终试炼！点击通关按钮进入下一层。");
        return;
    }
    if (mistakesLeft <= 0) {
        trialActive = false;
        stopCountdown();
        trialMessageDiv.innerText = "试炼失败，请退出密室重试。";
        startTrialBtn.disabled = false;
        completeRoomBtn.disabled = true;
        await showInfoMessage("试炼失败", "错误次数用尽，请退出密室后重新进入。");
        return;
    }
    const q = currentTrialWordList[correctAnswers];
    currentQuestionWordObj = q;
    const direction = getRandomDirection();
    const result = await showAnswerModal({
        mode: 'trial', title: '📝 单词试炼', wordObj: q, direction: direction,
        currentNum: correctAnswers+1, total: 20, timeLimit: 30
    });
    if (result.isCancel) {
        trialActive = false;
        stopCountdown();
        trialMessageDiv.innerText = "试炼已放弃。";
        startTrialBtn.disabled = false;
        completeRoomBtn.disabled = true;
        await showInfoMessage("试炼放弃", "你放弃了试炼，下次进入需重新开始。");
        return;
    }
    if (result.isTimeout) {
        mistakesLeft--;
        updateTrialUI();
        if (mistakesLeft > 0) {
            await showInfoMessage("超时", `超时未答，剩余错误次数 ${mistakesLeft}`);
            await askNextTrialQuestion();
        } else {
            trialActive = false;
            trialMessageDiv.innerText = "试炼失败";
            startTrialBtn.disabled = false;
            completeRoomBtn.disabled = true;
            await showInfoMessage("试炼失败", "超时耗尽错误次数。");
        }
        return;
    }
    if (result.isCorrect) {
        correctAnswers++;
        updateTrialUI();
        await askNextTrialQuestion();
    } else {
        mistakesLeft--;
        updateTrialUI();
        if (mistakesLeft > 0) {
            await showInfoMessage("回答错误", `还剩 ${mistakesLeft} 次机会，请继续。`);
            await askNextTrialQuestion();
        } else {
            trialActive = false;
            trialMessageDiv.innerText = "试炼失败";
            startTrialBtn.disabled = false;
            completeRoomBtn.disabled = true;
            await showInfoMessage("试炼失败", "错误次数用尽。");
        }
    }
}
async function startTrial() {
    if (trialActive) { await showInfoMessage("提示","试炼进行中"); return; }
    if (roomPassed) { await showInfoMessage("提示","已通过试炼，请直接通关"); return; }
    if (currentWordList.length < 20) { await showInfoMessage("词库不足",`当前词库仅${currentWordList.length}词，不足20`); return; }
    const list = getRandomDistinctWords(20);
    if (!list){ await showInfoMessage("错误","无法生成20个不同单词"); return; }
    currentTrialWordList = list;
    correctAnswers = 0; mistakesLeft = 3; trialActive = true;
    updateTrialUI(); trialMessageDiv.innerText = "试炼开始！";
    startCountdown();
    await askNextTrialQuestion();
}

// 训练场
async function startTraining() {
    if (trainingActive) { await showInfoMessage("提示","训练已在进行中"); return; }
    trainingActive = true;
    if (remainingWords.length === 0) remainingWords = shuffleArray([...currentWordList]);
    updateTrainingRemainingUI();
    await runTrainingLoop();
}
async function runTrainingLoop() {
    while (trainingActive) {
        if (remainingWords.length === 0) {
            remainingWords = shuffleArray([...currentWordList]);
            await showInfoMessage("训练进度", "本轮单词已全部掌握，开始新的一轮！");
            updateTrainingRemainingUI();
        }
        const nextWord = remainingWords[0];
        currentQuestionWordObj = nextWord;
        const direction = getRandomDirection();
        const result = await showAnswerModal({
            mode: 'training', title: '📚 训练场', wordObj: nextWord, direction: direction,
            currentNum: trainingStreak+1, total: remainingWords.length, timeLimit: 30
        });
        if (result.isCancel) {
            trainingActive = false;
            await showInfoMessage("训练结束", `累计正确 ${trainingStreak} 个单词，未获得门票。`);
            updateTrainingRemainingUI();
            return;
        }
        if (result.isTimeout) {
            await showInfoMessage("超时", `超时未答，请重试。`);
            continue;
        }
        if (result.isCorrect) {
            remainingWords.shift();
            trainingStreak++;
            updateTrainingRemainingUI();
            if (trainingStreak % 10 === 0) {
                tickets++;
                updateTicketUI();
                await showInfoMessage("获得门票", `🎉 累计正确 ${trainingStreak} 个单词，获得 1 张门票！`);
            }
        } else {
            await showInfoMessage("回答错误", `错误，请重试。`);
        }
    }
}

// 错题复习
async function startReview() {
    if (wrongWords.length === 0) {
        await showInfoMessage("错题本", "暂无错题，继续挑战积累吧！");
        return;
    }
    const randomIndex = Math.floor(Math.random() * wrongWords.length);
    const wrong = wrongWords[randomIndex];
    const wordObj = allWords[wrong.level].find(w => w.word === wrong.word);
    if (!wordObj) {
        await showInfoMessage("错误", "单词不存在，请重新进入游戏。");
        return;
    }
    currentQuestionWordObj = wordObj;
    const direction = getRandomDirection();
    const result = await showAnswerModal({
        mode: 'review', title: '📚 错题复习', wordObj: wordObj, direction: direction,
        currentNum: 1, total: 1, timeLimit: 30
    });
    if (result.isCorrect) {
        wrongWords.splice(randomIndex,1);
        await showInfoMessage("复习成功", "该单词已从错题本移除！继续努力！");
        saveGame();
    } else {
        await showInfoMessage("复习失败", "答错了，单词将继续留在错题本中。");
        const existing = wrongWords.find(w => w.word === wordObj.word);
        if (existing) existing.times++;
        saveGame();
    }
}

// 每日挑战
function isNewDay() {
    const today = new Date().toDateString();
    return dailyChallengeDate !== today;
}
async function startDailyChallenge() {
    if (dailyChallengeCompleted && !isNewDay()) {
        await showInfoMessage("每日挑战", "今日已完成，明天再来吧！");
        return;
    }
    if (isNewDay()) {
        dailyChallengeCompleted = false;
        dailyChallengeDate = new Date().toDateString();
        saveGame();
    }
    if (currentWordList.length < 20) {
        await showInfoMessage("词库不足", "当前词库少于20词，无法进行每日挑战。");
        return;
    }
    const dailyWords = getRandomDistinctWords(20);
    if (!dailyWords) return;
    await runDailyChallenge(dailyWords);
}
async function runDailyChallenge(words) {
    let challengeCorrect = 0;
    let challengeMistakes = 5;
    const challengeWords = [...words];
    const total = challengeWords.length;
    for (let i = 0; i < total; i++) {
        if (challengeMistakes <= 0) break;
        const q = challengeWords[i];
        currentQuestionWordObj = q;
        const direction = getRandomDirection();
        const result = await showAnswerModal({
            mode: 'daily', title: '🌟 每日挑战', wordObj: q, direction: direction,
            currentNum: i+1, total: total, timeLimit: 30
        });
        if (result.isCancel) {
            await showInfoMessage("每日挑战", "你放弃了挑战，未获得奖励。");
            return;
        }
        if (result.isTimeout) {
            challengeMistakes--;
            if (challengeMistakes > 0) {
                await showInfoMessage("超时", `超时未答，剩余错误次数 ${challengeMistakes}`);
                i--;
                continue;
            } else {
                await showInfoMessage("挑战失败", "错误次数用尽，每日挑战失败。");
                return;
            }
        }
        if (result.isCorrect) {
            challengeCorrect++;
            let detailHtml = `<div class="word-detail">`;
            detailHtml += `<div class="word-detail-header">`;
            detailHtml += `<span class="status-badge">✅ 正确</span>`;
            detailHtml += `<span class="detail-word">${q.word}</span>`;
            detailHtml += `<button class="speaker-btn" style="width:38px;height:38px;font-size:18px;" onclick="speakText('${q.word.replace(/'/g, "\\'")}')" title="朗读单词">🔊</button>`;
            detailHtml += `</div>`;

            detailHtml += `<div class="detail-row label-pos"><span class="label">词性</span><span class="content">${q.pos}</span></div>`;
            detailHtml += `<div class="detail-row label-meaning"><span class="label">释义</span><span class="content">${q.fullMeaning}</span></div>`;

            if (q.phrases && q.phrases.length) {
                let phrasesHtml = '<div class="phrases-list">';
                for (let p of q.phrases) {
                    if (typeof p === 'string') {
                        phrasesHtml += `<span class="phrase-item no-zh">${p}</span>`;
                    } else if (p.en && p.zh) {
                        phrasesHtml += `<span class="phrase-item"><span class="phrase-en">${p.en}</span><span class="phrase-zh">${p.zh}</span></span>`;
                    } else {
                        const txt = (p.en || p.zh || '');
                        phrasesHtml += `<span class="phrase-item no-zh">${txt}</span>`;
                    }
                }
                phrasesHtml += '</div>';
                detailHtml += `<div class="detail-row label-phrase"><span class="label">常用短语</span><span class="content">${phrasesHtml}</span></div>`;
            }
            if (q.example) {
                let exampleHtml = `<div class="example-box">`;
                exampleHtml += `<div class="example-en">"${q.example}" <button class="inline-speaker" onclick="speakText('${q.example.replace(/'/g, "\\'")}')" title="朗读例句">🔊</button></div>`;
                if (q.example_zh) {
                    exampleHtml += `<div class="example-zh">${q.example_zh}</div>`;
                }
                exampleHtml += `</div>`;
                detailHtml += `<div class="detail-row label-example"><span class="label">例句</span><span class="content">${exampleHtml}</span></div>`;
            }
            if (q.image) detailHtml += `<img class="detail-image" src="${q.image}" alt="${q.word}">`;
            detailHtml += `</div>`;
            await showInfoMessage("单词详解", detailHtml);
        } else {
            challengeMistakes--;
            if (challengeMistakes > 0) {
                await showInfoMessage("回答错误", `还剩 ${challengeMistakes} 次机会，继续答题。`);
                i--;
            } else {
                await showInfoMessage("挑战失败", "错误次数用尽，每日挑战失败。");
                return;
            }
        }
    }
    if (challengeCorrect === total) {
        dailyChallengeCompleted = true;
        saveGame();
        tickets += 10;
        updateTicketUI();
        await showInfoMessage("每日挑战完成", `🎉 恭喜！你完成了每日挑战，获得10张门票！`);
    } else {
        await showInfoMessage("每日挑战", `完成 ${challengeCorrect}/${total} 题，未获得奖励。`);
    }
}

// 界面按钮事件
trainBtn.onclick = () => {
    if (inRoom) { showInfoMessage("提示", "请先退出密室（返回大厅）再训练"); return; }
    startTraining();
};
reviewBtn.onclick = () => {
    if (inRoom) { showInfoMessage("提示", "请先退出密室再复习"); return; }
    startReview();
};
dailyBtn.onclick = () => {
    if (inRoom) { showInfoMessage("提示", "请先退出密室再进行每日挑战"); return; }
    startDailyChallenge();
};
shopBtn.onclick = () => {
    document.getElementById("shopModal").style.display = "flex";
};
achievementsBtn.onclick = () => {
    updateAchievementsUI();
    document.getElementById("achievementsModal").style.display = "flex";
};

enterRoomBtn.onclick = async () => {
    if (inRoom) { await showInfoMessage("提示","已在密室中"); return; }
    let passed = false;
    if (currentRoomLevel === 1) passed = roomPassed1;
    else if (currentRoomLevel === 2) passed = roomPassed2;
    else if (currentRoomLevel === 3) passed = roomPassed3;
    if (passed) {
        await showInfoMessage("提示", "你已经通过了本密室的试炼，请点击「通关并进入下一层」离开。");
        return;
    }
    if (tickets < 2) { await showInfoMessage("门票不足",`需要2张，当前${tickets}`); return; }
    tickets -= 2; updateTicketUI();
    inRoom = true;
    enterRoomBtn.style.display = "none";
    trainBtn.style.display = "none";
    reviewBtn.style.display = "none";
    dailyBtn.style.display = "none";
    shopBtn.style.display = "none";
    gameCenterBtn.style.display = "none";
    cluesBtn.style.display = "none";
    storyBtn.style.display = "none";
    achievementsBtn.style.display = "none";
    roomPanel.style.display = "block";
    roomLevelSpan.innerText = currentRoomLevel;
    roomPassed = passed;
    trialActive = false;
    correctAnswers = 0; mistakesLeft = 3;
    updateTrialUI();
    // 主题/3D 场景/房间标题
    applyTheme(currentRoomLevel);
    updateRoomTitle();
    renderRoomScene();
    // 显示剧情引言
    const intro = STORY.rooms[currentRoomLevel].intro;
    await showInfoMessage(`${STORY.rooms[currentRoomLevel].icon} ${STORY.rooms[currentRoomLevel].name}`, intro);
    trialMessageDiv.innerText = "";
    if (currentWordList.length < 20) { startTrialBtn.disabled = true; trialMessageDiv.innerText = "⚠️词库不足20词，无法试炼"; }
    else { startTrialBtn.disabled = false; }
    // 修复：completeRoomBtn 默认禁用，由 askNextTrialQuestion 通关后开启
    completeRoomBtn.disabled = true;
};
startTrialBtn.onclick = startTrial;
backToHallBtn.onclick = async () => {
    inRoom = false;
    roomPanel.style.display = "none";
    stopCountdown();
    applyTheme(1);
    enterRoomBtn.style.display = "inline-block";
    trainBtn.style.display = "inline-block";
    reviewBtn.style.display = "inline-block";
    dailyBtn.style.display = "inline-block";
    shopBtn.style.display = "inline-block";
    gameCenterBtn.style.display = "inline-block";
    cluesBtn.style.display = "inline-block";
    storyBtn.style.display = "inline-block";
    achievementsBtn.style.display = "inline-block";
    if (trialActive) { trialActive = false; await showInfoMessage("提示","你放弃了试炼"); }
};
completeRoomBtn.onclick = async () => {
    if (!inRoom) { await showInfoMessage("提示","请先进入密室"); return; }
    if (!roomPassed) { await showInfoMessage("提示","请先通过试炼"); return; }
    // 掉落线索碎片
    const clue = collectRandomClue();
    if (clue) showClueToast(clue);
    if (currentRoomLevel === 1) roomPassed1 = true;
    else if (currentRoomLevel === 2) roomPassed2 = true;
    else if (currentRoomLevel === 3) roomPassed3 = true;
    achievements.roomsCompleted = (roomPassed1?1:0)+(roomPassed2?1:0)+(roomPassed3?1:0);
    saveGame();
    stopCountdown();
    await showInfoMessage("🔓 密室完成", STORY.rooms[currentRoomLevel].pass + (clue ? `<br>获得线索：<b>${clue.name}</b> ${clue.icon}` : ""));
    if (currentRoomLevel >= 3) {
        // 全部通关，触发结局
        const endingType = calcEndingType();
        showEnding(endingType);
        return;
    }
    currentRoomLevel++;
    roomPassed = false;
    switchWordLevel(currentRoomLevel);
    inRoom = false;
    roomPanel.style.display = "none";
    applyTheme(1);
    enterRoomBtn.style.display = "inline-block";
    trainBtn.style.display = "inline-block";
    reviewBtn.style.display = "inline-block";
    dailyBtn.style.display = "inline-block";
    shopBtn.style.display = "inline-block";
    gameCenterBtn.style.display = "inline-block";
    cluesBtn.style.display = "inline-block";
    storyBtn.style.display = "inline-block";
    achievementsBtn.style.display = "inline-block";
    let lvName = currentRoomLevel===2 ? "实验室密室 (Lv.2)" : "音乐厅密室 (Lv.3)";
    enterRoomBtn.innerText = `🚪 进入${lvName}`;
    await showInfoMessage("升级",`进入第 ${currentRoomLevel} 层，词库难度提升。需再次通过试炼。`);
};

// 设置面板
const settingsModal = document.getElementById("settingsModal");
const settingsBtn = document.getElementById("settingsBtn");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const soundToggle = document.getElementById("soundToggle");
const musicToggle = document.getElementById("musicToggle");
const musicVolumeSlider = document.getElementById("musicVolume");
const resetProgressBtn = document.getElementById("resetProgressBtn");
const quizModeSelect = document.getElementById("quizModeSelect");
function updateSoundToggleUI() { if(soundEnabled) soundToggle.classList.add("active"); else soundToggle.classList.remove("active"); }
function updateMusicToggleUI() { if(musicEnabled) musicToggle.classList.add("active"); else musicToggle.classList.remove("active"); }
soundToggle.onclick = () => { soundEnabled = !soundEnabled; updateSoundToggleUI(); saveGame(); };
musicToggle.onclick = () => { musicEnabled = !musicEnabled; updateMusicToggleUI(); setMusicEnabled(musicEnabled); saveGame(); };
musicVolumeSlider.onchange = () => { setMusicVolume(parseFloat(musicVolumeSlider.value)); };
quizModeSelect.onchange = () => { quizMode = quizModeSelect.value; saveGame(); };
const diffSelect = document.getElementById("difficultySelect");
if (diffSelect) {
    diffSelect.value = gameDifficulty;
    diffSelect.onchange = () => {
        gameDifficulty = diffSelect.value;
        localStorage.setItem(GAME_DIFF_KEY, gameDifficulty);
        const pool = getDailyPool();
        if (pool) { resetDailyPool(); }
        saveGame();
    };
}
resetProgressBtn.onclick = () => { resetProgress(); settingsModal.style.display = "none"; };
settingsBtn.onclick = () => { updateWordSourceUI(); renderLibraryPicker(); settingsModal.style.display = "flex"; };
closeSettingsBtn.onclick = () => { settingsModal.style.display = "none"; };
const shareBtn = document.getElementById("shareBtn");
if (shareBtn) shareBtn.onclick = () => {
    const today = getTodayStudyCount();
    const stats = getMasteryStats(activeLibraryId, allWords);
    const text = `🔐 词锁：密语逃生\n📚 ${stats.total} 词中已掌握 ${stats.mastered} 词 (${stats.percent}%)\n📖 今日学习 ${today}/100 词\n💰 门票 ${tickets} 张\n➡️ ${window.location.href}`;
    if (navigator.share) {
        navigator.share({ title: "词锁：密语逃生", text }).catch(() => {});
    } else {
        navigator.clipboard.writeText(text).then(() => showInfoMessage("📤 已复制", "分享文本已复制到剪贴板！")).catch(() => {});
    }
};

// 词库管理按钮
document.getElementById("updateWordLibBtn").onclick = handleUpdateWordLibrary;
document.getElementById("enrichWordLibBtn").onclick = handleEnrichWordLibrary;
document.getElementById("resetWordLibBtn").onclick = handleResetWordLibrary;

// 商店模态框控制
const shopModal = document.getElementById("shopModal");
const closeShopBtn = document.getElementById("closeShopBtn");
closeShopBtn.onclick = () => { shopModal.style.display = "none"; };
document.getElementById("buyHintBtn").onclick = () => buyItem("hint");
document.getElementById("buyExtraTimeBtn").onclick = () => buyItem("extraTime");
document.getElementById("buyReviveBtn").onclick = () => buyItem("revive");

// 成就模态框控制
const achievementsModal = document.getElementById("achievementsModal");
const closeAchievementsBtn = document.getElementById("closeAchievementsBtn");
closeAchievementsBtn.onclick = () => { achievementsModal.style.display = "none"; };

// 全局暴露 speakText 供动态按钮使用
window.speakText = speakText;

// 初始化发音按钮
updateVoiceButtonUI();

// 启动游戏
initBackgroundSlider();

// 全局按钮点击音效
document.addEventListener("click", e => {
    const btn = e.target.closest("button");
    if (btn && soundEnabled) playBeep("click");
});

loadWordLibrary();

// ============================================================
// 📜 主题系统（书房/实验室/音乐厅）
// ============================================================
function applyTheme(level) {
    document.body.classList.remove("theme-1", "theme-2", "theme-3");
    document.body.classList.add("theme-" + (level || 1));
}
applyTheme(1);

// ============================================================
// 🛠️ 通用：渲染例句（含中英）
// ============================================================
function renderExampleBlock(w) {
    if (!w || !w.example) return "";
    let html = `<div class="game-example">`;
    html += `<div class="game-example-en">"${escapeHtml(w.example)}"</div>`;
    if (w.example_zh) html += `<div class="game-example-zh">${escapeHtml(w.example_zh)}</div>`;
    html += `</div>`;
    return html;
}
function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, ch => ({
        "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[ch]));
}

// ============================================================
// 📜 剧情系统
// ============================================================
const STORY = {
    intro: [
        "在一个月色朦胧的夜晚，你收到一封神秘来信……",
        "信中写到：古老的词汇城堡深处，封印着被遗忘的语言力量。",
        "唯有用英文「钥匙」解开三道密室之门，方能获得自由。",
        "书房、实验室、音乐厅——三间密室，三重试炼。",
        "线索碎片散落其中，完整收集 12 个碎片，方能拼凑出真相……",
        "深呼吸。你的逃生之旅，从此刻开始。"
    ],
    rooms: {
        1: { name: "书房密室", icon: "📚",
             intro: "灰尘飞舞的古老书房，尘封的书架间藏有不为人知的秘密……",
             pass:   "你破译了书房的密码！古老典籍中飘出一张羊皮纸。" },
        2: { name: "实验室密室", icon: "🔬",
             intro: "冰冷的金属墙壁，发光的化学药剂，蓝光中似乎藏着谜题……",
             pass:   "你破解了实验密码！一管发光的试剂滚落到脚边。" },
        3: { name: "音乐厅密室", icon: "🎭",
             intro: "华丽的水晶吊灯，沉寂的钢琴声，舞台大幕徐徐拉开……",
             pass:   "🎉 你完成了所有试炼！词汇城堡的大门终于打开……" }
    },
    endings: {
        perfect: {
            icon: "👑", title: "完美逃生 · 词之王者",
            text: "你以零失误通关了全部三道密室，并收集了所有 12 个线索碎片。" +
                  "古老的词汇之神被你的意志折服，赐予你「词之王者」封号。" +
                  "城堡化为漫天星光，你的名字将永远镌刻在词海之巅。"
        },
        great: {
            icon: "🏆", title: "优秀逃生 · 智慧学者",
            text: "你成功穿越了全部密室，仅有少量失误。" +
                  "你展现了非凡的词汇天赋，学者之名当之无愧。" +
                  "城堡的门为你打开，门外是黎明的第一缕曙光。"
        },
        good: {
            icon: "🎖️", title: "普通逃生 · 坚韧旅人",
            text: "你凭借坚韧的意志，闯过了三道密室的试炼。" +
                  "虽然过程曲折，但你的词典中已写满了新的词汇。" +
                  "下一次挑战，你会更强。"
        },
        partial: {
            icon: "🚪", title: "未竟之旅",
            text: "你未能完成所有密室的试炼，但每一次尝试都是成长。" +
                  "线索碎片散落各地，待你日后再次拾起……" +
                  "词汇城堡永远为你敞开大门。"
        },
        timeout: {
            icon: "⏰", title: "时间耗尽",
            text: "逃生倒计时归零。密室缓缓重置，你被传送回起点。" +
                  "但请记住：掌握词汇，是一场没有终点的旅程。" +
                  "再次深呼吸，重启挑战！"
        }
    }
};

// 12 个线索碎片
const CLUES_DATA = [
    { id: 1,  icon: "🖋️", name: "古老的羽毛笔", desc: "羽毛笔尖上刻着奇怪的字母……" },
    { id: 2,  icon: "📜", name: "泛黄的信笺",   desc: "信中写道：'Language is the key.'" },
    { id: 3,  icon: "🕯️", name: "未熄的蜡烛",   desc: "烛火摇曳，似乎在指引方向。" },
    { id: 4,  icon: "🔑", name: "神秘钥匙",     desc: "齿纹呈字母 E 形——Escape？" },
    { id: 5,  icon: "🧪", name: "蓝色试剂",     desc: "瓶身贴有标签：Phonetic Elixir" },
    { id: 6,  icon: "🔬", name: "破损的镜片",   desc: "透过镜片看世界，字母都会跳舞。" },
    { id: 7,  icon: "⚗️", name: "蒸馏瓶",       desc: "里面似乎有字在翻腾……" },
    { id: 8,  icon: "💡", name: "灵光一现",     desc: "某道谜题突然在脑海中清晰。" },
    { id: 9,  icon: "🎼", name: "五线谱残页",   desc: "音符下藏着被擦去的字母。" },
    { id: 10, icon: "🎭", name: "金色面具",     desc: "面具背面刻着一行拉丁文。" },
    { id: 11, icon: "🎻", name: "断裂的琴弦",   desc: "弦丝由 26 个字母编织而成。" },
    { id: 12, icon: "👑", name: "词之王者徽章", desc: "12 碎片集齐后浮现——真相揭晓！" }
];

const CLUES_KEY = "cluesCollected_v1";
const ENDING_KEY = "endingSeen_v1";
const OPENING_SEEN_KEY = "openingSeen_v1";

function loadClues() {
    try { return JSON.parse(localStorage.getItem(CLUES_KEY)) || []; }
    catch (e) { return []; }
}
function saveClues(arr) {
    try { localStorage.setItem(CLUES_KEY, JSON.stringify(arr)); } catch (e) {}
}
function collectRandomClue() {
    const collected = loadClues();
    const remaining = CLUES_DATA.filter(c => !collected.includes(c.id));
    if (!remaining.length) {
        // 已经集齐，触发全线索成就彩带
        fireConfetti(80);
        showAchievementToast("已集齐全部线索！", "👑");
        return null;
    }
    const pick = remaining[Math.floor(Math.random() * remaining.length)];
    collected.push(pick.id);
    saveClues(collected);
    if (collected.length === 12) {
        fireConfetti(80);
        showAchievementToast("已集齐全部 12 线索！", "👑");
    }
    return pick;
}
function renderCluesModal() {
    const grid = document.getElementById("clueGrid");
    if (!grid) return;
    const collected = loadClues();
    grid.innerHTML = "";
    CLUES_DATA.forEach(c => {
        const isHave = collected.includes(c.id);
        const div = document.createElement("div");
        div.className = "clue-slot " + (isHave ? "collected" : "empty");
        div.innerHTML = isHave
            ? `<div class="clue-icon">${c.icon}</div><div class="clue-name">${c.name}</div><div class="clue-desc">${c.desc}</div>`
            : `<div class="clue-icon">❓</div><div class="clue-name">???</div><div class="clue-desc">尚未获得</div>`;
        grid.appendChild(div);
    });
}
function showClueToast(clue) {
    const toast = document.getElementById("clueToast");
    if (!toast || !clue) return;
    document.getElementById("clueToastIcon").innerText = clue.icon;
    document.getElementById("clueToastText").innerText = `${clue.name} - ${clue.desc}`;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 4000);
}

// ============================================================
// 🎬 剧情开场动画
// ============================================================
function playOpeningAnimation() {
    return new Promise(resolve => {
        const seen = localStorage.getItem(OPENING_SEEN_KEY);
        if (seen) { resolve(); return; }
        const overlay = document.createElement("div");
        overlay.className = "opening-overlay";
        overlay.innerHTML = `
            <div class="opening-fog"></div>
            <div class="opening-title">词 锁</div>
            <div class="opening-subtitle">— 密 语 逃 生 —</div>
            <div class="opening-story" id="openingStory"></div>
            <div class="opening-buttons">
                <button id="openingStart" style="background: #e94560; font-size: 22px; padding: 14px 36px;">🚪 开始逃生</button>
            </div>
            <button class="opening-skip" id="openingSkip">跳过 →</button>
        `;
        document.body.appendChild(overlay);
        const storyDiv = document.getElementById("openingStory");
        STORY.intro.forEach((line, i) => {
            const span = document.createElement("div");
            span.className = "line";
            span.innerText = line;
            span.style.animationDelay = (1.2 + i * 0.6) + "s";
            storyDiv.appendChild(span);
        });
        const close = () => {
            overlay.style.transition = "opacity 0.8s ease";
            overlay.style.opacity = "0";
            setTimeout(() => { overlay.remove(); resolve(); }, 800);
        };
        // 首启时：开场动画结束后自动启动新手引导（修复：原 wrapper 时机太晚）
        const _seenOpening = localStorage.getItem(OPENING_SEEN_KEY);
        if (!_seenOpening) {
            const _triggerTutorial = () => setTimeout(() => {
                if (typeof startTutorial === "function") startTutorial();
            }, 600);
            const _startBtn = document.getElementById("openingStart");
            const _skipBtn = document.getElementById("openingSkip");
            if (_startBtn) _startBtn.addEventListener("click", _triggerTutorial, { once: true });
            if (_skipBtn) _skipBtn.addEventListener("click", _triggerTutorial, { once: true });
        }
        document.getElementById("openingStart").onclick = () => {
            localStorage.setItem(OPENING_SEEN_KEY, "1");
            close();
        };
        document.getElementById("openingSkip").onclick = () => {
            localStorage.setItem(OPENING_SEEN_KEY, "1");
            close();
        };
    });
}

// ============================================================
// ⏰ 逃生倒计时
// ============================================================
const TRIAL_TIME_LIMIT = 600; // 10 分钟（秒）
let countdownTimer = null;
let countdownRemaining = TRIAL_TIME_LIMIT;

function startCountdown() {
    stopCountdown();
    countdownRemaining = TRIAL_TIME_LIMIT;
    const bar = document.getElementById("countdownBar");
    if (bar) bar.style.display = "flex";
    updateCountdownUI();
    countdownTimer = setInterval(() => {
        countdownRemaining--;
        updateCountdownUI();
        if (countdownRemaining <= 0) {
            stopCountdown();
            handleCountdownTimeout();
        }
    }, 1000);
}
function stopCountdown() {
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    const bar = document.getElementById("countdownBar");
    if (bar) bar.style.display = "none";
}
function updateCountdownUI() {
    const fill = document.getElementById("cdProgressFill");
    const text = document.getElementById("cdTimeText");
    const bar = document.getElementById("countdownBar");
    if (!fill || !text) return;
    const pct = (countdownRemaining / TRIAL_TIME_LIMIT) * 100;
    fill.style.width = pct + "%";
    const m = Math.floor(countdownRemaining / 60);
    const s = countdownRemaining % 60;
    text.innerText = `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
    bar.classList.remove("warning", "danger");
    if (countdownRemaining <= 60) bar.classList.add("danger");
    else if (countdownRemaining <= 180) bar.classList.add("warning");
}
function handleCountdownTimeout() {
    showEnding("timeout");
}

// ============================================================
// 🏆 多结局系统
// ============================================================
function calcEndingType() {
    const collected = loadClues().length;
    const totalMistakes = (roomPassed1?0:1) + (roomPassed2?0:1) + (roomPassed3?0:1);
    if (roomPassed1 && roomPassed2 && roomPassed3) {
        if (achievements.perfectTrials >= 3 || collected >= 12) return "perfect";
        if (achievements.totalCorrect >= 100) return "great";
        return "good";
    }
    if (roomPassed1 || roomPassed2) return "partial";
    return "partial";
}
function showEnding(type) {
    const seen = JSON.parse(localStorage.getItem(ENDING_KEY) || "[]");
    if (seen.includes(type) && type !== "timeout") { /* 已见过，但仍允许查看 */ }
    if (!seen.includes(type)) seen.push(type);
    localStorage.setItem(ENDING_KEY, JSON.stringify(seen));

    const data = STORY.endings[type];
    const screen = document.getElementById("endingScreen");
    if (!screen) return;
    screen.innerHTML = `
        <div class="ending-icon">${data.icon}</div>
        <h2>${data.title}</h2>
        <div class="ending-text">${data.text}</div>
        <div class="ending-stats">
            <div class="end-stat"><div class="v">${loadClues().length}/12</div><div class="l">线索碎片</div></div>
            <div class="end-stat"><div class="v">${(roomPassed1?1:0)+(roomPassed2?1:0)+(roomPassed3?1:0)}/3</div><div class="l">密室通关</div></div>
            <div class="end-stat"><div class="v">${achievements.totalCorrect}</div><div class="l">累计正确</div></div>
        </div>
        <div class="modal-buttons">
            <button id="endingReplay" style="background: #27ae60;">🔄 重新开始</button>
            <button id="endingClose" class="cancel-btn">关闭</button>
        </div>
    `;
    // 触发彩带
    if (type === "perfect") fireConfetti(150);
    else if (type === "great" || type === "good") fireConfetti(80);
    else fireConfetti(40);
    document.getElementById("endingModal").style.display = "flex";
    document.getElementById("endingReplay").onclick = () => {
        document.getElementById("endingModal").style.display = "none";
        resetProgress();
    };
    document.getElementById("endingClose").onclick = () => {
        document.getElementById("endingModal").style.display = "none";
    };
    playBeep("correct");
}

// ============================================================
// 🏛️ 密室 3D 场景渲染
// ============================================================
function renderRoomScene() {
    const objects = document.getElementById("roomObjects");
    const particles = document.getElementById("roomParticles");
    if (!objects || !particles) return;
    objects.innerHTML = "";
    particles.innerHTML = "";
    const objs = ["📚","🕯️","📖","🪑","🖋️","🔬","🧪","💡","🎹","🎻","🎼","🎭"];
    const lv = currentRoomLevel;
    let pool;
    if (lv === 1) pool = ["📚","🕯️","📖","🪑","🖋️"];
    else if (lv === 2) pool = ["🧪","🔬","💡","⚗️","🧬"];
    else pool = ["🎹","🎻","🎼","🎭","🎷"];
    pool.forEach(o => {
        const span = document.createElement("div");
        span.className = "room-obj";
        span.innerText = o;
        objects.appendChild(span);
    });
    for (let i = 0; i < 12; i++) {
        const p = document.createElement("span");
        p.style.left = Math.random() * 100 + "%";
        p.style.animationDelay = (Math.random() * 8) + "s";
        p.style.animationDuration = (5 + Math.random() * 6) + "s";
        particles.appendChild(p);
    }
}

function updateRoomTitle() {
    const lv = currentRoomLevel;
    const titleEl = document.getElementById("roomTitle");
    const introEl = document.getElementById("roomIntro");
    const room = STORY.rooms[lv];
    if (titleEl) titleEl.innerText = `${room.icon} ${room.name}`;
    if (introEl) introEl.innerText = room.intro;
}

// ============================================================
// 🔗 剧情 / 线索 / 倒计时 / 结局 UI 绑定
// ============================================================
document.getElementById("cluesBtn").onclick = () => {
    renderCluesModal();
    document.getElementById("cluesModal").style.display = "flex";
};
document.getElementById("closeCluesBtn").onclick = () => {
    document.getElementById("cluesModal").style.display = "none";
};
document.getElementById("storyBtn").onclick = () => { playOpeningAnimation(); };

// ============================================================
// 🔤 Hangman 猜字游戏
// ============================================================
const HM_FACES = ["🙂","😐","😟","😨","😰","😱","💀"];
let hmState = null;
function openHangmanGame() {
    if (tickets < 1) { showInfoMessage("🎫 门票不足", "需要 1 张门票开始猜字游戏。"); return; }
    tickets--; updateTicketUI(); saveGame();
    document.getElementById("hangmanModal").style.display = "flex";
    startHangmanRound();
}
function startHangmanRound() {
    const pool = getDailyGameWords();
    if (!pool.length) { showInfoMessage("⚠️ 词池为空", "每日词池已用完，点击「下一批」补充。"); return; }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    hmState = {
        word: pick.word.toLowerCase().replace(/[^a-z]/g, ""),
        meaning: pick.meaning || pick.fullMeaning || "",
        fullEntry: pick,
        guessed: new Set(),
        wrong: 0,
        maxWrong: 6,
        wins: hmState ? hmState.wins : 0,
        round: hmState ? hmState.round + 1 : 1
    };
    if (hmState.round > 5) { finishHangmanGame(); return; }
    document.getElementById("hmLives").innerText = hmState.maxWrong;
    document.getElementById("hmWins").innerText = hmState.wins;
    document.getElementById("hmRound").innerText = hmState.round;
    document.getElementById("hmDrawing").innerText = HM_FACES[0];
    document.getElementById("hmHint").innerHTML = `提示：<b>${escapeHtml(hmState.meaning)}</b>`;
    renderHMWord();
    renderHMKeyboard();
}
function renderHMWord() {
    const el = document.getElementById("hmWord");
    el.innerHTML = "";
    for (let ch of hmState.word) {
        if (hmState.guessed.has(ch)) {
            el.innerHTML += `<span class="blank" style="color:#2ecc71;">${ch.toUpperCase()}</span>`;
        } else {
            el.innerHTML += `<span class="blank">_</span>`;
        }
    }
}
function renderHMKeyboard() {
    const kb = document.getElementById("hmKeyboard");
    kb.innerHTML = "";
    const letters = "abcdefghijklmnopqrstuvwxyz".split("");
    letters.forEach(ch => {
        const btn = document.createElement("button");
        btn.className = "hangman-key";
        btn.innerText = ch.toUpperCase();
        btn.onclick = () => guessHMLetter(ch, btn);
        kb.appendChild(btn);
    });
}
function guessHMLetter(ch, btn) {
    if (!hmState || btn.disabled) return;
    btn.disabled = true;
    hmState.guessed.add(ch);
    if (hmState.word.includes(ch)) {
        btn.classList.add("correct");
        playBeep("correct");
        renderHMWord();
        if ([...hmState.word].every(c => hmState.guessed.has(c))) {
            hmState.wins++;
            updateAchievementsOnCorrect();
            const clue = collectRandomClue();
            if (clue) showClueToast(clue);
            setTimeout(() => {
                const ex = renderExampleBlock(hmState.fullEntry);
                showInfoMessage("🎉 答对了！",
                    `单词：<b>${hmState.word.toUpperCase()}</b> = ${escapeHtml(hmState.meaning)}${ex ? "<br>" + ex : ""}<br>${clue ? "获得线索：" + clue.name : ""}`
                ).then(startHangmanRound);
            }, 400);
        }
    } else {
        btn.classList.add("wrong");
        playBeep("wrong");
        hmState.wrong++;
        document.getElementById("hmLives").innerText = hmState.maxWrong - hmState.wrong;
        document.getElementById("hmDrawing").innerText = HM_FACES[hmState.wrong];
        if (hmState.wrong >= hmState.maxWrong) {
            setTimeout(() => {
                const ex = renderExampleBlock(hmState.fullEntry);
                showInfoMessage("💀 失败",
                    `正确单词：<b>${hmState.word.toUpperCase()}</b> = ${escapeHtml(hmState.meaning)}${ex ? "<br>" + ex : ""}`
                ).then(startHangmanRound);
            }, 400);
        }
    }
}
function finishHangmanGame() {
    const reward = hmState.wins * 2;
    tickets += reward; updateTicketUI(); saveGame();
    showGameEndModal("🏆 猜字结束", `胜 ${hmState.wins}/5 局<br>获得 ${reward} 🎫 奖励`).then(action => {
        document.getElementById("hangmanModal").style.display = "none";
        hmState = null;
        if (action === "retry") setTimeout(() => openHangmanGame(), 100);
    });
}
document.getElementById("hmRestartBtn").onclick = startHangmanRound;
document.getElementById("hmCloseBtn").onclick = () => {
    document.getElementById("hangmanModal").style.display = "none";
    hmState = null;
};

// ============================================================
// 🎧 听音抢答
// ============================================================
let lsState = null;
function openListenGame() {
    if (tickets < 1) { showInfoMessage("🎫 门票不足", "需要 1 张门票开始听音游戏。"); return; }
    tickets--; updateTicketUI(); saveGame();
    document.getElementById("listenModal").style.display = "flex";
    startListenRound();
}
function startListenRound() {
    if (lsState && lsState.q > 10) { finishListenGame(); return; }
    const pool = getDailyGameWords();
    if (pool.length < 4) { showInfoMessage("❌ 词池不足", "每日词池至少需要 4 个单词"); return; }
    const shuffled = shuffleArray([...pool]);
    const correct = shuffled[0];
    const distractors = shuffled.slice(1, 4);
    const options = shuffleArray([correct, ...distractors]);
    lsState = lsState || { q: 0, correct: 0, streak: 0, bestStreak: 0 };
    lsState.q++;
    lsState.currentWord = correct;
    document.getElementById("lsQ").innerText = lsState.q;
    document.getElementById("lsCorrect").innerText = lsState.correct;
    document.getElementById("lsStreak").innerText = lsState.streak;
    document.getElementById("lsHint").innerText = "点击🔊听单词";
    const opts = document.getElementById("lsOptions");
    opts.innerHTML = "";
    options.forEach(o => {
        const btn = document.createElement("button");
        btn.className = "listen-option";
        btn.innerText = o.meaning || o.fullMeaning || o.word;
        btn.onclick = () => handleListenAnswer(btn, o, correct, options);
        opts.appendChild(btn);
    });
    document.getElementById("lsHint").innerText = "点击🔊听单词";
}
function handleListenAnswer(btn, picked, correct, options) {
    document.querySelectorAll(".listen-option").forEach(b => b.disabled = true);
    const isRight = picked.word === correct.word;
    const hint = document.getElementById("lsHint");
    if (isRight) {
        btn.classList.add("correct");
        lsState.correct++;
        lsState.streak++;
        if (lsState.streak > lsState.bestStreak) lsState.bestStreak = lsState.streak;
        playBeep("correct");
        document.getElementById("lsCorrect").innerText = lsState.correct;
        document.getElementById("lsStreak").innerText = lsState.streak;
        const reward = lsState.streak >= 3 ? 2 : 1;
        tickets += reward; updateTicketUI(); saveGame();
        const zh = correct.meaning || correct.fullMeaning || "";
        const ex = renderExampleBlock(correct);
        hint.innerHTML = `<b>${escapeHtml(correct.word)}</b> ${zh ? "= " + escapeHtml(zh) : ""}${ex ? `<br>${ex}` : ""}<br><span style="color:var(--secondary)">+${reward}🎫</span>`;
        if (lsState.streak === 3) {
            const clue = collectRandomClue();
            if (clue) setTimeout(() => showClueToast(clue), 600);
        }
    } else {
        btn.classList.add("wrong");
        lsState.streak = 0;
        playBeep("wrong");
        document.getElementById("lsStreak").innerText = 0;
        document.querySelectorAll(".listen-option").forEach(b => {
            if (b.innerText === (correct.meaning || correct.fullMeaning || correct.word)) b.classList.add("correct");
        });
        const zh = correct.meaning || correct.fullMeaning || "";
        const ex = renderExampleBlock(correct);
        hint.innerHTML = `<span style="color:#ff6b6b">正确答案：</span><b>${escapeHtml(correct.word)}</b> ${zh ? "= " + escapeHtml(zh) : ""}${ex ? `<br>${ex}` : ""}`;
    }
    setTimeout(startListenRound, 1900);
}
function finishListenGame() {
    const reward = lsState.correct + (lsState.bestStreak >= 5 ? 3 : 0);
    tickets += reward; updateTicketUI(); saveGame();
    showGameEndModal("🎧 听音结束", `答对 ${lsState.correct}/10<br>最高连击 ${lsState.bestStreak}<br>奖励 ${reward} 🎫`).then(action => {
        document.getElementById("listenModal").style.display = "none";
        lsState = null;
        if (action === "retry") setTimeout(() => openListenGame(), 100);
    });
}
document.getElementById("lsSpeakBtn").onclick = () => {
    if (!lsState || !lsState.currentWord) return;
    speakText(lsState.currentWord.word);
};
document.getElementById("lsCloseBtn").onclick = () => {
    document.getElementById("listenModal").style.display = "none";
    lsState = null;
};

// ============================================================
// ⌨️ 打字竞速
// ============================================================
let tpState = null;
let tpInputHandler = null;
function openTypingGame() {
    if (tickets < 1) { showInfoMessage("🎫 门票不足", "需要 1 张门票开始打字游戏。"); return; }
    tickets--; updateTicketUI(); saveGame();
    document.getElementById("typingModal").style.display = "flex";
    tpState = { score: 0, level: 1, time: 60, hits: 0, miss: 0, hearts: 3, words: [], running: false };
    document.getElementById("tpScore").innerText = "0";
    document.getElementById("tpLevel").innerText = "1";
    document.getElementById("tpTime").innerText = "60";
    document.getElementById("tpHits").innerText = "0";
    document.getElementById("tpMiss").innerText = "0";
    document.getElementById("tpHearts").innerText = "❤️❤️❤️";
    document.getElementById("tpStage").querySelectorAll(".typing-falling-word").forEach(e => e.remove());
    document.getElementById("tpStartBtn").style.display = "inline-block";
}
function startTypingRound() {
    if (!tpState) return;
    tpState.running = true;
    document.getElementById("tpStartBtn").style.display = "none";
    const stage = document.getElementById("tpStage");
    const input = document.createElement("div");
    input.className = "typing-input-row";
    input.innerHTML = `<input type="text" class="typing-input" id="tpInput" placeholder="输入下落的单词..." autocomplete="off"><div class="typing-preview" id="tpPreview"></div>`;
    const existing = stage.querySelector(".typing-input-row");
    if (existing) existing.remove();
    stage.appendChild(input);
    const inp = document.getElementById("tpInput");
    inp.focus();
    tpInputHandler = (e) => {
        if (!tpState || !tpState.running) return;
        const val = inp.value.trim().toLowerCase();
        const preview = document.getElementById("tpPreview");
        if (preview) preview.innerText = val ? "▶ " + inp.value : "";
        if (!val) return;
        const target = tpState.words.find(w => w.text.toLowerCase() === val);
        if (target) {
            target.el.classList.add("matched");
            tpState.hits++;
            tpState.score += 10 * tpState.level;
            tpState.words = tpState.words.filter(w => w !== target);
            setTimeout(() => target.el.remove(), 300);
            inp.value = "";
            if (tpState.hits % 5 === 0) tpState.level++;
            document.getElementById("tpScore").innerText = tpState.score;
            document.getElementById("tpHits").innerText = tpState.hits;
            document.getElementById("tpLevel").innerText = tpState.level;
            const reward = 1;
            tickets += reward;
        }
    };
    inp.addEventListener("input", tpInputHandler);

    let spawnInterval = 1800;
    const spawner = setInterval(() => {
        if (!tpState || !tpState.running) { clearInterval(spawner); return; }
        const pool = getDailyGameWords();
        if (!pool.length) return;
        const w = pool[Math.floor(Math.random() * pool.length)];
        const el = document.createElement("div");
        el.className = "typing-falling-word";
        el.innerHTML = `<div class="tf-en">${escapeHtml(w.word)}</div><div class="tf-zh">${escapeHtml(w.meaning || w.fullMeaning || "")}</div>`;
        el.style.left = (Math.random() * 70 + 5) + "%";
        el.style.top = "50px";
        stage.appendChild(el);
        const fallSpeed = 0.4 + tpState.level * 0.1;
        const wordObj = { text: w.word, el, y: 0, data: w };
        tpState.words.push(wordObj);
        const ticker = setInterval(() => {
            if (!tpState || !tpState.running) { clearInterval(ticker); el.remove(); return; }
            wordObj.y += fallSpeed;
            el.style.top = wordObj.y + "px";
            const stageH = stage.clientHeight;
            if (wordObj.y > stageH - 60) {
                el.remove();
                tpState.miss++;
                tpState.hearts--;
                tpState.words = tpState.words.filter(x => x !== wordObj);
                updateTPHearts();
                if (tpState.hearts <= 0) { clearInterval(ticker); endTypingGame(); }
            }
            if (el.classList.contains("matched")) clearInterval(ticker);
        }, 30);
    }, spawnInterval);

    const timer = setInterval(() => {
        if (!tpState || !tpState.running) { clearInterval(timer); return; }
        tpState.time--;
        document.getElementById("tpTime").innerText = tpState.time;
        if (tpState.time <= 0) { clearInterval(timer); endTypingGame(); }
    }, 1000);

    tpState._spawner = spawner;
    tpState._timer = timer;
}
function updateTPHearts() {
    document.getElementById("tpHearts").innerText = "❤️".repeat(tpState.hearts) + "🖤".repeat(3 - tpState.hearts);
}
function endTypingGame() {
    if (!tpState) return;
    tpState.running = false;
    if (tpState._spawner) clearInterval(tpState._spawner);
    if (tpState._timer) clearInterval(tpState._timer);
    document.querySelectorAll(".typing-falling-word").forEach(e => e.remove());
    const inp = document.getElementById("tpInput");
    if (inp) { inp.removeEventListener("input", tpInputHandler); inp.remove(); }
    updateTicketUI(); saveGame();
    const reward = Math.floor(tpState.score / 20);
    tickets += reward; updateTicketUI();
    document.getElementById("tpStartBtn").style.display = "inline-block";
    showGameEndModal("⌨️ 游戏结束", `分数 ${tpState.score}<br>击中 ${tpState.hits} 漏网 ${tpState.miss}<br>奖励 ${reward} 🎫`).then(action => {
        if (action === "retry") {
            const modal = document.getElementById("typingModal");
            modal.style.display = "none";
            setTimeout(() => openTypingGame(), 100);
        }
    });
}
document.getElementById("tpStartBtn").onclick = startTypingRound;
document.getElementById("tpCloseBtn").onclick = () => {
    if (tpState) {
        tpState.running = false;
        if (tpState._spawner) clearInterval(tpState._spawner);
        if (tpState._timer) clearInterval(tpState._timer);
        tpState = null;
    }
    document.getElementById("typingModal").style.display = "none";
};

// ============================================================
// 🎬 启动剧情动画（异常保护：防止剧情动画报错导致后续绑定失败）
// ============================================================
try {
    const _p = playOpeningAnimation();
    if (_p && _p.catch) _p.catch(e => console.warn("Opening animation error:", e));
} catch (e) {
    console.warn("Opening animation error:", e);
}

// ============================================================
// 🏠 主页菜单联动：实时同步错题数
// ============================================================
function refreshMainMenuStats() {
    const el = document.getElementById("reviewStatCount");
    if (el) el.innerText = (wrongWords || []).length;
}
setInterval(refreshMainMenuStats, 1500);
refreshMainMenuStats();

// ============================================================
// 🎉 彩带/粒子特效
// ============================================================
function fireConfetti(count = 40) {
    const layer = document.getElementById("confettiLayer");
    if (!layer) return;
    const colors = ["#e94560", "#ffd966", "#3498db", "#2ecc71", "#9b59b6", "#f39c12", "#1abc9c", "#ecf0f1"];
    for (let i = 0; i < count; i++) {
        const piece = document.createElement("div");
        piece.className = "confetti-piece";
        piece.style.left = Math.random() * 100 + "%";
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDelay = (Math.random() * 0.6) + "s";
        piece.style.animationDuration = (2 + Math.random() * 2) + "s";
        piece.style.transform = `rotate(${Math.random() * 360}deg)`;
        piece.style.width = (6 + Math.random() * 8) + "px";
        piece.style.height = (10 + Math.random() * 8) + "px";
        if (Math.random() > 0.5) piece.style.borderRadius = "50%";
        layer.appendChild(piece);
        setTimeout(() => piece.remove(), 4000);
    }
}

function fireSparkles(x, y, count = 8) {
    const layer = document.getElementById("confettiLayer");
    if (!layer) return;
    for (let i = 0; i < count; i++) {
        const sp = document.createElement("div");
        sp.className = "sparkle";
        sp.style.left = (x + (Math.random() - 0.5) * 80) + "px";
        sp.style.top  = (y + (Math.random() - 0.5) * 80) + "px";
        layer.appendChild(sp);
        setTimeout(() => sp.remove(), 1000);
    }
}

function showAchievementToast(text, icon = "🏆") {
    const el = document.getElementById("achievementToast");
    if (!el) return;
    document.getElementById("atIcon").innerText = icon;
    document.getElementById("atText").innerText = text;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 3500);
}

// ============================================================
// 📊 学习统计仪表盘
// ============================================================
function renderStats() {
    const content = document.getElementById("statsContent");
    if (!content) return;
    const totalCorrect = achievements.totalCorrect || 0;
    const totalAttempts = achievements.totalAttempts || 0;
    const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
    const clues = loadClues();
    const dueWords = getDueWords(999);
    const mastered = wrongWords.filter(w => (w.streak || 0) >= 3).length;

    // 读最近 7 天
    let hist = {};
    try { hist = JSON.parse(localStorage.getItem(DAILY_HISTORY_KEY)) || {}; } catch (e) { hist = {}; }
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        last7.push({ key, label: ["日","一","二","三","四","五","六"][d.getDay()], data: hist[key] || { correct:0, attempts:0 } });
    }
    const maxAttempts = Math.max(...last7.map(d => d.data.attempts), 1);

    content.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">累计正确</div>
                <div class="stat-value">${totalCorrect}</div>
                <div class="stat-sub">共 ${totalAttempts} 次尝试</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">正确率</div>
                <div class="stat-value">${accuracy}%</div>
                <div class="stat-sub">${accuracy >= 80 ? "🎉 优秀" : accuracy >= 60 ? "💪 不错" : "📈 加油"}</div>
            </div>
            <div class="stat-card" style="cursor:pointer;" onclick="openWrongWordModal()" title="点击查看错题本">
                <div class="stat-label">错题本</div>
                <div class="stat-value">${wrongWords.length}</div>
                <div class="stat-sub">已掌握 ${mastered} 词</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">线索碎片</div>
                <div class="stat-value">${clues.length}/12</div>
                <div class="stat-sub">${Math.round(clues.length/12*100)}% 完整</div>
            </div>
        </div>

        <div class="stats-section-title">📈 学习曲线 (近 14 天)</div>
        <canvas id="studyChartCanvas" width="600" height="200" style="width:100%;height:auto;max-width:600px;background:rgba(0,0,0,0.2);border-radius:12px;margin:8px 0;"></canvas>

        <div class="stats-section-title">📅 最近 7 天活动</div>
        ${last7.map(d => {
            const pct = Math.round((d.data.attempts / maxAttempts) * 100);
            const acc = d.data.attempts > 0 ? Math.round((d.data.correct / d.data.attempts) * 100) : 0;
            return `<div class="stat-bar-row">
                <span class="day-label">周${d.label}</span>
                <div class="stat-bar"><div class="stat-bar-fill" style="width:${pct}%"></div></div>
                <span class="day-value">${d.data.correct}/${d.data.attempts}</span>
            </div>`;
        }).join("")}

        <div class="stats-section-title">🧠 间隔重复 (SRS) 状态</div>
        <div class="srs-info">
            <b>${dueWords.length}</b> 个错题已到期可复习<br>
            <b>${mastered}</b> 个错题已接近掌握<br>
            <span style="color:#aaa; font-size:12px;">基于 SM-2 算法：答对延长间隔，答错重置</span>
            <br>
            <button id="startReviewDueBtnInline">▶ 立即开始复习 (${Math.min(dueWords.length, 10)} 词)</button>
        </div>
    `;
    const inlineBtn = document.getElementById("startReviewDueBtnInline");
    if (inlineBtn) inlineBtn.onclick = startDueReview;
}

function renderStudyChart() {
    const canvas = document.getElementById("studyChartCanvas");
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const pad = { top: 20, right: 20, bottom: 30, left: 40 };
    const cw = W - pad.left - pad.right;
    const ch = H - pad.top - pad.bottom;

    let hist = {};
    try { hist = JSON.parse(localStorage.getItem(DAILY_STUDY_HIST_KEY)) || {}; } catch (e) {}

    const days = [];
    for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        days.push({ key, label: `${d.getMonth()+1}/${d.getDate()}`, val: hist[key] || 0 });
    }
    const maxVal = Math.max(...days.map(d => d.val), 5);

    ctx.clearRect(0, 0, W, H);

    // grid
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = pad.top + ch - (ch * i / 4);
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(Math.round(maxVal * i / 4), pad.left - 6, y + 4);
    }

    // line
    ctx.strokeStyle = "#e94560";
    ctx.lineWidth = 2;
    ctx.beginPath();
    days.forEach((d, i) => {
        const x = pad.left + cw * i / (days.length - 1 || 1);
        const y = pad.top + ch - (d.val / maxVal) * ch;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // fill
    ctx.lineTo(pad.left + cw, pad.top + ch);
    ctx.lineTo(pad.left, pad.top + ch);
    ctx.closePath();
    ctx.fillStyle = "rgba(233,69,96,0.15)";
    ctx.fill();

    // dots + labels
    days.forEach((d, i) => {
        const x = pad.left + cw * i / (days.length - 1 || 1);
        const y = pad.top + ch - (d.val / maxVal) * ch;
        if (d.val > 0) {
            ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fillStyle = "#e94560"; ctx.fill();
        }
        if (i % 2 === 0 || i === days.length - 1) {
            ctx.fillStyle = "rgba(255,255,255,0.3)";
            ctx.font = "9px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(d.label, x, pad.top + ch + 18);
        }
    });

    // target line
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.setLineDash([4, 4]);
    const targetY = pad.top + ch - (DAILY_STUDY_TARGET / maxVal) * ch;
    ctx.beginPath(); ctx.moveTo(pad.left, targetY); ctx.lineTo(W - pad.right, targetY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("目标 " + DAILY_STUDY_TARGET, W - pad.right - 60, targetY - 4);
}

function openStats() {
    renderStats();
    setTimeout(renderStudyChart, 100);
    document.getElementById("statsModal").style.display = "flex";
}
function closeStats() {
    document.getElementById("statsModal").style.display = "none";
}
document.getElementById("statsBtn").onclick = openStats;
document.getElementById("closeStatsBtn").onclick = closeStats;

// ---- 错题本 ----
function openWrongWordModal() {
    const modal = document.getElementById("wrongWordModal");
    if (!modal) return;
    modal.style.display = "flex";
    renderWrongWordList();
}
function closeWrongWordModal() {
    document.getElementById("wrongWordModal").style.display = "none";
}
function renderWrongWordList() {
    const sort = document.getElementById("wwSort").value;
    const filter = document.getElementById("wwFilter").value.trim().toLowerCase();
    document.getElementById("wwCount").innerText = `共 ${wrongWords.length} 个错题`;
    let list = [...wrongWords];
    if (filter) list = list.filter(w => w.word.toLowerCase().includes(filter));
    if (sort === "newest") list.reverse();
    else if (sort === "streak") list.sort((a, b) => (a.streak || 0) - (b.streak || 0));
    const container = document.getElementById("wwList");
    if (!list.length) {
        container.innerHTML = '<div style="text-align:center;color:#aaa;padding:30px;">🎉 暂无错题</div>';
        return;
    }
    container.innerHTML = list.map(w => {
        const streak = w.streak || 0;
        const bars = "▮".repeat(Math.min(streak, 3)) + "▯".repeat(Math.max(0, 3 - streak));
        const mastered = streak >= 3;
        return `<div class="ww-item" style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;margin:4px 0;background:rgba(255,255,255,0.05);border-radius:12px;${mastered?'opacity:0.6':''}">
            <div style="flex:1;min-width:0;">
                <div style="font-size:16px;font-weight:bold;color:var(--secondary);">${escapeHtml(w.word)}</div>
                <div style="font-size:12px;color:#aaa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(w.meaning || w.fullMeaning || "")}</div>
            </div>
            <div style="text-align:right;flex-shrink:0;margin-left:10px;">
                <div style="font-size:11px;color:#888;">掌握 ${bars}</div>
                <div style="font-size:10px;color:#666;">${w.lastReview ? new Date(w.lastReview).toLocaleDateString() : "未复习"}</div>
            </div>
        </div>`;
    }).join("");
}
document.addEventListener("change", e => {
    if (e.target.id === "wwSort" || e.target.id === "wwFilter") renderWrongWordList();
});
document.addEventListener("input", e => {
    if (e.target.id === "wwFilter") renderWrongWordList();
});
document.getElementById("wwCloseBtn").onclick = closeWrongWordModal;
document.getElementById("wwMasteredAllBtn").onclick = () => {
    const before = wrongWords.length;
    wrongWords = wrongWords.filter(w => (w.streak || 0) < 3);
    saveGame();
    renderWrongWordList();
    const removed = before - wrongWords.length;
    if (removed > 0) showInfoMessage("✅ 已清理", `移除了 ${removed} 个已掌握词`);
};
document.getElementById("startReviewDueBtn").onclick = startDueReview;

function startDueReview() {
    const due = getDueWords(10);
    if (!due.length) {
        showInfoMessage("🧠 复习", "当前没有需要复习的错题，做得很好！");
        return;
    }
    closeStats();
    startCustomReviewSession(due);
}

// 自定义复习会话（仅含到期错题）
let reviewSession = null;
function startCustomReviewSession(words) {
    reviewSession = { list: shuffleArray([...words]), idx: 0, correct: 0 };
    document.getElementById("answerModal").style.display = "flex";
    askReviewQuestion();
}
async function askReviewQuestion() {
    if (!reviewSession) return;
    if (reviewSession.idx >= reviewSession.list.length) {
        const acc = Math.round((reviewSession.correct / reviewSession.list.length) * 100);
        showInfoMessage("🎉 复习完成", `答对 ${reviewSession.correct}/${reviewSession.list.length}<br>正确率 ${acc}%`).then(() => {
            reviewSession = null;
        });
        return;
    }
    const w = reviewSession.list[reviewSession.idx];
    currentQuestionWordObj = w;
    const direction = getRandomDirection();
    const result = await showAnswerModal({
        mode: 'review', title: '🧠 错题复习', wordObj: w, direction: direction,
        currentNum: reviewSession.idx + 1, total: reviewSession.list.length, timeLimit: 30
    });
    reviewSession.idx++;
    if (result.isCorrect) reviewSession.correct++;
    askReviewQuestion();
}

// ============================================================
// 👋 新手引导
// ============================================================
const TUTORIAL_SEEN_KEY = "tutorialSeen_v1";
const TUTORIAL_STEPS = [
    {
        target: "#enterRoomBtn",
        title: "🚪 主线玩法",
        body: "点击这里进入密室。每个密室有 20 道试炼题，连续答对 20 题即可通关！"
    },
    {
        target: "#gameCenterBtn",
        title: "🎮 小游戏",
        body: "想换个方式学习？游戏中心有翻牌、猜字、听音、打字 4 种趣味玩法！"
    },
    {
        target: "#statsBtn",
        title: "📊 追踪进度",
        body: "在统计面板查看每日活动、错题复习和间隔重复。答错的词会自动按记忆曲线复习。"
    }
];
let tutorialStep = 0;
function startTutorial() {
    if (localStorage.getItem(TUTORIAL_SEEN_KEY)) return;
    if (localStorage.getItem(OPENING_SEEN_KEY)) {
        setTimeout(() => {
            tutorialStep = 0;
            showTutorialStep();
        }, 1000);
    }
}
function showTutorialStep() {
    if (tutorialStep >= TUTORIAL_STEPS.length) {
        endTutorial();
        return;
    }
    const step = TUTORIAL_STEPS[tutorialStep];
    const target = document.querySelector(step.target);
    const overlay = document.getElementById("tutorialOverlay");
    const spot = document.getElementById("tutorialSpotlight");
    const bubble = document.getElementById("tutorialBubble");
    if (!target) { tutorialStep++; showTutorialStep(); return; }
    overlay.classList.add("show");
    const rect = target.getBoundingClientRect();
    const pad = 10;
    spot.style.left = (rect.left - pad) + "px";
    spot.style.top = (rect.top - pad) + "px";
    spot.style.width = (rect.width + pad * 2) + "px";
    spot.style.height = (rect.height + pad * 2) + "px";
    bubble.innerHTML = `
        <h4>${step.title}</h4>
        <div>${step.body}</div>
        <div class="tt-buttons">
            <button class="tt-skip" id="ttSkip">跳过引导</button>
            <div>
                <span style="color:#aaa; font-size:12px; margin-right:8px;">${tutorialStep+1}/${TUTORIAL_STEPS.length}</span>
                <button class="tt-next" id="ttNext">${tutorialStep === TUTORIAL_STEPS.length - 1 ? "完成" : "下一步 →"}</button>
            </div>
        </div>
    `;
    // 气泡位置
    const bw = 320, bh = 160;
    let bx = rect.left + rect.width / 2 - bw / 2;
    let by = rect.bottom + 20;
    if (by + bh > window.innerHeight) by = rect.top - bh - 20;
    if (bx < 10) bx = 10;
    if (bx + bw > window.innerWidth - 10) bx = window.innerWidth - bw - 10;
    bubble.style.left = bx + "px";
    bubble.style.top = by + "px";
    document.getElementById("ttNext").onclick = () => { tutorialStep++; showTutorialStep(); };
    document.getElementById("ttSkip").onclick = endTutorial;
}
function endTutorial() {
    localStorage.setItem(TUTORIAL_SEEN_KEY, "1");
    document.getElementById("tutorialOverlay").classList.remove("show");
}

// 注：新手引导启动已移至 playOpeningAnimation 内部完成

// ============================================================
// 🔥 已有彩蛋：完美试炼 / 通关时的彩带触发
// ============================================================

// ============================================================
// 🔍 找词游戏
// ============================================================
let wsState = null;

function openWordSearchGame() {
    if (tickets < 1) { showInfoMessage("🎫 门票不足", "需要 1 张门票开始找词游戏。"); return; }
    tickets--; updateTicketUI(); saveGame();
    document.getElementById("wordSearchModal").style.display = "flex";
    startWordSearchRound();
}

function startWordSearchRound() {
    const pool = getDailyGameWords();
    if (pool.length < 6) { showInfoMessage("❌ 词池不足", "每日词池至少需要 6 个单词"); return; }
    // 选 6 个长度 3-8 的英文单词
    const candidates = [];
    const seen = new Set();
    for (const w of shuffleArray([...pool])) {
        const cleaned = w.word.toUpperCase().replace(/[^A-Z]/g, "");
        if (cleaned.length >= 3 && cleaned.length <= 8 && !seen.has(cleaned)) {
            seen.add(cleaned);
            candidates.push(cleaned);
            if (candidates.length >= 6) break;
        }
    }
    if (candidates.length < 4) { showInfoMessage("❌ 词库不足", "可用英文单词少于 4 个"); return; }

    const gridSize = 10;
    const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(""));
    const placements = [];
    const dirs = [[0, 1], [1, 0]];

    for (const word of candidates) {
        let placed = false;
        // 正向尝试
        for (let attempt = 0; attempt < 150 && !placed; attempt++) {
            const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)];
            const maxR = dr === 0 ? gridSize : gridSize - word.length + 1;
            const maxC = dc === 0 ? gridSize : gridSize - word.length + 1;
            if (maxR <= 0 || maxC <= 0) continue;
            const r = Math.floor(Math.random() * maxR);
            const c = Math.floor(Math.random() * maxC);
            let can = true;
            for (let i = 0; i < word.length; i++) {
                const ch = grid[r + dr * i][c + dc * i];
                if (ch && ch !== word[i]) { can = false; break; }
            }
            if (can) {
                for (let i = 0; i < word.length; i++) grid[r + dr * i][c + dc * i] = word[i];
                placements.push({ word, start: [r, c], dir: [dr, dc], length: word.length });
                placed = true;
            }
        }
        // 反向尝试
        if (!placed) {
            const rev = word.split("").reverse().join("");
            for (let attempt = 0; attempt < 150 && !placed; attempt++) {
                const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)];
                const maxR = dr === 0 ? gridSize : gridSize - rev.length + 1;
                const maxC = dc === 0 ? gridSize : gridSize - rev.length + 1;
                if (maxR <= 0 || maxC <= 0) continue;
                const r = Math.floor(Math.random() * maxR);
                const c = Math.floor(Math.random() * maxC);
                let can = true;
                for (let i = 0; i < rev.length; i++) {
                    const ch = grid[r + dr * i][c + dc * i];
                    if (ch && ch !== rev[i]) { can = false; break; }
                }
                if (can) {
                    for (let i = 0; i < rev.length; i++) grid[r + dr * i][c + dc * i] = rev[i];
                    placements.push({ word, start: [r, c], dir: [dr, dc], length: rev.length });
                    placed = true;
                }
            }
        }
    }

    // 填随机字母
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            if (!grid[r][c]) grid[r][c] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        }
    }

    if (wsState && wsState.timer) clearInterval(wsState.timer);
    // 建立 word → 中文释义 映射
    const wordMeanings = {};
    for (const p of pool) {
        const key = p.word.toUpperCase().replace(/[^A-Z]/g, "");
        if (!wordMeanings[key]) wordMeanings[key] = p.meaning || p.fullMeaning || "";
    }
    wsState = {
        grid, gridSize,
        words: placements.map(p => p.word),
        placements,
        meanings: wordMeanings,
        found: new Set(),
        time: 180,
        timer: null
    };

    document.getElementById("wsTotal").innerText = wsState.words.length;
    document.getElementById("wsFound").innerText = "0";
    document.getElementById("wsTime").innerText = "180";
    renderWSGrid();
    renderWSWordList();
    wsState.timer = setInterval(() => {
        wsState.time--;
        document.getElementById("wsTime").innerText = wsState.time;
        if (wsState.time <= 0) {
            clearInterval(wsState.timer);
            finishWSGame();
        }
    }, 1000);
}

function renderWSGrid() {
    const gridEl = document.getElementById("wsGrid");
    gridEl.className = "ws-grid cols-10";
    gridEl.innerHTML = "";
    for (let r = 0; r < wsState.gridSize; r++) {
        for (let c = 0; c < wsState.gridSize; c++) {
            const cell = document.createElement("div");
            cell.className = "ws-cell";
            cell.innerText = wsState.grid[r][c];
            cell.dataset.r = r;
            cell.dataset.c = c;
            // 悬停显示该字母所在某个单词的中文
            const letter = wsState.grid[r][c];
            const wordHere = wsState.placements.find(p => {
                const [sr, sc] = p.start;
                const [dr, dc] = p.dir;
                for (let i = 0; i < p.length; i++) {
                    if (sr + dr * i === r && sc + dc * i === c) return true;
                }
                return false;
            });
            if (wordHere) cell.title = wordHere.word + " = " + (wsState.meanings[wordHere.word] || "");
            cell.onclick = () => wsCellClick(r, c);
            gridEl.appendChild(cell);
        }
    }
}

function renderWSWordList() {
    const list = document.getElementById("wsWordList");
    list.innerHTML = "";
    wsState.words.forEach(w => {
        const span = document.createElement("span");
        span.className = "ws-word" + (wsState.found.has(w) ? " found" : "");
        const zh = wsState.meanings[w] || "";
        span.innerHTML = `<div class="ws-word-en">${w}</div><div class="ws-word-zh">${escapeHtml(zh)}</div>`;
        list.appendChild(span);
    });
}

function wsCellClick(r, c) {
    if (!wsState) return;
    // 检查 (r,c) 是否是某个未找到单词的首或尾
    for (const p of wsState.placements) {
        if (wsState.found.has(p.word)) continue;
        const [sr, sc] = p.start;
        const [dr, dc] = p.dir;
        const er = sr + dr * (p.length - 1);
        const ec = sc + dc * (p.length - 1);
        if ((r === sr && c === sc) || (r === er && c === ec)) {
            // 找到了！
            wsState.found.add(p.word);
            for (let i = 0; i < p.length; i++) {
                const nr = sr + dr * i, nc = sc + dc * i;
                const cellEl = document.querySelector(`.ws-cell[data-r='${nr}'][data-c='${nc}']`);
                if (cellEl) cellEl.classList.add("found");
            }
            renderWSWordList();
            document.getElementById("wsFound").innerText = wsState.found.size;
            playBeep("correct");
            fireSparkles(window.innerWidth / 2, window.innerHeight / 2, 8);
            if (wsState.found.size >= wsState.words.length) {
                clearInterval(wsState.timer);
                setTimeout(finishWSGame, 600);
            }
            return;
        }
    }
    // 没匹配到任何单词 — 给个错误反馈
    const cellEl = document.querySelector(`.ws-cell[data-r='${r}'][data-c='${c}']`);
    if (cellEl) {
        cellEl.classList.add("selected");
        setTimeout(() => cellEl.classList.remove("selected"), 200);
    }
}

function finishWSGame() {
    if (wsState && wsState.timer) clearInterval(wsState.timer);
    const found = wsState ? wsState.found.size : 0;
    const total = wsState ? wsState.words.length : 0;
    const timeLeft = wsState ? wsState.time : 0;
    let reward = found * 2;
    if (found === total && total > 0) reward += 5;
    if (timeLeft > 60) reward += 2;
    tickets += reward; updateTicketUI(); saveGame();
    const msg = found === total
        ? `🎉 全部找到！奖励 +${reward} 🎫`
        : `找到 ${found}/${total}<br>剩余时间 ${timeLeft}秒<br>奖励 +${reward} 🎫`;
    fireConfetti(found === total ? 50 : 20);
    showGameEndModal("🔍 找词结束", msg).then(action => {
        document.getElementById("wordSearchModal").style.display = "none";
        wsState = null;
        if (action === "retry") setTimeout(() => openWordSearchGame(), 100);
    });
}

document.getElementById("wsRestartBtn").onclick = () => {
    if (!wsState) return;
    if (wsState.timer) clearInterval(wsState.timer);
    startWordSearchRound();
};
document.getElementById("wsCloseBtn").onclick = () => {
    if (wsState && wsState.timer) clearInterval(wsState.timer);
    wsState = null;
    document.getElementById("wordSearchModal").style.display = "none";
};

// ============================================================
// 🏰 单词塔防
// ============================================================
let tdState = null;

function openTowerDefenseGame() {
    if (tickets < 2) { showInfoMessage("🎫 门票不足", "需要 2 张门票开始塔防游戏。"); return; }
    tickets--; updateTicketUI(); saveGame();
    document.getElementById("towerDefenseModal").style.display = "flex";
    startTDRound();
}

function startTDRound() {
    if (tdState && tdState.moveTimer) clearInterval(tdState.moveTimer);
    document.getElementById("tdEnemies").innerHTML = "";
    tdState = {
        lives: 3,
        kills: 0,
        wave: 0,
        maxWave: 15,
        enemies: [],
        currentEnemy: null,
        moveTimer: null,
        busy: false
    };
    document.getElementById("tdLives").innerText = 3;
    document.getElementById("tdKills").innerText = 0;
    document.getElementById("tdWave").innerText = 0;
    spawnTDEnemy();
}

function spawnTDEnemy() {
    if (!tdState) return;
    if (tdState.busy) return;
    if (tdState.wave >= tdState.maxWave) { finishTDGame(); return; }
    if (tdState.lives <= 0) { finishTDGame(); return; }
    tdState.wave++;
    document.getElementById("tdWave").innerText = tdState.wave;
    document.getElementById("tdWaveInfo").innerText = `👾 第 ${tdState.wave} 波`;

    const pool = getDailyGameWords();
    if (pool.length < 4) { showInfoMessage("❌ 词池不足", "每日词池至少需要 4 个单词"); return; }
    const shuffled = shuffleArray([...pool]);
    const correct = shuffled[0];
    const distractors = shuffled.slice(1, 4);
    const options = shuffleArray([correct, ...distractors]);

    const stage = document.getElementById("tdEnemies");
    const enemy = document.createElement("div");
    enemy.className = "td-enemy";
    const zh = correct.meaning || correct.fullMeaning || "";
    enemy.innerHTML = `
        <div class="td-enemy-hp"><div class="td-enemy-hp-fill" style="width:100%"></div></div>
        <div class="td-en-en">${escapeHtml(correct.word)}</div>
        <div class="td-en-zh">${escapeHtml(zh)}</div>
    `;
    enemy.dataset.id = tdState.wave;
    enemy.dataset.word = correct.word;
    enemy.dataset.zh = zh;
    stage.innerHTML = "";
    stage.appendChild(enemy);

    // 4 个中文释义选项
    const optsRow = document.getElementById("tdOptionsRow");
    optsRow.innerHTML = "";
    options.forEach(o => {
        const b = document.createElement("button");
        b.className = "td-option";
        b.innerText = o.meaning || o.fullMeaning || o.word;
        b.dataset.word = o.word;
        b.onclick = () => tdAnswer(b, correct);
        optsRow.appendChild(b);
    });

    // 移动动画
    let pos = 100;
    tdState.busy = true;
    tdState.moveTimer = setInterval(() => {
        pos -= 0.35;
        enemy.style.left = pos + "%";
        if (pos <= 5) {
            clearInterval(tdState.moveTimer);
            tdState.lives--;
            document.getElementById("tdLives").innerText = Math.max(0, tdState.lives);
            playBeep("wrong");
            tdState.busy = false;
            if (tdState.lives <= 0) {
                finishTDGame();
            } else {
                setTimeout(spawnTDEnemy, 600);
            }
        }
    }, 60);
}

function tdAnswer(btn, correct) {
    if (!tdState || !tdState.busy) return;
    clearInterval(tdState.moveTimer);
    tdState.busy = false;
    const w = btn.dataset.word;
    if (w === correct.word) {
        tdState.kills = (tdState.kills || 0) + 1;
        document.getElementById("tdKills").innerText = tdState.kills;
        playBeep("correct");
        btn.classList.add("correct");
        const ex = renderExampleBlock(correct);
        const zh = correct.meaning || correct.fullMeaning || "";
        const hint = document.getElementById("tdHint");
        hint.innerHTML = `✅ 命中！<br><b>${escapeHtml(correct.word)}</b> = ${escapeHtml(zh)}${ex ? "<br>" + ex : ""}`;
        setTimeout(spawnTDEnemy, 1500);
    } else {
        tdState.lives = Math.max(0, tdState.lives - 1);
        document.getElementById("tdLives").innerText = tdState.lives;
        playBeep("wrong");
        btn.classList.add("wrong");
        const ex = renderExampleBlock(correct);
        const zh = correct.meaning || correct.fullMeaning || "";
        const hint = document.getElementById("tdHint");
        hint.innerHTML = `❌ 正确：<b>${escapeHtml(correct.word)}</b> = ${escapeHtml(zh)}${ex ? "<br>" + ex : ""}`;
        document.querySelectorAll(".td-option").forEach(b => {
            if (b.dataset.word === correct.word) b.classList.add("correct");
        });
        if (tdState.lives <= 0) {
            setTimeout(finishTDGame, 1800);
        } else {
            setTimeout(spawnTDEnemy, 2000);
        }
    }
}

function finishTDGame() {
    if (tdState && tdState.moveTimer) clearInterval(tdState.moveTimer);
    const kills = tdState ? (tdState.kills || 0) : 0;
    const wave = tdState ? tdState.wave : 0;
    let reward = kills * 2 + (wave >= 15 ? 5 : 0);
    tickets += reward; updateTicketUI(); saveGame();
    fireConfetti(wave >= 15 ? 60 : 20);
    showGameEndModal("🏰 塔防结束",
        `击杀 ${kills} / ${wave} 波<br>奖励 +${reward} 🎫`
    ).then(action => {
        tdState = null;
        document.getElementById("towerDefenseModal").style.display = "none";
        renderGameCenter();
        if (action === "retry") setTimeout(() => openTowerDefenseGame(), 100);
    });
}

// 翻译弹窗
function showTranslatePopup(text, x, y) {
    const existing = document.getElementById("translatePopup");
    if (existing) existing.remove();
    const popup = document.createElement("div");
    popup.id = "translatePopup";
    popup.className = "translate-popup";
    popup.innerText = "🇨🇳 " + text;
    // 防止超出屏幕
    popup.style.left = "0px";
    popup.style.top = "0px";
    document.body.appendChild(popup);
    const w = popup.offsetWidth, h = popup.offsetHeight;
    let finalX = x - w / 2;
    let finalY = y;
    if (finalX < 8) finalX = 8;
    if (finalX + w > window.innerWidth - 8) finalX = window.innerWidth - w - 8;
    if (finalY + h > window.innerHeight - 8) finalY = y - h - 30;
    popup.style.left = finalX + "px";
    popup.style.top = finalY + "px";
    requestAnimationFrame(() => popup.classList.add("show"));
    setTimeout(() => {
        if (!popup.parentNode) return;
        popup.classList.remove("show");
        setTimeout(() => popup.remove(), 250);
    }, 2500);
}

// =============== 记忆翻牌 ===============
let mmState = null;

function openMemoryMatchGame(game) {
    if (tickets < game.cost) {
        showInfoMessage("🎫 门票不足", `需要 ${game.cost} 张门票才能开始游戏。`);
        return;
    }
    const modal = document.getElementById("memoryMatchModal");
    modal.dataset.cost = game.cost;
    modal.style.display = "flex";
    startMemoryRound(currentRoomLevel || 1);
}

function startMemoryRound(level) {
    const lvCfg = GAMES_CONFIG[0].levels.find(l => l.id === level) || GAMES_CONFIG[0].levels[0];
    const pairCount = lvCfg.pairs;
    const pool = getDailyPoolAllWords();
    let candidates = pool.length >= pairCount
        ? shuffleArray([...pool]).slice(0, pairCount)
        : shuffleArray([...pool]).slice(0, Math.min(pairCount, pool.length));
    if (candidates.length < pairCount) {
        const extra = getDailyGameWords().filter(w => !candidates.find(c => c.word === w.word));
        shuffleArray(extra);
        while (candidates.length < pairCount && extra.length) {
            candidates.push(extra.shift());
        }
    }
    pairCountActual = candidates.length;
    const cards = [];
    candidates.forEach((w, i) => {
        cards.push({ id: i, type: "en", text: w.word, pair: i });
        cards.push({ id: i + 1000, type: "zh", text: w.meaning || w.fullMeaning || w.word, pair: i });
    });
    shuffleArray(cards);

    mmState = {
        cards,
        level,
        pairCount: pairCountActual,
        flipped: [],
        matched: new Set(),
        moves: 0,
        startTime: Date.now(),
        timer: null,
        locked: false,
        _lastFlip: 0
    };
    renderMemoryGrid();
    document.getElementById("mmTotalPairs").innerText = mmState.pairCount;
    document.getElementById("mmPairs").innerText = "0";
    document.getElementById("mmMoves").innerText = "0";
    document.getElementById("mmTime").innerText = "0";
    if (mmState.timer) clearInterval(mmState.timer);
    mmState.timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - mmState.startTime) / 1000);
        document.getElementById("mmTime").innerText = elapsed;
    }, 250);
}

let pairCountActual = 0;

function renderMemoryGrid() {
    const grid = document.getElementById("memoryGrid");
    grid.innerHTML = "";
    const n = mmState.cards.length;
    if (n <= 6)        grid.className = "memory-grid size-6";
    else if (n <= 8)   grid.className = "memory-grid size-8";
    else if (n <= 12)  grid.className = "memory-grid size-12";
    else               grid.className = "memory-grid size-18";
    mmState.cards.forEach((c, idx) => {
        const card = document.createElement("div");
        card.className = "mem-card";
        card.dataset.idx = idx;
        const backTxt = c.type === "en"
            ? `<div><div class="en">${escapeHtml(c.text)}</div></div>`
            : `<div><div class="zh">${escapeHtml(c.text)}</div></div>`;
        card.innerHTML = `
            <div class="mem-face front"></div>
            <div class="mem-face back">${backTxt}</div>
        `;
        card.onclick = () => flipCard(idx, card);
        grid.appendChild(card);
    });
}

function flipCard(idx, cardEl) {
    if (!mmState || mmState.locked) return;
    if (mmState.flipped.includes(idx)) return;
    if (mmState.matched.has(idx)) return;
    const now = Date.now();
    if (mmState._lastFlip && now - mmState._lastFlip < 300) return;
    mmState._lastFlip = now;
    mmState.flipped.push(idx);
    cardEl.classList.add("flipped");
    if (mmState.flipped.length === 2) {
        mmState.moves++;
        document.getElementById("mmMoves").innerText = mmState.moves;
        mmState.locked = true;
        const [a, b] = mmState.flipped;
        const ca = mmState.cards[a], cb = mmState.cards[b];
        if (ca.pair === cb.pair && ca.type !== cb.type) {
            // 配对成功
            mmState.matched.add(a);
            mmState.matched.add(b);
            setTimeout(() => {
                document.querySelectorAll(`.mem-card[data-idx='${a}'], .mem-card[data-idx='${b}']`)
                    .forEach(el => el.classList.add("matched"));
                document.getElementById("mmPairs").innerText = mmState.matched.size / 2;
                mmState.flipped = [];
                mmState.locked = false;
                if (mmState.matched.size >= mmState.cards.length) finishMemoryGame();
            }, 400);
        } else {
            // 配对失败
            setTimeout(() => {
                document.querySelectorAll(`.mem-card[data-idx='${a}'], .mem-card[data-idx='${b}']`)
                    .forEach(el => { el.classList.add("shake"); });
                setTimeout(() => {
                    document.querySelectorAll(`.mem-card[data-idx='${a}'], .mem-card[data-idx='${b}']`)
                        .forEach(el => { el.classList.remove("flipped","shake"); });
                    mmState.flipped = [];
                    mmState.locked = false;
                }, 700);
            }, 600);
        }
    }
}

function finishMemoryGame() {
    if (!mmState) return;
    clearInterval(mmState.timer);
    const elapsed = Math.floor((Date.now() - mmState.startTime) / 1000);
    const moves = mmState.moves;
    const minMoves = mmState.pairCount; // 理论最少步数
    setGameBest("memoryMatch", elapsed, moves);

    // 奖励计算
    const cost = parseInt(document.getElementById("memoryMatchModal").dataset.cost || "1");
    tickets -= cost;
    let reward = 0;
    let stars = "🥉";
    if (moves <= minMoves + 2)      { reward = 5; stars = "🥇 完美"; }
    else if (moves <= minMoves * 2) { reward = 3; stars = "🥈 优秀"; }
    else                             { reward = 1; stars = "🥉 良好"; }
    if (elapsed < 30 && mmState.pairCount >= 12) reward += 1;
    tickets += reward;
    updateTicketUI();
    saveGame();

    // 播放音效
    playBeep("correct");

    showGameEndModal("🎉 通关！", `${stars} 用时 ${elapsed} 秒 / ${moves} 步<br>扣 ${cost}🎫，奖励 ${reward}🎫<br>当前门票：${tickets}`).then(action => {
        closeMemoryGame();
        renderGameCenter();
        if (action === "retry") setTimeout(() => {
            const gameItem = GAMES_CONFIG.find(g => g.id === "memoryMatch");
            if (gameItem) openMemoryMatchGame(gameItem);
        }, 100);
    });
}

function closeMemoryGame() {
    if (mmState && mmState.timer) clearInterval(mmState.timer);
    mmState = null;
    document.getElementById("memoryMatchModal").style.display = "none";
}

// =============== 游戏中心：GAMES_CONFIG + 统计 + 渲染 ===============
const GAMES_CONFIG = [
    {
        id: "memoryMatch", name: "记忆翻牌", enName: "Memory Match", enDesc: "Flip cards to match English words with their meanings.",
        icon: "🃏", cost: 1, available: true,
        levels: [
            { id: 1, pairs: 6, label: "Lv.1 入门" },
            { id: 2, pairs: 8, label: "Lv.2 进阶" },
            { id: 3, pairs: 12, label: "Lv.3 高级" }
        ],
        launch: () => openMemoryMatchGame(GAMES_CONFIG[0])
    },
    {
        id: "typingRace", name: "打字竞速", enName: "Typing Race", enDesc: "Type falling words before they hit the ground.",
        icon: "⌨️", cost: 1, available: true,
        launch: () => openTypingGame()
    },
    {
        id: "listenQuiz", name: "听音抢答", enName: "Listening Quiz", enDesc: "Listen to pronunciation and pick the correct meaning.",
        icon: "🎧", cost: 1, available: true,
        launch: () => openListenGame()
    },
    {
        id: "hangman", name: "猜字游戏", enName: "Hangman", enDesc: "Guess the word by picking letters one at a time.",
        icon: "🔤", cost: 1, available: true,
        launch: () => openHangmanGame()
    },
    {
        id: "wordSearch", name: "找词游戏", enName: "Word Search", enDesc: "Find hidden words in a letter grid.",
        icon: "🔍", cost: 1, available: true,
        launch: () => openWordSearchGame()
    },
    {
        id: "towerDefense", name: "单词塔防", enName: "Tower Defense", enDesc: "Defend your base by choosing correct Chinese meanings.",
        icon: "🏰", cost: 2, available: true,
        launch: () => openTowerDefenseGame()
    }
];

const GAME_STATS_KEY = "gameCenterStats_v1";
function getGameStats() {
    try { return JSON.parse(localStorage.getItem(GAME_STATS_KEY)) || {}; }
    catch (e) { return {}; }
}
function getGameBest(id) {
    const s = getGameStats();
    return s[id] || { plays: 0, bestTime: null, bestMoves: null };
}
function setGameBest(id, time, moves) {
    const s = getGameStats();
    const cur = s[id] || { plays: 0, bestTime: null, bestMoves: null };
    cur.plays = (cur.plays || 0) + 1;
    if (time != null) {
        if (cur.bestTime == null || time < cur.bestTime) cur.bestTime = time;
    }
    if (moves != null) {
        if (cur.bestMoves == null || moves < cur.bestMoves) cur.bestMoves = moves;
    }
    s[id] = cur;
    localStorage.setItem(GAME_STATS_KEY, JSON.stringify(s));
}

function renderGameCenter() {
    const grid = document.getElementById("gameCenterGrid");
    if (!grid) return;
    grid.innerHTML = "";
    GAMES_CONFIG.forEach(g => {
        const best = getGameBest(g.id);
        const bestHtml = best.plays > 0
            ? (best.bestTime != null ? `最佳 ${best.bestTime}秒` : `已玩 ${best.plays}次`)
            : `未玩过`;
        const div = document.createElement("div");
        div.className = "game-card" + (g.available ? "" : " soon");
        div.innerHTML = `
            <div class="game-icon">${g.icon}</div>
            <div class="game-name">${escapeHtml(g.name)}</div>
            <div class="game-en" data-zh="${escapeHtml(g.name)}">${escapeHtml(g.enName)} 🔍</div>
            <div class="game-en-desc" data-zh="${escapeHtml(g.name + "：通过游戏学习英文单词 " + g.enName + "。")}">${escapeHtml(g.enDesc)}</div>
            <div class="game-meta">
                <span class="game-cost">🎫 ${g.cost}</span>
                <span class="game-best">${bestHtml}</span>
            </div>
            ${g.available ? "" : '<div class="lock-overlay">🔒</div>'}
        `;
        if (g.available) {
            div.onclick = () => {
                if (g.id === "memoryMatch") openMemoryMatchGame(g);
                else if (typeof g.launch === "function") g.launch();
            };
        } else {
            div.onclick = () => showInfoMessage("🔒 敬请期待", "该游戏开发中，敬请期待后续更新！");
        }
        div.querySelectorAll(".game-en, .game-en-desc").forEach(en => {
            en.onclick = (e) => {
                e.stopPropagation();
                const rect = en.getBoundingClientRect();
                showTranslatePopup(en.dataset.zh, rect.left + rect.width / 2, rect.bottom + 6);
            };
        });
        grid.appendChild(div);
    });
}

document.getElementById("mmRestartBtn").onclick = () => {
    if (!mmState) return;
    if (mmState.timer) clearInterval(mmState.timer);
    startMemoryRound(mmState.level);
};
document.getElementById("mmCloseBtn").onclick = () => { closeMemoryGame(); };

document.getElementById("tdCloseBtn").onclick = () => {
    if (tdState && tdState.moveTimer) clearInterval(tdState.moveTimer);
    tdState = null;
    document.getElementById("towerDefenseModal").style.display = "none";
};

// 🎮 游戏中心按钮绑定
const gameCenterModal = document.getElementById("gameCenterModal");
gameCenterBtn.onclick = () => {
    try {
        renderGameCenter();
        gameCenterModal.style.display = "flex";
    } catch (e) {
        console.error("游戏中心打开失败:", e);
        showInfoMessage("❌ 错误", "游戏中心打开失败：" + e.message);
    }
};
document.getElementById("closeGameCenterBtn").onclick = () => {
    gameCenterModal.style.display = "none";
};

// ============================================================
// ✕ 全局：为所有 .modal 自动注入右上角关闭按钮
// ============================================================
function closeModalById(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = "none";
    // 触发自定义事件，供游戏状态清理
    el.dispatchEvent(new CustomEvent("modal:close", { bubbles: true }));
    // 关闭后清理相关游戏状态
    cleanupOnModalClose(id);
}

// 各模态关闭时的状态清理映射
function cleanupOnModalClose(modalId) {
    switch (modalId) {
        case "typingModal":
            if (typeof tpState !== "undefined" && tpState) {
                tpState.running = false;
                if (tpState._spawner) clearInterval(tpState._spawner);
                if (tpState._timer) clearInterval(tpState._timer);
                tpState = null;
            }
            break;
        case "towerDefenseModal":
            if (typeof tdState !== "undefined" && tdState) {
                if (tdState.moveTimer) clearInterval(tdState.moveTimer);
                tdState = null;
            }
            break;
        case "wordSearchModal":
            if (typeof wsState !== "undefined" && wsState) {
                if (wsState.timer) clearInterval(wsState.timer);
                wsState = null;
            }
            break;
        case "memoryMatchModal":
            if (typeof mmState !== "undefined" && mmState) {
                if (mmState.timer) clearInterval(mmState.timer);
                mmState = null;
            }
            break;
        case "hangmanModal":
            if (typeof hmState !== "undefined" && hmState) hmState = null;
            break;
        case "listenModal":
            if (typeof lsState !== "undefined" && lsState) lsState = null;
            break;
    }
}
function initModalCloseButtons() {
    const modals = document.querySelectorAll(".modal");
    modals.forEach(modal => {
        const content = modal.querySelector(".modal-content");
        if (!content) return;
        // 避免重复注入
        if (content.querySelector(".modal-close")) return;
        const closeBtn = document.createElement("button");
        closeBtn.className = "modal-close";
        closeBtn.type = "button";
        closeBtn.title = "关闭";
        closeBtn.setAttribute("aria-label", "关闭弹窗");
        closeBtn.innerText = "✕";
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            closeModalById(modal.id);
        };
        // 插到 modal-content 第一个子元素之前
        content.insertBefore(closeBtn, content.firstChild);
    });
    // 点击遮罩层关闭（仅对非剧情类弹窗有效）
    modals.forEach(modal => {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                // 弹窗专属：不响应遮罩关闭的列表
                const noOverlayClose = ["answerModal", "openingOverlay"];
                if (noOverlayClose.includes(modal.id)) return;
                closeModalById(modal.id);
            }
        });
    });
    console.log("✕ 已为 " + modals.length + " 个模态框注入关闭按钮");
}
initModalCloseButtons();

// ============================================================
// 📖 词汇学习室（Vocabulary Learning Room）
// ============================================================
const DAILY_STUDY_KEY = "dailyStudy_v1";
const DAILY_STUDY_HIST_KEY = "studyHistory_v1";
const DAILY_STUDY_TARGET = 100;
const DAILY_CELEBRATED_KEY = "dailyCelebrated_v1";
let vrFilterLevel = "all";

function getDailyStudy() {
    try {
        const d = JSON.parse(localStorage.getItem(DAILY_STUDY_KEY)) || {};
        const today = new Date().toISOString().slice(0, 10);
        if (d.date !== today) return { date: today, count: 0, words: [] };
        return d;
    } catch (e) { return { date: new Date().toISOString().slice(0, 10), count: 0, words: [] }; }
}

function saveDailyStudy(d) {
    localStorage.setItem(DAILY_STUDY_KEY, JSON.stringify(d));
    try {
        const hist = JSON.parse(localStorage.getItem(DAILY_STUDY_HIST_KEY)) || {};
        hist[d.date] = d.count;
        localStorage.setItem(DAILY_STUDY_HIST_KEY, JSON.stringify(hist));
    } catch (e) {}
}

function markWordStudiedToday(word) {
    const d = getDailyStudy();
    const wordLower = word.toLowerCase();
    const was = d.count;
    if (!d.words.includes(wordLower)) {
        d.words.push(wordLower);
        d.count = d.words.length;
        saveDailyStudy(d);
        if (was < DAILY_STUDY_TARGET && d.count >= DAILY_STUDY_TARGET) {
            const celebrated = localStorage.getItem(DAILY_CELEBRATED_KEY);
            const today = new Date().toISOString().slice(0, 10);
            if (celebrated !== today) {
                localStorage.setItem(DAILY_CELEBRATED_KEY, today);
                setTimeout(() => {
                    fireConfetti(80);
                    playBeep("correct");
                    showInfoMessage("🎉 每日目标达成！", `今日已学习 <b>${DAILY_STUDY_TARGET}</b> 词！<br>继续保持！💪`);
                }, 300);
            }
        }
    }
    updateVrDailyUI();
}

function getTodayStudyCount() {
    return getDailyStudy().count;
}

function openVocabRoom() {
    if (!allWords) { showInfoMessage("⚠️ 提示", "请等待词库加载完成。"); return; }
    const modal = document.getElementById("vocabRoomModal");
    if (!modal) return;
    const lib = availableLibraries.find(l => l.id === activeLibraryId);
    document.getElementById("vrLibName").innerText = lib ? `${lib.icon} ${lib.name} - ${lib.nameFull}` : "当前词库";
    updateVrDailyUI();
    renderVocabWordList();
    modal.style.display = "flex";
}

function updateVrDailyUI() {
    const d = getDailyStudy();
    document.getElementById("vrDailyCount").innerText = d.count;
    const stats = getMasteryStats(activeLibraryId, allWords);
    document.getElementById("vrMastered").innerText = stats.mastered;
    document.getElementById("vrMasteryRate").innerText = stats.percent + "%";
    document.getElementById("vrProgressFill").style.width = stats.percent + "%";
    document.getElementById("vrProgressText").innerText = `${stats.mastered} / ${stats.total} 词`;
}

function renderVocabWordList() {
    const container = document.getElementById("vrWordList");
    if (!container) return;
    const allWordList = [];
    for (const lv of [1, 2, 3]) {
        for (const w of (allWords[lv] || [])) allWordList.push({ ...w, level: lv });
    }
    if (!allWordList.length) {
        container.innerHTML = '<div class="vr-no-words">词库为空</div>';
        return;
    }
    let filtered = [...allWordList];
    if (vrFilterLevel !== "all") {
        filtered = filtered.filter(w => w.level === parseInt(vrFilterLevel));
    }
    const search = (document.getElementById("vrSearch").value || "").trim().toLowerCase();
    if (search) {
        filtered = filtered.filter(w => w.word.toLowerCase().includes(search) || (w.meaning || "").includes(search));
    }
    if (!filtered.length) {
        container.innerHTML = '<div class="vr-no-words">没有匹配的单词</div>';
        return;
    }
    const mastered = getLibProgress(activeLibraryId).mastered;
    const dailyWords = new Set(getDailyStudy().words.map(w => w.toLowerCase()));
    container.innerHTML = "";
    filtered.forEach(w => {
        const isMastered = mastered[w.word.toLowerCase()];
        const studiedToday = dailyWords.has(w.word.toLowerCase());
        const card = document.createElement("div");
        card.className = "vr-word-card";
        card.innerHTML = `
            <div class="vr-w">${escapeHtml(w.word)}</div>
            <div class="vr-m">${escapeHtml(w.meaning || "")}</div>
            <div class="vr-actions">
                <span class="vr-level-badge">Lv.${w.level}</span>
                <button class="vr-speak" title="听发音">🔊</button>
                <button class="vr-toggle ${isMastered ? 'mastered' : ''}" title="${isMastered ? '已掌握' : '标记已掌握'}">${isMastered ? '✓' : '○'}</button>
            </div>
        `;
        card.querySelector(".vr-speak").onclick = (e) => { e.stopPropagation(); speakText(w.word); };
        card.querySelector(".vr-toggle").onclick = (e) => {
            e.stopPropagation();
            if (isMastered) {
                unmarkWordMastered(activeLibraryId, w.word);
            } else {
                markWordMastered(activeLibraryId, w.word);
                markWordStudiedToday(w.word);
            }
            renderVocabWordList();
            updateVrDailyUI();
            renderLibraryPicker();
        };
        if (!studiedToday && !isMastered) {
            card.style.borderLeft = "3px solid var(--secondary, #f39c12)";
        }
        container.appendChild(card);
    });
}

// 词汇学习室事件绑定
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("vocabRoomBtn");
    if (btn) btn.onclick = openVocabRoom;
});
if (document.readyState !== "loading") {
    const btn = document.getElementById("vocabRoomBtn");
    if (btn) btn.onclick = openVocabRoom;
}

document.querySelectorAll(".vr-tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".vr-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        vrFilterLevel = tab.dataset.level;
        renderVocabWordList();
    });
});

const vrSearch = document.getElementById("vrSearch");
if (vrSearch) vrSearch.addEventListener("input", () => renderVocabWordList());

const vrCloseBtn = document.getElementById("vrCloseBtn");
if (vrCloseBtn) vrCloseBtn.onclick = () => {
    document.getElementById("vocabRoomModal").style.display = "none";
};

// ============================================================
// 📦 每日 100 词游戏池系统
// ============================================================
const DAILY_POOL_KEY = "dailyWordPool_v1";
const DAILY_POOL_SIZE = 100;

function getDailyPool() {
    try {
        return JSON.parse(localStorage.getItem(DAILY_POOL_KEY)) || null;
    } catch (e) { return null; }
}

function saveDailyPool(pool) {
    localStorage.setItem(DAILY_POOL_KEY, JSON.stringify(pool));
}

function initDailyPool() {
    if (!allWords) return;
    const pool = getDailyPool();
    const today = new Date().toISOString().slice(0, 10);
    if (pool && pool.libId === activeLibraryId && pool.date === today) {
        return pool;
    }
    // 创建新池
    return resetDailyPool();
}

function resetDailyPool() {
    if (!allWords) return null;
    const allWordList = [];
    for (const lv of getDifficultyLevels()) {
        for (const w of (allWords[lv] || [])) allWordList.push(w);
    }
    if (!allWordList.length) return null;
    const totalBatches = Math.max(1, Math.ceil(allWordList.length / DAILY_POOL_SIZE));
    const newPool = {
        libId: activeLibraryId,
        date: new Date().toISOString().slice(0, 10),
        batchIndex: 0,
        totalBatches,
        usedIndices: [],
        totalWords: allWordList.length
    };
    saveDailyPool(newPool);
    return newPool;
}

function getDailyGameWords() {
    const pool = initDailyPool();
    if (!pool || !allWords) return [];
    const allWordList = [];
    for (const lv of getDifficultyLevels()) {
        for (const w of (allWords[lv] || [])) allWordList.push(w);
    }
    if (!allWordList.length) return [];
    const start = pool.batchIndex * DAILY_POOL_SIZE;
    const batch = allWordList.slice(start, start + DAILY_POOL_SIZE);
    const remaining = batch.filter((_, i) => !pool.usedIndices.includes(start + i));
    if (remaining.length === 0 && allWordList.length > DAILY_POOL_SIZE) {
        advanceDailyBatch();
        return getDailyGameWords();
    }
    return remaining;
}

function getDailyPoolAllWords() {
    const pool = initDailyPool();
    if (!pool || !allWords) return [];
    const allWordList = [];
    for (const lv of getDifficultyLevels()) {
        for (const w of (allWords[lv] || [])) allWordList.push(w);
    }
    if (!allWordList.length) return [];
    const start = pool.batchIndex * DAILY_POOL_SIZE;
    return allWordList.slice(start, start + DAILY_POOL_SIZE);
}

function markDailyWordUsed(wordOrIndex) {
    const pool = getDailyPool();
    if (!pool) return;
    if (!allWords) return;
    let idx;
    if (typeof wordOrIndex === "number") {
        idx = wordOrIndex;
    } else {
        const allWordList = [];
        for (const lv of getDifficultyLevels()) {
            for (const w of (allWords[lv] || [])) allWordList.push(w);
        }
        idx = allWordList.findIndex(w => w.word.toLowerCase() === wordOrIndex.toLowerCase());
    }
    if (idx >= 0 && !pool.usedIndices.includes(idx)) {
        pool.usedIndices.push(idx);
        saveDailyPool(pool);
    }
}

function advanceDailyBatch() {
    const pool = getDailyPool();
    if (!pool) return false;
    const next = (pool.batchIndex + 1) % pool.totalBatches;
    pool.batchIndex = next;
    pool.usedIndices = [];
    saveDailyPool(pool);
    return true;
}

function getDailyPoolInfo() {
    const pool = getDailyPool();
    if (!pool || !allWords) return { current: 0, total: 0, batch: 0, batches: 0, remaining: 0 };
    const remaining = getDailyGameWords().length;
    const allWordList = [];
    for (const lv of [1, 2, 3]) {
        for (const w of (allWords[lv] || [])) allWordList.push(w);
    }
    return {
        current: pool.batchIndex * DAILY_POOL_SIZE + 1,
        total: allWordList.length,
        batch: pool.batchIndex + 1,
        batches: pool.totalBatches,
        remaining
    };
}

// ============================================================
// 🏆 词库检验场景（Mastery Test Scene）
// ============================================================
let masteryState = null;

function openMasteryTestModal() {
    if (!allWords) { showInfoMessage("⚠️ 提示", "请等待词库加载完成。"); return; }
    const modal = document.getElementById("masteryTestModal");
    if (!modal) return;
    const lib = availableLibraries.find(l => l.id === activeLibraryId);
    const libName = lib ? `${lib.icon} ${lib.name} - ${lib.nameFull}` : "当前词库";
    document.getElementById("masteryLibName").innerText = libName;
    masteryRefreshHeader();
    document.getElementById("masteryModePanel").style.display = "block";
    document.getElementById("masteryQuizPanel").style.display = "none";
    document.getElementById("masteryResultPanel").style.display = "none";
    document.getElementById("masteryDefaultButtons").style.display = "block";
    modal.style.display = "flex";
}

function masteryRefreshHeader() {
    const stats = getMasteryStats(activeLibraryId, allWords);
    const fill = document.getElementById("masteryProgressFill");
    const text = document.getElementById("masteryProgressText");
    const masteredEl = document.getElementById("masteryMastered");
    const rateEl = document.getElementById("masteryRate");
    if (fill) fill.style.width = stats.percent + "%";
    if (text) text.innerText = `${stats.mastered} / ${stats.total} 词`;
    if (masteredEl) masteredEl.innerText = stats.mastered;
    if (rateEl) rateEl.innerText = stats.percent + "%";
}

function startMasteryQuiz(mode) {
    if (!allWords) return;
    // 收集所有词（合并三个等级）
    const allWordList = [];
    for (const lv of [1, 2, 3]) {
        for (const w of (allWords[lv] || [])) allWordList.push(w);
    }
    if (allWordList.length < 4) {
        showInfoMessage("⚠️ 词库不足", "当前词库单词少于 4 个，无法检验。");
        return;
    }

    let questions = [...allWordList];

    if (mode === "quick") {
        // 快速检测：随机 20 题
        questions = shuffleArray(questions).slice(0, Math.min(20, questions.length));
    } else if (mode === "mastered") {
        // 只测未掌握词
        const prog = getLibProgress(activeLibraryId);
        const masteredSet = new Set(Object.keys(prog.mastered));
        const unmastered = allWordList.filter(w => !masteredSet.has(w.word.toLowerCase()));
        if (!unmastered.length) {
            showInfoMessage("🎉 全部掌握", "当前词库已全部掌握，无需复习！");
            return;
        }
        questions = shuffleArray(unmastered);
    } else if (mode === "spell") {
        // 听写模式
        questions = shuffleArray(questions).slice(0, Math.min(15, questions.length));
    } else if (mode === "full") {
        // 完整检测：随机抽取至多 60 题（避免太长）
        questions = shuffleArray(questions).slice(0, Math.min(60, questions.length));
    }

    masteryState = {
        mode,
        questions,
        idx: 0,
        correct: 0,
        current: null
    };

    document.getElementById("masteryModePanel").style.display = "none";
    document.getElementById("masteryResultPanel").style.display = "none";
    document.getElementById("masteryQuizPanel").style.display = "block";
    document.getElementById("masteryDefaultButtons").style.display = "none";

    masteryShowNext();
}

function masteryShowNext() {
    if (!masteryState) return;
    if (masteryState.idx >= masteryState.questions.length) {
        masteryFinish();
        return;
    }
    const w = masteryState.questions[masteryState.idx];
    masteryState.current = w;
    document.getElementById("masteryQNum").innerText = masteryState.idx + 1;
    document.getElementById("masteryQTotal").innerText = masteryState.questions.length;
    document.getElementById("masteryCorrectCount").innerText = masteryState.correct;
    document.getElementById("masteryFeedback").innerText = "";
    document.getElementById("masteryFeedback").className = "mastery-feedback";

    const answerArea = document.getElementById("masteryAnswerArea");
    answerArea.innerHTML = "";

    if (masteryState.mode === "spell") {
        // 听写模式：TTS 朗读，玩家输入英文
        document.getElementById("masteryQWord").innerText = "🔊 听写";
        document.getElementById("masteryQHint").innerText = "请根据发音拼写英文单词";
        const inp = document.createElement("input");
        inp.type = "text";
        inp.className = "mastery-spell-input";
        inp.id = "masterySpellInput";
        inp.placeholder = "type the word...";
        inp.autocomplete = "off";
        const submit = () => masteryCheckAnswer(inp.value.trim().toLowerCase(), w.word.toLowerCase());
        inp.addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
        answerArea.appendChild(inp);
        inp.focus();
        speakText(w.word);
    } else {
        // 选择题模式
        document.getElementById("masteryQWord").innerText = w.word;
        document.getElementById("masteryQHint").innerText = "选择正确的中文释义";
        // 收集 4 个选项（1 正确 + 3 干扰）
        const pool = [];
        for (const lv of [1, 2, 3]) {
            for (const x of (allWords[lv] || [])) pool.push(x);
        }
        const distractors = shuffleArray(pool.filter(x => x.word !== w.word)).slice(0, 3);
        const options = shuffleArray([w, ...distractors]);
        const optsDiv = document.createElement("div");
        optsDiv.className = "mastery-options";
        options.forEach(o => {
            const btn = document.createElement("button");
            btn.className = "mastery-opt";
            btn.innerText = o.meaning || o.fullMeaning || o.word;
            btn.onclick = () => masteryCheckAnswer(o.word, w.word, btn, options);
            optsDiv.appendChild(btn);
        });
        answerArea.appendChild(optsDiv);
        speakText(w.word);
    }
}

function masteryCheckAnswer(answer, correct, clickedBtn, options) {
    if (!masteryState || !masteryState.current) return;
    const isRight = answer === correct;
    const fb = document.getElementById("masteryFeedback");

    if (isRight) {
        masteryState.correct++;
        document.getElementById("masteryCorrectCount").innerText = masteryState.correct;
        markWordMastered(activeLibraryId, correct);
        fb.innerText = "✅ 正确！";
        fb.className = "mastery-feedback correct";
        if (clickedBtn) clickedBtn.classList.add("correct");
        if (masteryState.mode === "spell") {
            const inp = document.getElementById("masterySpellInput");
            if (inp) { inp.disabled = true; inp.style.borderColor = "#2ecc71"; }
        } else if (options) {
            options.forEach(b => b.disabled = true);
        }
    } else {
        unmarkWordMastered(activeLibraryId, correct);
        fb.innerText = `❌ 错误！正确答案：${correct}`;
        fb.className = "mastery-feedback wrong";
        if (clickedBtn) clickedBtn.classList.add("wrong");
        if (options) {
            options.forEach(b => {
                b.disabled = true;
                // 标记正确选项
            });
            // 找出正确选项加绿色
            const btns = document.querySelectorAll(".mastery-opt");
            btns.forEach(b => {
                if (b.innerText === (masteryState.current.meaning || masteryState.current.fullMeaning)) {
                    b.classList.add("correct");
                }
            });
        }
        if (masteryState.mode === "spell") {
            const inp = document.getElementById("masterySpellInput");
            if (inp) { inp.disabled = true; inp.style.borderColor = "#e74c3c"; }
        }
    }

    // 1.5 秒后下一题
    setTimeout(() => {
        masteryState.idx++;
        masteryShowNext();
    }, 1500);
}

function masteryFinish() {
    const total = masteryState.questions.length;
    const correct = masteryState.correct;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const reward = correct * 2 + (pct === 100 ? 20 : pct >= 80 ? 10 : 0);
    tickets += reward; updateTicketUI(); saveGame();

    let title = "🎉 检验完成";
    if (pct === 100) title = "🏆 完美通关";
    else if (pct >= 80) title = "🥇 优秀";
    else if (pct >= 60) title = "🥈 良好";
    else title = "💪 继续努力";

    let extra = "";
    if (pct === 100) {
        fireConfetti(150);
        extra = "<br>🎁 完美奖励 +20 🎫";
        // 满分级额外奖
        if (getMasteryStats(activeLibraryId, allWords).percent === 100) {
            extra += "<br>👑 词库全掌握！获得隐藏成就！";
        }
    } else {
        fireConfetti(pct >= 80 ? 60 : 20);
        extra = pct >= 80 ? "<br>🎁 优秀奖励 +10 🎫" : "";
    }

    document.getElementById("masteryResultTitle").innerText = title;
    document.getElementById("masteryResultStats").innerHTML =
        `📊 正确 ${correct} / ${total}（${pct}%）<br>🎫 奖励 +${reward}${extra}`;
    document.getElementById("masteryModePanel").style.display = "none";
    document.getElementById("masteryQuizPanel").style.display = "none";
    document.getElementById("masteryResultPanel").style.display = "block";
    masteryRefreshHeader();
    renderLibraryPicker();
    playBeep(pct >= 80 ? "correct" : "wrong");
}

// 事件绑定
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("masteryTestBtn");
    if (btn) btn.onclick = openMasteryTestModal;
});
// 兜底：脚本可能比 DOMContentLoaded 早跑
if (document.readyState === "loading") {
    // DOMContentLoaded 会触发上面的 listener
} else {
    const btn = document.getElementById("masteryTestBtn");
    if (btn) btn.onclick = openMasteryTestModal;
}

// 模式按钮
document.querySelectorAll(".mastery-mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const mode = btn.dataset.mode;
        if (mode) startMasteryQuiz(mode);
    });
});
document.getElementById("masteryQSpeak").onclick = () => {
    if (masteryState && masteryState.current) speakText(masteryState.current.word);
};
document.getElementById("masteryRetryBtn").onclick = () => {
    if (masteryState) startMasteryQuiz(masteryState.mode);
};
document.getElementById("masteryBackBtn").onclick = () => {
    document.getElementById("masteryResultPanel").style.display = "none";
    document.getElementById("masteryModePanel").style.display = "block";
    document.getElementById("masteryDefaultButtons").style.display = "block";
};
document.getElementById("masteryCloseBtn").onclick = () => {
    document.getElementById("masteryTestModal").style.display = "none";
};