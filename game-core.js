import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const appId = window.POKEMON_APP_ID || (typeof __app_id !== 'undefined' ? __app_id : 'pokemon-math-v3');
const firebaseConfig = window.FIREBASE_CONFIG_OBJ || (typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null);
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let db, auth, userId;
let isTestEnvironment = false;

let globalSettings = {
    enableMultiplication: true,
    enableLongMath: true,
    enableTriangles: true,
    enableFractions: true
};

let state = {
    playerName: null,
    score: 0,
    pokemons: [],
    mistakes: {}, 
    setsCompleted: 0,
    currentSet: [],
    individualQuestions: [],
    matchQuestions: [],
    longMathSet: [],
    triangleSet: [],
    fractionSet: [],
    laCurrentStepIndex: 0,
    phase: 'loading', 
    currentIndex: 0,
    matchState: { selectedEq: null, selectedAns: null, completedPairs: [] },
    timerInterval: null,
    elapsedSeconds: 0
};

const rarityLists = {
    common: [1,4,7,10,13,16,19,21,23,25,27,29,32,37,39,41,43,46,50,52,54,58,60,69,74,92,133], 
    rare: [2,3,5,6,8,9,31,34,38,45,65,68,89,94,130,131,143,149], 
    legendary: [144,145,146,150,151,243,244,245,249,250,251,382,383,384] 
};

// =================== פונקציות עזר ===================
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getContainer = () => document.getElementById('app-container');

function generatePlayerName() {
    const animals = ['אריה', 'נמר', 'פיל', 'קוף', 'דולפין', 'נשר', 'שועל', 'זאב', 'דובי', 'פנדה', 'צב', 'פינגווין', 'דרקון'];
    const adjectives = ['אמיץ', 'חכם', 'מהיר', 'חזק', 'זריז', 'מגניב', 'גיבור', 'אלוף', 'מבריק', 'שמח', 'סקרן', 'שובב', 'נדיר'];
    return `${animals[Math.floor(Math.random() * animals.length)]} ${adjectives[Math.floor(Math.random() * adjectives.length)]} ${Math.floor(Math.random() * 90) + 10}`;
}

// =================== מחוללי שאלות (לשימוש במשחק יחיד ובקרבות) ===================

function createLongMathSet() {
    return [generateLongMathProblem(), generateLongMathProblem()];
}

function createFractionSet() {
    let set = [];
    for(let i=0; i<5; i++) {
        const total = randomInt(2, 10); 
        const colored = randomInt(1, total - 1); 
        const shape = Math.random() > 0.5 ? 'rect' : 'circle';
        const correct = `${colored}/${total}`;
        let options = new Set(); 
        options.add(correct);
        while(options.size < 4) { options.add(`${randomInt(1, randomInt(2, 10) - 1)}/${randomInt(2, 10)}`); }
        set.push({ total, colored, shape, correct, options: Array.from(options).sort(() => 0.5 - Math.random()) });
    }
    return set;
}

const triangleTemplates = [
    { points: "100,46 40,150 160,150", labels: ["חד זווית", "שווה צלעות"], marks: `<line x1="96" y1="150" x2="104" y2="150" stroke="#ef4444" stroke-width="3"/><line x1="66" y1="94" x2="74" y2="102" stroke="#ef4444" stroke-width="3"/><line x1="126" y1="102" x2="134" y2="94" stroke="#ef4444" stroke-width="3"/>` },
    { points: "40,160 140,160 40,60", labels: ["ישר זווית", "שווה שוקיים"], marks: `<polyline points="40,140 60,140 60,160" fill="none" stroke="#3b82f6" stroke-width="2"/><line x1="86" y1="156" x2="94" y2="164" stroke="#ef4444" stroke-width="3"/><line x1="36" y1="106" x2="44" y2="114" stroke="#ef4444" stroke-width="3"/>` },
    { points: "40,160 160,160 40,80", labels: ["ישר זווית", "שונה צלעות"], marks: `<polyline points="40,140 60,140 60,160" fill="none" stroke="#3b82f6" stroke-width="2"/>` },
    { points: "20,130 180,130 100,100", labels: ["קהה זווית", "שווה שוקיים"], marks: `<line x1="57" y1="110" x2="63" y2="120" stroke="#ef4444" stroke-width="3"/><line x1="137" y1="120" x2="143" y2="110" stroke="#ef4444" stroke-width="3"/>` },
    { points: "20,130 170,130 140,90", labels: ["קהה זווית", "שונה צלעות"], marks: `` },
    { points: "40,150 160,150 100,30", labels: ["חד זווית", "שווה שוקיים"], marks: `<line x1="65" y1="88" x2="75" y2="92" stroke="#ef4444" stroke-width="3"/><line x1="125" y1="92" x2="135" y2="88" stroke="#ef4444" stroke-width="3"/>` },
    { points: "40,150 160,150 90,50", labels: ["חד זווית", "שונה צלעות"], marks: `` },
    { points: "20,50 180,50 100,80", labels: ["קהה זווית", "שווה שוקיים"], marks: `<line x1="57" y1="60" x2="63" y2="70" stroke="#ef4444" stroke-width="3"/><line x1="137" y1="70" x2="143" y2="60" stroke="#ef4444" stroke-width="3"/>` },
    { points: "40,40 140,40 140,140", labels: ["ישר זווית", "שווה שוקיים"], marks: `<polyline points="120,40 120,60 140,60" fill="none" stroke="#3b82f6" stroke-width="2"/><line x1="86" y1="36" x2="94" y2="44" stroke="#ef4444" stroke-width="3"/><line x1="136" y1="86" x2="144" y2="94" stroke="#ef4444" stroke-width="3"/>` },
    { points: "160,160 160,40 80,40", labels: ["ישר זווית", "שונה צלעות"], marks: `<polyline points="140,40 140,60 160,60" fill="none" stroke="#3b82f6" stroke-width="2"/>` },
    { points: "130,20 130,170 90,140", labels: ["קהה זווית", "שונה צלעות"], marks: `` },
    { points: "150,40 150,160 30,100", labels: ["חד זווית", "שווה שוקיים"], marks: `<line x1="88" y1="65" x2="92" y2="75" stroke="#ef4444" stroke-width="3"/><line x1="92" y1="125" x2="88" y2="135" stroke="#ef4444" stroke-width="3"/>` },
    { points: "150,100 46,40 46,160", labels: ["חד זווית", "שווה צלעות"], marks: `<line x1="42" y1="100" x2="50" y2="100" stroke="#ef4444" stroke-width="3"/><line x1="96" y1="65" x2="100" y2="75" stroke="#ef4444" stroke-width="3"/><line x1="96" y1="135" x2="100" y2="125" stroke="#ef4444" stroke-width="3"/>` },
    { points: "130,20 130,180 100,100", labels: ["קהה זווית", "שווה שוקיים"], marks: `<line x1="110" y1="58" x2="120" y2="62" stroke="#ef4444" stroke-width="3"/><line x1="110" y1="142" x2="120" y2="138" stroke="#ef4444" stroke-width="3"/>` }
];

function createTriangleBattleSet() {
    return [...triangleTemplates].sort(() => 0.5 - Math.random()).slice(0, 4);
}

function createMultiplicationBattleSet() {
    let qs = [];
    for(let i=0; i<4; i++) {
        const a = randomInt(2, 10);
        const b = randomInt(2, 10);
        const isDiv = Math.random() > 0.5;
        if (isDiv) {
            qs.push({ id: 'bd'+i, isDiv: true, a, b, ans: a*b, displayEq: `<span>${a*b}</span> <span class="text-blue-500">÷</span> <span>${a}</span> <span class="text-gray-400">=</span>`, correct: b, corePair: `${a}_${b}`, format: Math.random() > 0.5 ? 'choice' : 'open' });
        } else {
            qs.push({ id: 'bm'+i, isDiv: false, a, b, ans: a*b, displayEq: `<span>${a}</span> <span class="text-blue-500">×</span> <span>${b}</span> <span class="text-gray-400">=</span>`, correct: a*b, corePair: `${a}_${b}`, format: Math.random() > 0.5 ? 'choice' : 'open' });
        }
    }
    return qs;
}

// =================== מערכת נוכחות והזמנות (LOBBY SYSTEM) ===================

let unsubArena = null;

function initPresence() {
    if (!db || !userId) return;
    const pRef = doc(db, 'artifacts', appId, 'online', userId);
    const ping = () => {
        setDoc(pRef, { playerName: state.playerName, lastActive: Date.now(), status: state.phase === 'arena' ? 'in_lobby' : 'playing' }, { merge: true });
    };
    ping();
    setInterval(ping, 15000); 

    const invitesQ = query(collection(db, 'artifacts', appId, 'battles'), where('guestId', '==', userId), where('status', '==', 'pending'));
    onSnapshot(invitesQ, (snap) => {
        snap.docChanges().forEach(change => {
            if (change.type === 'added') window.showInvitePopup(change.doc.id, change.doc.data());
        });
    });
}

window.openArena = function() {
    state.phase = 'arena';
    const timerEl = document.getElementById('timer-display');
    if (timerEl) timerEl.classList.add('hidden');
    renderArena();
}

function renderArena() {
    const container = getContainer();
    container.innerHTML = `
        <div class="w-full text-center bounce-in">
            <h2 class="text-3xl font-bold text-red-600 mb-2">⚔️ זירת הקרבות</h2>
            <p class="text-gray-600 mb-6">מחפש יריבים פנויים...</p>
            <div id="players-list" class="flex flex-col gap-3 max-w-md mx-auto min-h-[150px]">
                <div class="animate-pulse font-bold text-gray-400 mt-4">סורק את הזירה...</div>
            </div>
            <button onclick="window.startRandomSet()" class="text-gray-500 hover:text-gray-800 font-medium underline mt-8">חזור לאימון</button>
        </div>
    `;

    if (unsubArena) unsubArena();
    const onlineRef = collection(db, 'artifacts', appId, 'online');
    
    unsubArena = onSnapshot(onlineRef, (snap) => {
        if (state.phase !== 'arena') { unsubArena(); return; }
        const list = document.getElementById('players-list');
        if (!list) return;

        let playersHtml = '';
        let found = false;
        const now = Date.now();

        snap.forEach(docSnap => {
            const data = docSnap.data();
            if (docSnap.id !== userId && (now - data.lastActive < 30000) && data.status === 'in_lobby') {
                found = true;
                playersHtml += `
                    <div class="bg-white border-2 border-red-200 p-4 rounded-xl flex justify-between items-center shadow-sm hover:shadow-md transition">
                        <span class="font-bold text-lg text-gray-800">👤 ${data.playerName}</span>
                        <button onclick="window.sendInvite('${docSnap.id}', '${data.playerName}')" class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow transform active:scale-95">הזמן לקרב!</button>
                    </div>
                `;
            }
        });
        list.innerHTML = found ? playersHtml : `<div class="text-gray-500 font-medium bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-inner">אין כרגע שחקנים פנויים בזירה. חכה כאן או חזור לאימון בינתיים.</div>`;
    });
}

window.sendInvite = async function(targetId, targetName) {
    const container = getContainer();
    container.innerHTML = `
        <div class="text-center bounce-in min-h-[250px] flex flex-col justify-center items-center">
            <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-red-500 mb-6"></div>
            <h2 class="text-2xl font-bold text-gray-700">שולח הזמנה ל-${targetName}...</h2>
            <p class="text-gray-500 mt-2">ממתין לתשובה</p>
            <button onclick="window.openArena()" class="mt-8 text-gray-400 hover:text-gray-700 underline">בטל קריאה</button>
        </div>
    `;

    try {
        const battleRef = doc(collection(db, 'artifacts', appId, 'battles'));
        await setDoc(battleRef, { hostId: userId, hostName: state.playerName, guestId: targetId, status: 'pending', timestamp: Date.now() });

        const unsubWait = onSnapshot(battleRef, (docSnap) => {
            if (state.phase !== 'arena') { unsubWait(); return; }
            const data = docSnap.data();
            if (!data) return;
            if (data.status === 'accepted') { unsubWait(); window.startBattleSetup(battleRef.id, 'host'); } 
            else if (data.status === 'declined') { unsubWait(); alert(`${targetName} דחה את ההזמנה לקרב הפעם 😢`); window.openArena(); }
        });
    } catch(e) { console.error(e); alert("שגיאה בשליחת ההזמנה."); window.openArena(); }
}

window.showInvitePopup = function(battleId, data) {
    const existing = document.getElementById('invite-popup');
    if (existing) existing.remove();
    const popup = document.createElement('div');
    popup.id = 'invite-popup';
    popup.className = 'fixed inset-0 bg-black bg-opacity-60 z-[100] flex justify-center items-center p-4 bounce-in';
    popup.innerHTML = `
        <div class="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full text-center shadow-2xl border-4 border-red-500 relative overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
            <div class="text-6xl mb-4 animate-bounce">⚔️</div>
            <h3 class="text-2xl font-bold text-gray-800 mb-2">קריאה לקרב!</h3>
            <p class="text-gray-600 mb-8 text-lg"><b>${data.hostName}</b> רוצה להילחם נגדך עכשיו!</p>
            <div class="flex gap-3 justify-center">
                <button onclick="window.acceptInvite('${battleId}')" class="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-xl shadow-lg transform transition active:scale-95 text-lg">קבל את האתגר!</button>
                <button onclick="window.declineInvite('${battleId}')" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 rounded-xl transform transition active:scale-95">לא עכשיו</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);
}

window.acceptInvite = async function(battleId) {
    const popup = document.getElementById('invite-popup');
    if (popup) popup.remove();
    await setDoc(doc(db, 'artifacts', appId, 'battles', battleId), { status: 'accepted' }, { merge: true });
    window.startBattleSetup(battleId, 'guest');
}

window.declineInvite = async function(battleId) {
    const popup = document.getElementById('invite-popup');
    if (popup) popup.remove();
    await setDoc(doc(db, 'artifacts', appId, 'battles', battleId), { status: 'declined' }, { merge: true });
}


// =================== יצירת שאלות אקראיות לקרב ===================

function generateBattleSet() {
    let availableGenerators = [];

    if (globalSettings.enableMultiplication) {
        availableGenerators.push(() => {
            const isDiv = Math.random() > 0.5;
            const a = randomInt(2, 10);
            const b = randomInt(2, 10);
            if (isDiv) {
                return { type: 'mult', categoryName: 'חילוק ➗', displayEq: `<span>${a*b}</span> <span class="text-blue-500">÷</span> <span>${a}</span> <span class="text-gray-400">=</span>`, ans: b };
            } else {
                return { type: 'mult', categoryName: 'כפל ✖️', displayEq: `<span>${a}</span> <span class="text-blue-500">×</span> <span>${b}</span> <span class="text-gray-400">=</span>`, ans: a * b };
            }
        });
    }

    if (globalSettings.enableFractions) {
        availableGenerators.push(() => {
            const total = randomInt(2, 8); const colored = randomInt(1, total - 1); const shape = Math.random() > 0.5 ? 'rect' : 'circle';
            const correct = `${colored}/${total}`;
            let options = new Set(); options.add(correct);
            while (options.size < 4) { options.add(`${randomInt(1, randomInt(2, 8) - 1)}/${randomInt(2, 8)}`); }
            return { type: 'fraction', categoryName: 'שברים 🍕', shape, colored, total, ans: correct, options: Array.from(options).sort(() => 0.5 - Math.random()) };
        });
    }

    if (globalSettings.enableTriangles) {
        availableGenerators.push(() => {
            const t = triangleTemplates[randomInt(0, triangleTemplates.length - 1)];
            const correct = t.labels.join(" ו");
            const allPairs = ["חד זווית ושווה צלעות", "חד זווית ושווה שוקיים", "חד זווית ושונה צלעות", "ישר זווית ושווה שוקיים", "ישר זווית ושונה צלעות", "קהה זווית ושווה שוקיים", "קהה זווית ושונה צלעות"];
            let options = new Set(); options.add(correct);
            while (options.size < 4) options.add(allPairs[randomInt(0, allPairs.length - 1)]);
            return { type: 'triangle', categoryName: 'משולשים 📐', points: t.points, marks: t.marks || '', ans: correct, options: Array.from(options).sort(() => 0.5 - Math.random()) };
        });
    }

    if (globalSettings.enableLongMath) {
        availableGenerators.push(() => {
            const isAdd = Math.random() > 0.5;
            const n1 = randomInt(100, 999); const n2 = randomInt(100, 999);
            if (isAdd) return { type: 'long_math', categoryName: 'חיבור ➕', displayEq: `<span>${n1}</span> <span class="text-blue-500">+</span> <span>${n2}</span> <span class="text-gray-400">=</span>`, ans: n1 + n2 };
            else {
                const maxN = Math.max(n1, n2); const minN = Math.min(n1, n2);
                return { type: 'long_math', categoryName: 'חיסור ➖', displayEq: `<span>${maxN}</span> <span class="text-blue-500">-</span> <span>${minN}</span> <span class="text-gray-400">=</span>`, ans: maxN - minN };
            }
        });
    }

    if (availableGenerators.length === 0) {
        availableGenerators.push(() => ({ type: 'mult', categoryName: 'כפל ✖️', displayEq: `<span>2</span> <span class="text-blue-500">×</span> <span>2</span> <span class="text-gray-400">=</span>`, ans: 4 }));
    }

    let battleSet = [];
    for (let i = 0; i < 3; i++) {
        const gen = availableGenerators[randomInt(0, availableGenerators.length - 1)];
        battleSet.push(gen());
    }
    return battleSet;
}


// =================== מערכת הקרבות המאוחדת (BATTLE SYSTEM) ===================

let unsubBattle = null;

window.startBattleSetup = async function(battleId, role) {
    state.phase = 'battle_prep';
    state.currentBattleId = battleId;
    state.currentBattleRole = role; 
    state.battleSelection = []; 

    const battleRef = doc(db, 'artifacts', appId, 'battles', battleId);

    if (role === 'host') {
        await setDoc(battleRef, {
            status: 'selecting_team',
            hostState: { ready: false, actionReady: false, team: [], activeIndex: 0, setProgress: 0 },
            guestState: { ready: false, actionReady: false, team: [], activeIndex: 0, setProgress: 0 },
            roundWinner: null
        }, { merge: true });
    }

    if (unsubBattle) unsubBattle();
    unsubBattle = onSnapshot(battleRef, (docSnap) => {
        const data = docSnap.data();
        if (!data) return;

        if (data.status === 'selecting_team' && state.phase === 'battle_prep') renderTeamSelection(data);
        if (data.status === 'action_selection') { state.phase = 'battle_active'; renderBattleActionSelection(data); }
        if (data.status === 'round_ended') { state.phase = 'round_ended'; renderRoundOutcome(data); }
        if (data.status === 'battle_over') { state.phase = 'battle_over'; renderBattleOver(data); }
        
        if (data.status === 'solving') { 
            const isHost = state.currentBattleRole === 'host';
            const myStateKey = isHost ? 'hostState' : 'guestState';
            const myProgress = data[myStateKey].setProgress || 0;

            if (state.phase !== 'battle_solving' || myProgress > state.currentIndex) {
                state.phase = 'battle_solving'; 
                state.currentIndex = myProgress;
                renderBattleSolving(data); 
            } else {
                window.updateBattleProgressBars(data);
            }
        }
    });
}

window.updateBattleProgressBars = function(battleData) {
    const isHost = state.currentBattleRole === 'host';
    const myStateKey = isHost ? 'hostState' : 'guestState';
    const oppStateKey = isHost ? 'guestState' : 'hostState';
    const myState = battleData[myStateKey];
    const oppState = battleData[oppStateKey];
    const totalQ = battleData.currentSet ? battleData.currentSet.length : 1;
    
    const myPercent = Math.min(100, Math.round((myState.setProgress / totalQ) * 100));
    const oppPercent = Math.min(100, Math.round((oppState.setProgress / totalQ) * 100));
    
    const myLbl = document.getElementById('my-progress-lbl');
    const myPct = document.getElementById('my-progress-pct');
    const myFill = document.getElementById('my-progress-fill');
    const oppLbl = document.getElementById('opp-progress-lbl');
    const oppPct = document.getElementById('opp-progress-pct');
    const oppFill = document.getElementById('opp-progress-fill');
    
    if (myLbl) myLbl.innerText = `👤 אתה (${myState.setProgress}/${totalQ})`;
    if (myPct) myPct.innerText = `${myPercent}%`;
    if (myFill) myFill.style.width = `${myPercent}%`;
    
    if (oppLbl) oppLbl.innerText = `⚔️ היריב (${oppState.setProgress}/${totalQ})`;
    if (oppPct) oppPct.innerText = `${oppPercent}%`;
    if (oppFill) oppFill.style.width = `${oppPercent}%`;
}


function renderTeamSelection(battleData) {
    const container = getContainer();
    const myState = state.currentBattleRole === 'host' ? battleData.hostState : battleData.guestState;
    
    if (myState.ready) {
        container.innerHTML = `
            <div class="text-center bounce-in w-full min-h-[300px] flex flex-col justify-center items-center">
                <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mb-6"></div>
                <h2 class="text-3xl font-bold text-gray-700 mb-2">צוות מוכן!</h2>
                <p class="text-xl text-gray-500">ממתין שהיריב יסיים לבחור...</p>
            </div>
        `;
        return;
    }

    let pokedexHtml = '';
    if (state.pokemons.length === 0) {
        pokedexHtml = `<p class="text-red-500 font-bold col-span-full">אין לך פוקימונים באוסף! הנה פיקאצ'ו במתנה.</p>`;
        state.battleSelection = [{ id: 25, name: 'Pikachu', imgUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png' }];
    } else {
        [...state.pokemons].reverse().forEach((p, index) => {
            const isSelected = state.battleSelection.some(sel => sel.id === p.id);
            const borderClass = isSelected ? 'border-4 border-green-500 bg-green-50 scale-105' : 'border-2 border-gray-200 bg-white hover:bg-gray-50';
            pokedexHtml += `
                <div onclick="window.togglePokemonSelection(${index})" class="cursor-pointer transition-all duration-200 rounded-xl p-2 text-center shadow-sm ${borderClass} rarity-${p.rarity || 'common'}">
                    ${isSelected ? '<div class="absolute top-1 right-1 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs">V</div>' : ''}
                    <img src="${p.imgUrl}" class="w-16 h-16 mx-auto object-contain">
                    <span class="block text-xs font-bold mt-1 uppercase truncate" style="font-size: 10px;">${p.name}</span>
                </div>
            `;
        });
    }

    const maxAllowed = Math.min(3, Math.max(1, state.pokemons.length));
    container.innerHTML = `
        <div class="w-full text-center bounce-in">
            <h2 class="text-2xl font-bold text-red-600 mb-2">בחר את הצוות שלך! ⚔️</h2>
            <p class="text-gray-600 mb-4 font-medium">בחר עד ${maxAllowed} פוקימונים שייכנסו איתך לזירה</p>
            <div class="bg-gray-100 p-4 rounded-2xl mb-6 shadow-inner max-h-[300px] overflow-y-auto">
                <div class="grid grid-cols-3 md:grid-cols-4 gap-3 relative">${pokedexHtml}</div>
            </div>
            <div class="flex flex-col items-center gap-3">
                <div class="text-sm font-bold text-gray-500">נבחרו: <span class="${state.battleSelection.length === maxAllowed ? 'text-green-600' : 'text-blue-600'}">${state.battleSelection.length} / ${maxAllowed}</span></div>
                <button onclick="window.confirmTeam()" id="confirm-team-btn" class="${state.battleSelection.length > 0 ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed'} text-white font-bold py-3 px-8 rounded-full shadow-lg transform transition active:scale-95 text-xl w-full max-w-xs" ${state.battleSelection.length === 0 ? 'disabled' : ''}>מוכן לקרב!</button>
            </div>
        </div>
    `;
}

window.togglePokemonSelection = function(index) {
    const p = [...state.pokemons].reverse()[index];
    const maxAllowed = Math.min(3, Math.max(1, state.pokemons.length));
    const existingIndex = state.battleSelection.findIndex(sel => sel.id === p.id);
    
    if (existingIndex >= 0) state.battleSelection.splice(existingIndex, 1);
    else if (state.battleSelection.length < maxAllowed) state.battleSelection.push(p);
    else {
        const btn = document.getElementById('confirm-team-btn');
        btn.classList.add('shake'); setTimeout(() => btn.classList.remove('shake'), 400); return;
    }
    getDoc(doc(db, 'artifacts', appId, 'battles', state.currentBattleId)).then(snap => renderTeamSelection(snap.data()));
}

window.confirmTeam = async function() {
    if (state.battleSelection.length === 0) return;
    const teamWithHP = state.battleSelection.map(p => ({ ...p, hp: 2, maxHp: 2 }));
    const battleRef = doc(db, 'artifacts', appId, 'battles', state.currentBattleId);
    const snap = await getDoc(battleRef);
    const data = snap.data();
    const opponentState = state.currentBattleRole === 'host' ? data.guestState : data.hostState;
    
    const updatePayload = {};
    const myStateKey = state.currentBattleRole === 'host' ? 'hostState' : 'guestState';
    updatePayload[myStateKey] = { ...data[myStateKey], team: teamWithHP, ready: true, activeIndex: 0 };
    if (opponentState && opponentState.ready) updatePayload.status = 'action_selection';
    await setDoc(battleRef, updatePayload, { merge: true });
}

function renderBattleActionSelection(battleData) {
    const container = getContainer();
    const isHost = state.currentBattleRole === 'host';
    const myStateKey = isHost ? 'hostState' : 'guestState';
    const oppStateKey = isHost ? 'guestState' : 'hostState';
    const myState = battleData[myStateKey];
    const oppState = battleData[oppStateKey];
    
    if (isHost && myState.actionReady && oppState.actionReady && battleData.status === 'action_selection') {
        window.startBattleRound(); return;
    }

    if (myState.actionReady) {
        container.innerHTML = `
            <div class="text-center bounce-in min-h-[300px] flex flex-col justify-center items-center">
                <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-red-500 mb-6"></div>
                <h2 class="text-3xl font-bold text-gray-700">מוכן לקרב!</h2>
                <p class="text-xl text-gray-500 mt-2">ממתין ליריב שינעל את הפעולה שלו...</p>
            </div>
        `;
        return;
    }

    const myActive = myState.team[myState.activeIndex];
    const oppActive = oppState.team[oppState.activeIndex];
    let benchHtml = '';
    myState.team.forEach((p, index) => {
        if (index !== myState.activeIndex) {
            const isDead = p.hp <= 0;
            benchHtml += `
                <div onclick="${isDead ? '' : `window.swapBattlePokemon(${index})`}" class="cursor-pointer ${isDead ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-105 hover:border-blue-400'} transition-all bg-white border-2 border-gray-200 rounded-xl p-2 text-center w-24 shadow-sm">
                    <img src="${p.imgUrl}" class="w-12 h-12 mx-auto object-contain">
                    <div class="text-xs font-bold mt-1 text-red-500">${'❤️'.repeat(p.hp)}</div>
                </div>
            `;
        }
    });

    container.innerHTML = `
        <div class="w-full text-center bounce-in">
            <div class="flex justify-between items-center mb-6 px-2 md:px-8 bg-white/50 py-4 rounded-3xl border-2 border-gray-100 shadow-sm relative overflow-hidden">
                <div class="flex flex-col items-center z-10 w-1/3">
                    <div class="text-sm md:text-base font-bold text-blue-600 mb-2 bg-blue-100 px-3 py-1 rounded-full shadow-inner">אתה</div>
                    <div class="bg-blue-50 border-4 border-blue-400 rounded-full w-24 h-24 md:w-32 md:h-32 flex items-center justify-center shadow-lg relative">
                        <img src="${myActive.imgUrl}" class="w-20 h-20 md:w-28 md:h-28 object-contain">
                    </div>
                    <div class="mt-3 text-lg md:text-xl drop-shadow-md">${'❤️'.repeat(myActive.hp)}${'🖤'.repeat(myActive.maxHp - myActive.hp)}</div>
                </div>
                <div class="text-5xl md:text-7xl font-bold text-red-500 italic drop-shadow-lg z-10 w-1/3">VS</div>
                <div class="flex flex-col items-center z-10 w-1/3">
                    <div class="text-sm md:text-base font-bold text-red-600 mb-2 bg-red-100 px-3 py-1 rounded-full shadow-inner">היריב</div>
                    <div class="bg-red-50 border-4 border-red-400 rounded-full w-24 h-24 md:w-32 md:h-32 flex items-center justify-center shadow-lg relative">
                        <img src="${oppActive.imgUrl}" class="w-20 h-20 md:w-28 md:h-28 object-contain">
                    </div>
                    <div class="mt-3 text-lg md:text-xl drop-shadow-md">${'❤️'.repeat(oppActive.hp)}${'🖤'.repeat(oppActive.maxHp - oppActive.hp)}</div>
                </div>
            </div>
            <div class="flex flex-col items-center gap-4 mt-6">
                <button onclick="window.lockInAttack()" class="bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-12 rounded-full shadow-xl transform transition active:scale-95 text-2xl w-full max-w-sm animate-pulse border-4 border-red-300">התקף! ⚔️</button>
                ${benchHtml ? `<div class="mt-4 w-full max-w-sm bg-gray-100/80 p-4 rounded-2xl shadow-inner border border-gray-200"><div class="text-sm font-bold text-gray-500 mb-3 flex items-center justify-center gap-2"><span>🔄</span> החלף פוקימון:</div><div class="flex justify-center gap-4">${benchHtml}</div></div>` : ''}
            </div>
        </div>
    `;
}

window.swapBattlePokemon = async function(newIndex) {
    const battleRef = doc(db, 'artifacts', appId, 'battles', state.currentBattleId);
    const snap = await getDoc(battleRef);
    const updatePayload = {};
    const myKey = state.currentBattleRole === 'host' ? 'hostState' : 'guestState';
    updatePayload[myKey] = { ...snap.data()[myKey], activeIndex: newIndex };
    await setDoc(battleRef, updatePayload, { merge: true });
}

window.lockInAttack = async function() {
    const battleRef = doc(db, 'artifacts', appId, 'battles', state.currentBattleId);
    const snap = await getDoc(battleRef);
    const myKey = state.currentBattleRole === 'host' ? 'hostState' : 'guestState';
    const updatePayload = {};
    updatePayload[myKey] = { ...snap.data()[myKey], actionReady: true };
    await setDoc(battleRef, updatePayload, { merge: true });
}

window.startBattleRound = async function() {
    const battleRef = doc(db, 'artifacts', appId, 'battles', state.currentBattleId);
    let activeSets = [];
    if(globalSettings.enableMultiplication) activeSets.push('mult');
    if(globalSettings.enableLongMath) activeSets.push('long_math');
    if(globalSettings.enableTriangles) activeSets.push('triangles');
    if(globalSettings.enableFractions) activeSets.push('fractions');
    if (activeSets.length === 0) activeSets.push('mult');
    
    const chosenType = activeSets[randomInt(0, activeSets.length - 1)];
    let battleSet = [];
    
    if (chosenType === 'mult') battleSet = createMultiplicationBattleSet();
    if (chosenType === 'long_math') battleSet = createLongMathSet();
    if (chosenType === 'triangles') battleSet = createTriangleBattleSet();
    if (chosenType === 'fractions') battleSet = createFractionSet();

    await setDoc(battleRef, { status: 'solving', currentSetType: chosenType, currentSet: battleSet }, { merge: true });
}

function renderBattleSolving(battleData) {
    const container = getContainer();
    const isHost = state.currentBattleRole === 'host';
    const myStateKey = isHost ? 'hostState' : 'guestState';
    const oppStateKey = isHost ? 'guestState' : 'hostState';
    const myState = battleData[myStateKey];
    const oppState = battleData[oppStateKey];
    const totalQ = battleData.currentSet.length;

    if (myState.setProgress >= totalQ) {
        container.innerHTML = `<div class="text-center bounce-in min-h-[300px] flex flex-col justify-center items-center"><div class="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500 mb-6"></div><h2 class="text-3xl font-bold text-green-600 mb-2">סיימת את הסט! ⚡</h2><p class="text-xl text-gray-600">מחשב את מכת ההתקפה...</p></div>`;
        return;
    }

    const myPercent = Math.min(100, Math.round((myState.setProgress / totalQ) * 100));
    const oppPercent = Math.min(100, Math.round((oppState.setProgress / totalQ) * 100));

    container.innerHTML = `
        <div class="w-full text-center bounce-in flex flex-col items-center">
            <div class="w-full max-w-md bg-white p-4 rounded-2xl border-2 border-gray-200 shadow-sm mb-4 flex flex-col gap-3 relative">
                <div>
                    <div class="flex justify-between text-xs font-bold text-blue-600 mb-1"><span id="my-progress-lbl">👤 אתה (${myState.setProgress}/${totalQ})</span><span id="my-progress-pct">${myPercent}%</span></div>
                    <div class="w-full h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner"><div id="my-progress-fill" class="h-full bg-blue-500 transition-all duration-300" style="width: ${myPercent}%"></div></div>
                </div>
                <div>
                    <div class="flex justify-between text-xs font-bold text-red-500 mb-1"><span id="opp-progress-lbl">⚔️ היריב (${oppState.setProgress}/${totalQ})</span><span id="opp-progress-pct">${oppPercent}%</span></div>
                    <div class="w-full h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner"><div id="opp-progress-fill" class="h-full bg-red-500 transition-all duration-300" style="width: ${oppPercent}%"></div></div>
                </div>
            </div>
            
            <div id="battle-q-container" class="w-full max-w-md bg-white p-2 rounded-2xl shadow-sm border border-gray-100"></div>
        </div>
    `;

    const qContainer = document.getElementById('battle-q-container');
    state.currentIndex = myState.setProgress;

    const type = battleData.currentSetType;
    if (type === 'long_math') {
        state.longMathSet = battleData.currentSet;
        renderLongMath(qContainer);
    } else if (type === 'fractions') {
        state.fractionSet = battleData.currentSet;
        renderFractions(qContainer);
    } else if (type === 'triangles') {
        state.triangleSet = battleData.currentSet;
        renderTriangles(qContainer);
    } else if (type === 'mult') {
        state.individualQuestions = battleData.currentSet;
        const q = state.individualQuestions[state.currentIndex];
        if (q.format === 'choice') renderChoiceQuestion(q, state.currentIndex, totalQ, qContainer);
        else renderInputQuestion(q, state.currentIndex, totalQ, qContainer);
    }
}

window.submitBattleProgress = async function() {
    const battleRef = doc(db, 'artifacts', appId, 'battles', state.currentBattleId);
    const snap = await getDoc(battleRef);
    const data = snap.data();
    const myKey = state.currentBattleRole === 'host' ? 'hostState' : 'guestState';
    const newProgress = (data[myKey].setProgress || 0) + 1;
    const totalQ = data.currentSet.length;
    
    const updatePayload = {};
    updatePayload[myKey] = { ...data[myKey], setProgress: newProgress };
    
    if (newProgress >= totalQ && data.status === 'solving') {
        updatePayload.status = 'round_ended';
        updatePayload.roundWinner = state.currentBattleRole;
    }
    
    await setDoc(battleRef, updatePayload, { merge: true });
}

async function renderRoundOutcome(battleData) {
    const container = getContainer();
    const isHost = state.currentBattleRole === 'host';
    const iWon = battleData.roundWinner === state.currentBattleRole;
    const winnerName = iWon ? 'אתה' : 'היריב';
    
    container.innerHTML = `
        <div class="text-center bounce-in w-full flex flex-col items-center justify-center min-h-[300px]">
            <div class="text-6xl mb-4 animate-bounce">${iWon ? '⚔️' : '💥'}</div>
            <h2 class="text-3xl md:text-4xl font-bold ${iWon ? 'text-green-600' : 'text-red-600'} mb-2">${iWon ? 'הנחתת מכה ניצחת! ⚡' : 'חטפת מכה מהיריב! 💥'}</h2>
            <p class="text-xl text-gray-700 mb-6"><b>${winnerName}</b> ענית ראשון/ה על כל השאלות!</p>
            <div class="animate-pulse text-gray-400 font-medium">מעדכן את נקודות החיים בלוח...</div>
        </div>
    `;

    if (isHost && battleData.status === 'round_ended') {
        setTimeout(async () => {
            const battleRef = doc(db, 'artifacts', appId, 'battles', state.currentBattleId);
            const snap = await getDoc(battleRef);
            const data = snap.data();
            const loserKey = data.roundWinner === 'host' ? 'guestState' : 'hostState';
            const winnerKey = data.roundWinner === 'host' ? 'hostState' : 'guestState';
            const loserState = data[loserKey];
            const updatedTeam = [...loserState.team];
            const activeP = updatedTeam[loserState.activeIndex];
            
            activeP.hp = Math.max(0, activeP.hp - 1);
            const totalHp = updatedTeam.reduce((sum, p) => sum + p.hp, 0);

            const updatePayload = {};
            if (totalHp <= 0) {
                updatePayload.status = 'battle_over';
                updatePayload.finalWinner = data.roundWinner;
            } else {
                updatePayload.status = 'action_selection';
                updatePayload.roundWinner = null;
                if (activeP.hp <= 0) {
                    const nextAlive = updatedTeam.findIndex(p => p.hp > 0);
                    if (nextAlive >= 0) loserState.activeIndex = nextAlive;
                }
            }

            updatePayload[loserKey] = { ...loserState, team: updatedTeam, actionReady: false, setProgress: 0 };
            updatePayload[winnerKey] = { ...data[winnerKey], actionReady: false, setProgress: 0 };
            await setDoc(battleRef, updatePayload, { merge: true });
        }, 2000);
    }
}

function renderBattleOver(battleData) {
    const container = getContainer();
    const iWon = battleData.finalWinner === state.currentBattleRole;
    if (iWon) { state.score += 20; saveUserData(); }

    container.innerHTML = `
        <div class="text-center bounce-in w-full flex flex-col items-center justify-center min-h-[350px]">
            <div class="text-7xl mb-4 animate-bounce">${iWon ? '🏆' : '💔'}</div>
            <h2 class="text-4xl font-bold ${iWon ? 'text-yellow-500' : 'text-gray-600'} mb-2">${iWon ? 'ניצחון אדיר בקרב! 🎉' : 'הפסדת בקרב הפעם...'}</h2>
            <p class="text-xl text-gray-700 mb-6">${iWon ? 'כל הפוקימונים של היריב התעלפו! קיבלת <b>20 נקודות בונוס</b>!' : 'כל הפוקימונים שלך התעלפו. כדאי להתאמן עוד ולהחזיר נקודות!'}</p>
            <button onclick="window.openArena()" class="bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-10 rounded-full shadow-xl transform transition active:scale-95 text-2xl animate-pulse">חזור לזירה ⚔️</button>
        </div>
    `;
}

// =================== אתחול האפליקציה ושמירות ===================

export async function initApp(isTestMode = false) {
    isTestEnvironment = isTestMode;
    const storageKey = isTestEnvironment ? 'pokemonMathTestSave' : 'pokemonMathSave';
    const docId = isTestEnvironment ? 'save_test' : 'save';

    try {
        const localDataRaw = localStorage.getItem(storageKey);
        let loadedLocal = false;
        if (localDataRaw) {
            try { 
                const d = JSON.parse(localDataRaw);
                state.playerName = d.playerName || null;
                state.score = d.score || 0;
                state.pokemons = d.pokemons || [];
                state.mistakes = d.mistakes || {};
                state.setsCompleted = d.setsCompleted || 0;
                loadedLocal = true;
            } catch(e) {}
        }
        
        if (firebaseConfig) {
            const app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);
            
            if (initialAuthToken) await signInWithCustomToken(auth, initialAuthToken);
            else await signInAnonymously(auth);
            
            userId = auth.currentUser.uid;
            
            try {
                const configSnap = await getDoc(doc(db, 'artifacts', appId, 'config', 'settings'));
                if (configSnap.exists()) globalSettings = { ...globalSettings, ...configSnap.data() };
            } catch (e) {}

            const docRef = doc(db, 'artifacts', appId, 'users', userId, 'gameData', docId);
            const snap = await getDoc(docRef);
            
            if (snap.exists()) {
                const cloudData = snap.data();
                if ((cloudData.score || 0) >= state.score) {
                    state.playerName = cloudData.playerName || state.playerName;
                    state.score = cloudData.score || 0;
                    state.pokemons = cloudData.pokemons || [];
                    state.mistakes = cloudData.mistakes || {};
                    state.setsCompleted = cloudData.setsCompleted || 0;
                } else await setDoc(docRef, state);
            } else if (loadedLocal) {
                await setDoc(docRef, JSON.parse(localDataRaw));
            }
            initPresence();
        }
    } catch (e) { console.error("Init failed", e); }
    
    if (isTestEnvironment) state.playerName = 'משתמש בדיקות 🛠️';
    else if (!state.playerName) state.playerName = generatePlayerName();
    
    saveUserData();
    document.getElementById('player-name-display').innerText = state.playerName;
    updatePokedex();
    document.getElementById('score-display').innerText = state.score;
    
    if (!isTestEnvironment) window.startRandomSet();
    else getContainer().innerHTML = `<div class="text-center font-bold text-gray-500 text-xl">מוכן לבדיקות. בחר סט מהתפריט.</div>`;
}

async function saveUserData() {
    const dataToSave = { playerName: state.playerName, score: state.score, pokemons: state.pokemons, mistakes: state.mistakes, setsCompleted: state.setsCompleted };
    const storageKey = isTestEnvironment ? 'pokemonMathTestSave' : 'pokemonMathSave';
    localStorage.setItem(storageKey, JSON.stringify(dataToSave));

    if (db && userId) {
        const syncIndicator = document.getElementById('cloud-sync-indicator');
        if(syncIndicator) syncIndicator.style.opacity = '1';
        try { await setDoc(doc(db, 'artifacts', appId, 'users', userId, 'gameData', isTestEnvironment ? 'save_test' : 'save'), dataToSave, { merge: true }); } 
        catch (e) {}
        if(syncIndicator) setTimeout(() => { syncIndicator.style.opacity = '0'; }, 1000);
    }
}

window.resetTestUser = function() {
    if(confirm("לאפס את נתוני משתמש הבדיקות?")) { localStorage.removeItem('pokemonMathTestSave'); location.reload(); }
};

// =================== משחק יחיד (ניהול מחזורי למידה) ===================

window.startRandomSet = function() {
    let availableSets = [];
    if (globalSettings.enableMultiplication) availableSets.push(window.generateNewSet);
    if (globalSettings.enableLongMath) availableSets.push(window.generateLongMathSet);
    if (globalSettings.enableTriangles) availableSets.push(window.generateTriangleSet);
    if (globalSettings.enableFractions) availableSets.push(window.generateFractionSet);

    if (availableSets.length === 0) { getContainer().innerHTML = `<div class="text-center font-bold text-red-500 text-2xl">אין סטים פעילים!</div>`; return; }
    availableSets[Math.floor(Math.random() * availableSets.length)]();
}

function handleQuestionResult(key, isCorrect) {
    if(!key) return;
    let finalKey = key;
    if (/^\d+_\d+$/.test(key)) {
        const parts = key.split('_').map(Number).sort((a,b) => a-b);
        finalKey = `${parts[0]}_${parts[1]}`;
    }
    if (isCorrect) {
        if (state.mistakes[finalKey]) { 
            state.mistakes[finalKey]--; 
            if (state.mistakes[finalKey] <= 0) delete state.mistakes[finalKey]; 
        }
    } else state.mistakes[finalKey] = Math.min((state.mistakes[finalKey] || 0) + 3, 5); 
    saveUserData();
}

function getMistakePair() {
    const keys = Object.keys(state.mistakes);
    if(keys.length === 0) return null;
    const multKeys = keys.filter(k => state.mistakes[k] > 0 && /^\d+_\d+$/.test(k));
    keys.forEach(k => { if(state.mistakes[k] <= 0) delete state.mistakes[k]; });
    saveUserData();
    if(multKeys.length === 0) return null;
    const chosen = multKeys[randomInt(0, multKeys.length - 1)];
    const [a, b] = chosen.split('_').map(Number);
    return { a, b };
}

window.generateFractionSet = function() {
    state.fractionSet = createFractionSet();
    state.phase = 'fractions'; state.currentIndex = 0; startTimer(); render();
}

window.generateLongMathSet = function() {
    state.longMathSet = createLongMathSet();
    state.phase = 'long_math'; state.currentIndex = 0; startTimer(); render();
};

function generateLongMathProblem() {
    const isAddition = Math.random() > 0.5;
    const len1 = randomInt(3, 5); const len2 = randomInt(3, len1); 
    let n1Str = ''; for(let i=0; i<len1; i++) n1Str += randomInt(1, 9).toString();
    let n1 = parseInt(n1Str);
    let n2Str = ''; for(let i=0; i<len2; i++) n2Str += randomInt(1, 9).toString();
    let n2 = parseInt(n2Str);
    
    if (!isAddition && n1 < n2) { let temp = n1; n1 = n2; n2 = temp; }
    
    let s1 = n1.toString().split('').reverse().map(Number); 
    let s2 = n2.toString().split('').reverse().map(Number);
    const maxLen = Math.max(s1.length, s2.length);
    
    let steps = []; let gridCols = maxLen;
    if (isAddition) {
        let carry = 0;
        for (let i = 0; i < maxLen; i++) {
            let sum = (s1[i] || 0) + (s2[i] || 0) + carry;
            steps.push({ type: 'result', col: i, expected: sum % 10 });
            carry = Math.floor(sum / 10);
            if (carry > 0) steps.push({ type: 'carry', col: i + 1, expected: carry });
        }
        if (carry > 0) { steps.push({ type: 'result', col: maxLen, expected: carry }); gridCols = maxLen + 1; }
    } else {
        let currentS1 = [...s1];
        for (let i = 0; i < maxLen; i++) {
            let v1 = currentS1[i] || 0; let v2 = s2[i] || 0;
            if (v1 < v2) {
                currentS1[i+1] -= 1;
                steps.push({ type: 'borrow', col: i+1, expected: currentS1[i+1], currentCol: i, currentVal: v1 + 10 });
                steps.push({ type: 'result', col: i, expected: (v1 + 10) - v2 });
            } else steps.push({ type: 'result', col: i, expected: v1 - v2 }); 
        }
    }
    return { op: isAddition ? '+' : '-', n1, n2, s1, s2, steps, gridCols, madeMistake: false };
}

window.generateNewSet = function() {
    let mults = []; let usedAnswers = new Set(); let usedPairs = new Set(); 
    
    for(let i=0; i<2; i++) {
        const mistake = getMistakePair();
        if(mistake) {
            const ans = mistake.a * mistake.b; const key1 = `${mistake.a}_${mistake.b}`;
            if(!usedPairs.has(key1)) {
                usedPairs.add(key1); usedPairs.add(`${mistake.b}_${mistake.a}`); usedAnswers.add(ans);
                mults.push({ id: 'm'+mults.length, isDiv: false, a: mistake.a, b: mistake.b, ans, displayEq: `<span>${mistake.a}</span> <span class="text-blue-500">×</span> <span>${mistake.b}</span> <span class="text-gray-400">=</span>`, correct: ans, corePair: key1 });
            }
        }
    }
    
    while (mults.length < 5) {
        const a = randomInt(2, 10); const b = randomInt(2, 10); const ans = a * b; const key1 = `${a}_${b}`;
        if (!usedAnswers.has(ans) && !usedPairs.has(key1)) {
            usedAnswers.add(ans); usedPairs.add(key1); usedPairs.add(`${b}_${a}`);
            mults.push({ id: 'm'+mults.length, isDiv: false, a, b, ans, displayEq: `<span>${a}</span> <span class="text-blue-500">×</span> <span>${b}</span> <span class="text-gray-400">=</span>`, correct: ans, corePair: key1 });
        }
    }
    
    let divs = [...mults].sort(() => 0.5 - Math.random()).slice(0, 3).map((q, i) => ({
        id: 'd'+i, isDiv: true, a: q.a, b: q.b, ans: q.ans, displayEq: `<span>${q.ans}</span> <span class="text-blue-500">÷</span> <span>${q.a}</span> <span class="text-gray-400">=</span>`, correct: q.b, corePair: q.corePair
    }));
    
    let allQ = [...mults, ...divs];
    let formats = ['choice', 'choice', 'choice', 'choice', 'open', 'open', 'match', 'match'].sort(() => 0.5 - Math.random());
    
    state.individualQuestions = []; state.matchQuestions = [];
    allQ.forEach((q, i) => { q.format = formats[i]; if (q.format === 'match') state.matchQuestions.push(q); else state.individualQuestions.push(q); });
    
    state.currentSet = mults; state.phase = 'study'; state.currentIndex = 0; render();
};

window.generateTriangleSet = function() {
    let shuffled = [...triangleTemplates].sort(() => 0.5 - Math.random());
    state.triangleStudySet = shuffled.slice(0, 3); 
    state.triangleSet = shuffled.slice(3, 7);
    state.phase = 'study_triangles'; state.currentIndex = 0; render();
};

window.startTriangleQuiz = function() { state.phase = 'triangles'; state.currentIndex = 0; startTimer(); render(); }
window.startQuestions = function() { state.phase = 'individual'; state.currentIndex = 0; startTimer(); render(); }

function startTimer() {
    state.elapsedSeconds = 0; 
    document.getElementById('timer-display').classList.remove('hidden'); 
    updateTimerDisplay();
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => { state.elapsedSeconds++; updateTimerDisplay(); }, 1000);
}

function updateTimerDisplay() {
    const mins = Math.floor(state.elapsedSeconds / 60).toString().padStart(2, '0');
    const secs = (state.elapsedSeconds % 60).toString().padStart(2, '0');
    document.getElementById('time-text').innerText = `${mins}:${secs}`;
}

// =================== הלב של הרינדור והבדיקה ===================

function handleCorrectAnswer() {
    const points = (state.phase === 'battle_solving') ? 1 : ((state.phase === 'long_math' || state.phase === 'triangles' || state.phase === 'fractions') ? 2 : 1);
    state.score += points;
    document.getElementById('score-display').innerText = state.score; 
    saveUserData();
    
    setTimeout(() => { window.advanceToNextQuestion(); }, 1000);
}

window.advanceToNextQuestion = function() {
    if (state.phase === 'battle_solving') {
        window.submitBattleProgress();
        return; 
    }

    state.currentIndex++;
    
    if (state.phase === 'individual' && state.currentIndex >= state.individualQuestions.length) {
        if (state.matchQuestions.length > 0) { state.phase = 'match'; render(); } else showSetComplete();
    } else if (state.phase === 'long_math' && state.currentIndex >= state.longMathSet.length) showSetComplete();
    else if (state.phase === 'triangles' && state.currentIndex >= state.triangleSet.length) showSetComplete();
    else if (state.phase === 'fractions' && state.currentIndex >= state.fractionSet.length) showSetComplete();
    else render();
}

function showSetComplete() {
    if (state.timerInterval) clearInterval(state.timerInterval); 
    document.getElementById('timer-display').classList.add('hidden');
    state.setsCompleted++; saveUserData();
    
    let bonusHtml = '';
    if (state.elapsedSeconds > 0 && state.elapsedSeconds <= 60) {
        state.score += 10; document.getElementById('score-display').innerText = state.score; saveUserData();
        bonusHtml = `<div class="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg inline-block mb-4 font-bold border border-yellow-300">⚡ בונוס מהירות! +10 נקודות</div>`;
    }
    
    getContainer().innerHTML = `
        <div class="text-center bounce-in w-full max-w-sm mx-auto">
            <h2 class="text-3xl font-bold text-green-500 mb-4">סיימת בהצלחה! 🎉</h2>
            ${bonusHtml}
            <button onclick="window.claimSetReward()" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-8 rounded-full shadow-lg transform transition active:scale-95 text-2xl w-full animate-bounce">🎁 קבל פוקימון במתנה!</button>
            ${state.setsCompleted % 3 === 0 ? `<button onclick="window.openShop()" class="bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-8 rounded-full shadow-lg transform transition active:scale-95 text-xl w-full mt-3">🛒 חנות פתוחה!</button>` : ``}
        </div>
    `;
}

function render() {
    const container = getContainer(); container.innerHTML = '';
    if (state.phase === 'study') renderStudyPhase(container);
    else if (state.phase === 'study_triangles') renderStudyTriangles(container);
    else if (state.phase === 'individual') {
        const q = state.individualQuestions[state.currentIndex];
        if (q.format === 'choice') renderChoiceQuestion(q, state.currentIndex, state.individualQuestions.length, container);
        else renderInputQuestion(q, state.currentIndex, state.individualQuestions.length, container);
    } else if (state.phase === 'match') renderMatchGame(container);
    else if (state.phase === 'shop') renderShop(container);
    else if (state.phase === 'long_math') renderLongMath(container);
    else if (state.phase === 'triangles') renderTriangles(container);
    else if (state.phase === 'fractions') renderFractions(container);
    else if (state.phase === 'arena') renderArena();
}

// =================== פונקציות הרינדור המקוריות ===================

function renderStudyPhase(container) {
    let html = `<div class="w-full text-center bounce-in"><h2 class="text-2xl font-bold text-blue-600 mb-2">שלב זכרון</h2><p class="text-gray-600 mb-6">הסתכל היטב על התרגילים הבאים!</p><div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-xl font-medium mx-auto max-w-md">`;
    state.currentSet.forEach(item => { html += `<div class="bg-blue-50 py-3 px-4 rounded-xl border border-blue-100" dir="ltr">${item.a} × ${item.b} = <span class="text-blue-700 font-bold">${item.ans}</span></div>`; });
    html += `</div><button onclick="window.startQuestions()" class="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full shadow-lg transform transition active:scale-95 text-lg w-full max-w-xs">התחל המבחן</button></div>`;
    container.innerHTML = html;
}

function renderChoiceQuestion(q, index, total, container) {
    let options = new Set(); options.add(q.correct);
    if (q.isDiv) [q.correct + 1, q.correct - 1, q.a, q.ans, q.correct + 2].forEach(m => { if(m>0) options.add(m) });
    else [q.correct + q.a, q.correct - q.a, q.correct + q.b, q.correct - q.b, q.correct + 10, parseInt(`${q.correct}`.split('').reverse().join(''))].forEach(m => { if(m>0 && !isNaN(m)) options.add(m) });
    while(options.size < 10) { let r = q.correct + randomInt(-15,15); if(r > 0) options.add(r); }
    const finalOptions = Array.from(options).slice(0, 10).sort(() => 0.5 - Math.random());
    
    container.innerHTML = `
        <div class="w-full text-center bounce-in" id="question-wrap">
            <div class="text-sm text-gray-500 mb-4 bg-gray-100 px-3 py-1 rounded-full inline-block">שאלה ${index + 1}/${total}</div>
            <div class="text-4xl md:text-5xl font-bold mb-6 flex justify-center items-center gap-3" dir="ltr">${q.displayEq} <span class="text-blue-600">?</span></div>
            <div id="options-grid" class="grid grid-cols-5 gap-3 mb-6 w-full max-w-md mx-auto"></div>
            <div id="feedback-msg" class="h-8 text-lg font-bold"></div>
        </div>
    `;
    const grid = document.getElementById('options-grid');
    finalOptions.forEach(opt => {
        const btn = document.createElement('button'); 
        btn.className = 'bg-white border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-xl font-bold py-3 rounded-xl shadow-sm transition transform active:scale-95'; 
        btn.innerText = opt;
        btn.onclick = () => window.checkChoiceAnswer(opt, q.correct, btn, grid, q.corePair);
        grid.appendChild(btn);
    });
}

window.checkChoiceAnswer = function(selected, correct, btn, grid, corePair) {
    const fb = document.getElementById('feedback-msg');
    if (selected === correct) {
        handleQuestionResult(corePair, true); 
        btn.className = 'bg-green-500 border-2 border-green-600 text-white text-xl font-bold py-3 rounded-xl shadow-md transition transform scale-105'; 
        fb.innerHTML = '<span class="text-green-500">מעולה! 👏</span>';
        Array.from(grid.children).forEach(b => b.disabled = true); 
        handleCorrectAnswer();
    } else {
        handleQuestionResult(corePair, false); 
        btn.className = 'bg-red-100 border-2 border-red-300 text-red-500 text-xl font-bold py-3 rounded-xl shadow-sm transition opacity-50'; btn.disabled = true; 
        fb.innerHTML = '<span class="text-red-500">טעות! נסה אפשרות אחרת.</span>';
        const wrap = document.getElementById('question-wrap'); wrap.classList.remove('shake'); void wrap.offsetWidth; wrap.classList.add('shake');
    }
}

function renderInputQuestion(q, index, total, container) {
    container.innerHTML = `
        <div class="w-full text-center bounce-in flex flex-col items-center" id="question-wrap">
            <div class="text-sm text-gray-500 mb-4 bg-gray-100 px-3 py-1 rounded-full">שאלה ${index + 1}/${total} (הקלדה)</div>
            <div class="text-4xl md:text-5xl font-bold flex justify-center items-center gap-3 mb-8 w-full" dir="ltr">
                ${q.displayEq} <input type="number" inputmode="numeric" id="answer-input" class="w-24 h-16 text-center border-4 border-blue-300 rounded-xl focus:border-blue-500 focus:outline-none shadow-inner text-4xl">
            </div>
            <div id="feedback-msg" class="h-8 text-lg font-bold mb-4 w-full"></div>
            <button onclick="window.checkInputAnswer('${q.correct}', '${q.corePair}')" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-full shadow-lg transform transition active:scale-95 text-lg w-full max-w-xs">בדוק תשובה</button>
        </div>
    `;
    setTimeout(() => { 
        const input = document.getElementById('answer-input'); 
        if(input) { input.focus(); input.addEventListener('keypress', (e) => { if (e.key === 'Enter') window.checkInputAnswer(q.correct, q.corePair); }); } 
    }, 50);
}

window.checkInputAnswer = function(correctStr, corePair) {
    const input = document.getElementById('answer-input');
    const val = parseInt(input.value);
    const fb = document.getElementById('feedback-msg');
    const wrap = document.getElementById('question-wrap');
    if(isNaN(val)) { fb.innerHTML = '<span class="text-gray-500">הכנס מספר בבקשה</span>'; return; }
    if(val === parseInt(correctStr)) { 
        handleQuestionResult(corePair, true); 
        fb.innerHTML = '<span class="text-green-500">כל הכבוד! 👏</span>'; 
        input.className = 'w-24 h-16 text-center border-4 border-green-500 bg-green-50 rounded-xl text-4xl text-green-700 disabled'; input.disabled = true;
        handleCorrectAnswer(); 
    } else { 
        handleQuestionResult(corePair, false); 
        fb.innerHTML = '<span class="text-red-500">אופס, טעות.</span>'; 
        input.value = ''; input.className = 'w-24 h-16 text-center border-4 border-red-400 bg-red-50 rounded-xl text-4xl text-red-600 focus:outline-none';
        wrap.classList.add('shake'); setTimeout(() => wrap.classList.remove('shake'), 400); input.focus();
    }
}

function renderStudyTriangles(container) {
    let html = `<div class="w-full text-center bounce-in flex flex-col items-center"><h2 class="text-2xl font-bold text-blue-600 mb-2">שלב למידה - משולשים</h2><div class="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl mx-auto mb-8">`;
    state.triangleStudySet.forEach(q => { 
        html += `<div class="bg-white p-4 rounded-xl shadow-sm border-2 border-blue-100 flex flex-col items-center"><svg width="150" height="150" viewBox="0 0 200 200" class="mb-3 drop-shadow-sm"><polygon points="${q.points}" fill="#eff6ff" stroke="#3b82f6" stroke-width="4" stroke-linejoin="round"/>${q.marks || ''}</svg><div class="font-bold text-blue-800 text-lg">${q.labels[0]}</div><div class="font-bold text-blue-800 text-lg">${q.labels[1]}</div></div>`; 
    });
    html += `</div><button onclick="window.startTriangleQuiz()" class="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full shadow-lg transform transition active:scale-95 text-lg w-full max-w-xs">הבנתי, התחל!</button></div>`;
    container.innerHTML = html;
}

function renderTriangles(container) {
    const q = state.triangleSet[state.currentIndex];
    const correctString = q.labels ? q.labels.join(" ו") : q.ans;
    const allPairs = ["חד זווית ושווה צלעות", "חד זווית ושווה שוקיים", "חד זווית ושונה צלעות", "ישר זווית ושווה שוקיים", "ישר זווית ושונה צלעות", "קהה זווית ושווה שוקיים", "קהה זווית ושונה צלעות"];
    let options = new Set(); options.add(correctString); 
    while(options.size < 4) { options.add(allPairs[randomInt(0, allPairs.length - 1)]); }
    const finalOptions = Array.from(options).sort(() => 0.5 - Math.random());
    
    container.innerHTML = `
        <div class="w-full text-center bounce-in flex flex-col items-center" id="question-wrap">
            <div class="text-sm text-gray-500 mb-4 bg-gray-100 px-3 py-1 rounded-full">שאלה ${state.currentIndex + 1} מתוך ${state.triangleSet.length} (משולשים)</div>
            <h3 class="text-xl font-bold mb-4 text-gray-700">בחר את התיאור הנכון ביותר למשולש:</h3>
            <div class="bg-white p-4 rounded-2xl shadow-sm border-2 border-gray-100 mb-6 w-full max-w-sm">
                <svg width="200" height="200" viewBox="0 0 200 200" class="mx-auto drop-shadow-md"><polygon points="${q.points}" fill="#eff6ff" stroke="#3b82f6" stroke-width="4" stroke-linejoin="round"/>${q.marks || ''}</svg>
            </div>
            <div id="options-grid" class="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-md mx-auto mb-6 w-full px-4 text-lg"></div>
            <div id="feedback-msg" class="h-8 text-lg font-bold mb-4 w-full"></div>
        </div>
    `;
    const grid = document.getElementById('options-grid');
    finalOptions.forEach(opt => {
        const btn = document.createElement('button'); 
        btn.className = 'bg-gray-50 border-2 border-gray-200 hover:bg-blue-50 hover:border-blue-300 text-gray-800 font-bold py-3 px-4 rounded-xl shadow-sm transition transform active:scale-95'; 
        btn.innerText = opt;
        btn.onclick = () => window.checkTriangleAnswer(opt, correctString, btn, grid); 
        grid.appendChild(btn);
    });
}

window.checkTriangleAnswer = function(selected, correct, btn, grid) {
    const fb = document.getElementById('feedback-msg');
    if (selected === correct) { 
        handleQuestionResult(`tri_${correct}`, true); 
        fb.innerHTML = '<span class="text-green-500">תשובה מושלמת! 👏</span>'; 
        btn.className = 'bg-green-500 border-2 border-green-600 text-white font-bold py-3 px-4 rounded-xl shadow-md transition transform scale-105';
        Array.from(grid.children).forEach(b => b.disabled = true);
        handleCorrectAnswer(); 
    } else { 
        handleQuestionResult(`tri_${correct}`, false); 
        fb.innerHTML = '<span class="text-red-500">לא מדויק. נסה תשובה אחרת!</span>'; 
        btn.className = 'bg-red-100 border-2 border-red-300 text-red-500 font-bold py-3 px-4 rounded-xl shadow-sm transition opacity-50'; btn.disabled = true; 
        const wrap = document.getElementById('question-wrap'); wrap.classList.remove('shake'); void wrap.offsetWidth; wrap.classList.add('shake');
    }
}

// ========== חשבון ארוך כולל תצוגת ההלוואה (Borrow Stack) ==========

function renderLongMath(container) {
    const q = state.longMathSet[state.currentIndex]; 
    state.laCurrentStepIndex = 0; 
    let gridHtml = `<div class="grid gap-1 md:gap-2 text-3xl font-bold font-mono bg-white p-6 rounded-2xl shadow-sm border-2 border-gray-100 mx-auto" style="grid-template-columns: auto repeat(${q.gridCols}, minmax(40px, 1fr)); direction: ltr; width: fit-content;"><div></div>`;
    
    // קומת ההלוואות ותיבות הקלט
    for(let c = q.gridCols - 1; c >= 0; c--) { 
        gridHtml += `
            <div class="flex flex-col justify-end h-16 items-center mb-1 relative">
                <div id="extra-borrow-${c}" class="text-red-600 font-bold text-xl h-6 flex items-center justify-center absolute top-0 w-full z-10"></div>
                <input id="carry-${c}" class="w-8 h-8 text-xl text-center font-bold text-red-500 border-b-2 border-red-200 bg-transparent opacity-0 transition-all duration-300 outline-none m-0 p-0 absolute bottom-0 z-0" disabled maxlength="1" inputmode="numeric">
            </div>`; 
    }
    gridHtml += `<div></div>`; 
    
    // שורת המספרים הראשונה
    for(let c = q.gridCols - 1; c >= 0; c--) { 
        gridHtml += `<div class="text-center relative"><span id="n1-${c}" class="inline-block transition-all duration-300">${q.s1[c] !== undefined ? q.s1[c] : ''}</span></div>`; 
    }
    gridHtml += `<div class="text-blue-500 flex items-center pr-4">${q.op}</div>`; 
    
    // שורת המספרים השנייה
    for(let c = q.gridCols - 1; c >= 0; c--) { 
        gridHtml += `<div class="text-center border-b-4 border-gray-800 pb-2">${q.s2[c] !== undefined ? q.s2[c] : ''}</div>`; 
    }
    gridHtml += `<div></div>`; 
    
    // קומת התשובה
    for(let c = q.gridCols - 1; c >= 0; c--) { 
        gridHtml += `<div class="flex justify-center pt-4"><input id="res-${c}" class="w-12 h-14 text-3xl text-center font-bold border-2 border-gray-300 rounded-lg bg-gray-50 opacity-0 transition-all duration-300 outline-none" disabled maxlength="1" inputmode="numeric"></div>`; 
    }
    gridHtml += `</div>`;
    
    container.innerHTML = `
        <div class="w-full text-center bounce-in flex flex-col items-center" id="question-wrap">
            <div class="text-sm text-gray-500 mb-6 bg-gray-100 px-3 py-1 rounded-full inline-block">שאלה ${state.currentIndex + 1} מתוך ${state.longMathSet.length}</div>
            <div class="mb-4 text-blue-700 font-bold">פתור מימין לשמאל (שים לב לשארית או להלוואה!)</div>
            ${gridHtml}
            <div id="feedback-msg" class="h-8 text-lg font-bold mt-6 w-full"></div>
        </div>
    `;
    window.activateNextLongMathStep();
}

window.activateNextLongMathStep = function() {
    const q = state.longMathSet[state.currentIndex];
    if (state.laCurrentStepIndex >= q.steps.length) {
        if (!q.madeMistake) handleQuestionResult(`lm_${q.op}`, true);
        document.getElementById('feedback-msg').innerHTML = '<span class="text-green-500">עבודה יפה! 👏</span>'; 
        handleCorrectAnswer(); 
        return;
    }
    
    const step = q.steps[state.laCurrentStepIndex];
    const el = document.getElementById(`${(step.type === 'carry' || step.type === 'borrow') ? 'carry' : 'res'}-${step.col}`);
    el.classList.remove('opacity-0', 'bg-gray-50'); el.classList.add('opacity-100', 'bg-blue-50', 'border-blue-400', 'shadow-md', 'scale-110'); el.disabled = false; el.focus();
    
    // כאן נעשה תיקון כדי למנוע את ה-once: true שתקע את הילדים:
    const inputHandler = (e) => {
        let val = parseInt(e.target.value); 
        if (isNaN(val)) return;
        
        if (val === step.expected) {
            // אם צדק, מסירים את ההאזנה להקלדה הזו ספציפית וממשיכים
            el.removeEventListener('input', inputHandler);
            
            el.disabled = true; el.classList.remove('bg-blue-50', 'border-blue-400', 'shadow-md', 'scale-110');
            if (step.type === 'carry' || step.type === 'borrow') { 
                el.classList.add('text-red-500'); 
                if (step.type === 'borrow') {
                    // מתיחת קו על המספר שהושאל ממנו (המספר הקודם בעמודה שמשמאל)
                    const n1Col = document.getElementById(`n1-${step.col}`);
                    if (n1Col) n1Col.classList.add('line-through', 'text-gray-400'); 
                    
                    // טיפול חזותי להלוואה בעמודה הנוכחית (ה-10 מעל ה-0, למשל)
                    const extraDiv = document.getElementById(`extra-borrow-${step.currentCol}`);
                    const carryCur = document.getElementById(`carry-${step.currentCol}`);
                    const n1Cur = document.getElementById(`n1-${step.currentCol}`);
                    
                    // האם יש כבר ערך בתיבת הקלט (carry) של העמודה הנוכחית (כי השאילו ממנה מקודם)?
                    if (carryCur && carryCur.value !== '') {
                        carryCur.classList.add('line-through', 'text-gray-400', 'opacity-50');
                    } else if (n1Cur) {
                        n1Cur.classList.add('line-through', 'text-gray-400');
                    }
                    
                    // מוסיף את ההלוואה החדשה מעל המספרים החתוכים
                    if (extraDiv && step.currentVal !== undefined) {
                        extraDiv.innerText = step.currentVal;
                    }
                }
            } else {
                el.classList.add('bg-green-50', 'border-green-500', 'text-green-700'); 
            }
            state.laCurrentStepIndex++; window.activateNextLongMathStep();
        } else {
            // אם טעה - מוחק את התיבה אבל ממשיך להאזין בלי להיתקע
            if (!q.madeMistake) { handleQuestionResult(`lm_${q.op}`, false); q.madeMistake = true; }
            el.value = ''; el.classList.add('shake', 'bg-red-100', 'border-red-500'); 
            setTimeout(() => { el.classList.remove('shake', 'bg-red-100', 'border-red-500'); el.focus(); }, 400);
        }
    };
    
    el.addEventListener('input', inputHandler);
}

function getFractionSvg(shape, colored, total) {
    let svg = '';
    if (shape === 'rect') {
        svg += `<svg width="200" height="100" viewBox="0 0 200 100" class="mx-auto drop-shadow-md border-2 border-gray-800 rounded-sm">`;
        for (let i = 0; i < total; i++) svg += `<rect x="${i * (200/total)}" y="0" width="${200/total}" height="100" fill="${i < colored ? '#3b82f6' : '#ffffff'}" stroke="#1f2937" stroke-width="2"/>`; 
        svg += `</svg>`;
    } else {
        svg += `<svg width="150" height="150" viewBox="0 0 150 150" class="mx-auto drop-shadow-md"><circle cx="75" cy="75" r="70" fill="#ffffff" stroke="#1f2937" stroke-width="2"/>`;
        for (let i = 0; i < total; i++) {
            const startRad = ((i * 360) / total - 90) * Math.PI / 180; const endRad = (((i + 1) * 360) / total - 90) * Math.PI / 180;
            const largeArcFlag = ((i + 1) * 360) / total - (i * 360) / total <= 180 ? "0" : "1";
            if (total > 1) svg += `<path d="M 75,75 L ${75 + 70 * Math.cos(startRad)},${75 + 70 * Math.sin(startRad)} A 70,70 0 ${largeArcFlag},1 ${75 + 70 * Math.cos(endRad)},${75 + 70 * Math.sin(endRad)} Z" fill="${i < colored ? '#3b82f6' : 'transparent'}" stroke="#1f2937" stroke-width="2"/>`; 
        }
        svg += `</svg>`;
    } 
    return svg;
}

function renderFractions(container) {
    const q = state.fractionSet[state.currentIndex];
    container.innerHTML = `
        <div class="w-full text-center bounce-in flex flex-col items-center" id="question-wrap">
            <div class="text-sm text-gray-500 mb-4 bg-gray-100 px-3 py-1 rounded-full">שאלה ${state.currentIndex + 1} מתוך ${state.fractionSet.length}</div>
            <h3 class="text-xl font-bold mb-4 text-gray-700">איזה שבר מתאר את החלק הצבוע?</h3>
            <div class="bg-white p-6 rounded-2xl shadow-sm border-2 border-gray-100 mb-6 w-full max-w-sm flex justify-center items-center">${getFractionSvg(q.shape, q.colored, q.total)}</div>
            <div id="options-grid" class="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-md mx-auto mb-6 w-full px-4 text-xl"></div>
            <div id="feedback-msg" class="h-8 text-lg font-bold mb-4 w-full"></div>
        </div>
    `;
    const grid = document.getElementById('options-grid');
    q.options.forEach(opt => {
        const btn = document.createElement('button'); 
        btn.className = 'bg-gray-50 border-2 border-gray-200 hover:bg-blue-50 hover:border-blue-300 text-gray-800 font-bold py-3 px-4 rounded-xl shadow-sm transition transform active:scale-95'; 
        const [top, bottom] = opt.split('/');
        btn.innerHTML = `<div class="flex flex-col items-center justify-center font-mono leading-none"><span>${top}</span><hr class="w-6 border-gray-800 my-1"><span>${bottom}</span></div>`;
        btn.onclick = () => window.checkFractionAnswer(opt, q.correct, btn, grid); 
        grid.appendChild(btn);
    });
}

window.checkFractionAnswer = function(selected, correct, btn, grid) {
    const fb = document.getElementById('feedback-msg');
    if (selected === correct) { 
        handleQuestionResult(`frac_${correct}`, true); 
        fb.innerHTML = '<span class="text-green-500">תשובה מושלמת! 👏</span>'; 
        btn.className = 'bg-green-500 border-2 border-green-600 text-white font-bold py-3 px-4 rounded-xl shadow-md transition transform scale-105'; 
        btn.innerHTML = btn.innerHTML.replace(/border-gray-800/g, 'border-white');
        Array.from(grid.children).forEach(b => b.disabled = true); 
        handleCorrectAnswer(); 
    } else { 
        handleQuestionResult(`frac_${correct}`, false); 
        fb.innerHTML = '<span class="text-red-500">טעות. נסה שבר אחר!</span>'; 
        btn.className = 'bg-red-100 border-2 border-red-300 text-red-500 font-bold py-3 px-4 rounded-xl shadow-sm transition opacity-50'; 
        btn.innerHTML = btn.innerHTML.replace(/border-gray-800/g, 'border-red-500');
        btn.disabled = true; 
        const wrap = document.getElementById('question-wrap'); wrap.classList.remove('shake'); void wrap.offsetWidth; wrap.classList.add('shake'); 
    }
}


// =================== משחק מתיחת קווים ===================

function renderMatchGame(container) {
    state.matchState = { selectedEq: null, selectedAns: null, completedPairs: [] };
    let gameHtml = `<div class="relative w-full flex justify-between px-4 md:px-16 mt-4" id="match-area"><div class="flex flex-col gap-6 z-10 w-32" id="eqs-div"></div><div class="flex flex-col gap-6 z-10 w-32" id="ans-div"></div><canvas id="match-canvas" class="absolute inset-0 z-0 pointer-events-none w-full h-full"></canvas></div>`;
    container.innerHTML = `<div class="w-full text-center bounce-in flex flex-col items-center relative min-h-[300px]"><div class="text-sm text-gray-500 mb-6 bg-gray-100 px-3 py-1 rounded-full relative z-20">שלב בונוס - מתיחת קווים</div><h3 class="text-xl font-bold mb-4 relative z-20 text-blue-700">לחץ על תרגיל ואז על התשובה כדי למתוח קו!</h3>${gameHtml}<div id="match-feedback" class="h-8 text-lg font-bold mt-6 z-20"></div></div>`;
    const eqsDiv = document.getElementById('eqs-div'); const ansDiv = document.getElementById('ans-div');
    const shuffledEqs = [...state.matchQuestions].sort(() => 0.5 - Math.random());
    let answersData = state.matchQuestions.map(q => ({ id: 'ans_'+q.id, val: q.correct }));
    if (state.matchQuestions.length <= 2) answersData.push({ id: 'ans_fake', val: state.matchQuestions[0].correct + randomInt(1, 3) });
    answersData.sort(() => 0.5 - Math.random());
    shuffledEqs.forEach((q) => { 
        const eqBtn = document.createElement('div'); eqBtn.className = 'match-item text-center'; eqBtn.dir = 'ltr'; 
        eqBtn.innerText = q.isDiv ? `${q.ans} ÷ ${q.a}` : `${q.a} × ${q.b}`; eqBtn.dataset.val = q.correct; eqBtn.dataset.type = 'eq'; eqBtn.dataset.core = q.corePair; eqBtn.id = `eq-${q.id}`; 
        eqBtn.onclick = () => window.handleMatchClick(eqBtn); eqsDiv.appendChild(eqBtn); 
    });
    answersData.forEach((ans) => { 
        const ansBtn = document.createElement('div'); ansBtn.className = 'match-item text-center'; ansBtn.innerText = ans.val; ansBtn.dataset.val = ans.val; ansBtn.dataset.type = 'ans'; ansBtn.id = ans.id; 
        ansBtn.onclick = () => window.handleMatchClick(ansBtn); ansDiv.appendChild(ansBtn); 
    });
    setTimeout(resizeCanvas, 100); window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() { 
    const area = document.getElementById('match-area'); const canvas = document.getElementById('match-canvas'); 
    if (area && canvas) { canvas.width = area.offsetWidth; canvas.height = area.offsetHeight; drawLines(); } 
}

window.handleMatchClick = function(element) {
    if (element.classList.contains('solved')) return; 
    const type = element.dataset.type; const st = state.matchState;
    if (element.classList.contains('selected')) { element.classList.remove('selected'); if (type === 'eq') st.selectedEq = null; else st.selectedAns = null; return; }
    Array.from(element.parentElement.children).forEach(child => { if (!child.classList.contains('solved')) child.classList.remove('selected'); });
    element.classList.add('selected'); if (type === 'eq') st.selectedEq = element; else st.selectedAns = element;
    if (st.selectedEq && st.selectedAns) {
        const eq = st.selectedEq; const ans = st.selectedAns; const fb = document.getElementById('match-feedback');
        if (eq.dataset.val === ans.dataset.val) {
            handleQuestionResult(eq.dataset.core, true); eq.classList.replace('selected', 'solved'); ans.classList.replace('selected', 'solved'); st.completedPairs.push({ eq: eq.id, ans: ans.id }); drawLines(); fb.innerHTML = '<span class="text-green-500">נכון!</span>'; st.selectedEq = null; st.selectedAns = null;
            if (st.completedPairs.length === state.matchQuestions.length) { fb.innerHTML = '<span class="text-green-500">סיימת את כולם!</span>'; window.removeEventListener('resize', resizeCanvas); setTimeout(() => { state.score += state.matchQuestions.length; saveUserData(); showSetComplete(); }, 1500); }
        } else {
            handleQuestionResult(eq.dataset.core, false); fb.innerHTML = '<span class="text-red-500">טעות! נסה למתוח קו אחר.</span>'; eq.classList.remove('selected'); ans.classList.remove('selected'); eq.classList.add('animate-pulse'); ans.classList.add('animate-pulse'); setTimeout(() => { eq.classList.remove('animate-pulse'); ans.classList.remove('animate-pulse'); }, 500); st.selectedEq = null; st.selectedAns = null;
        }
    }
}

function drawLines() {
    const canvas = document.getElementById('match-canvas'); const area = document.getElementById('match-area'); if (!canvas || !area) return;
    const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); const areaRect = area.getBoundingClientRect();
    state.matchState.completedPairs.forEach(pair => {
        const el1 = document.getElementById(pair.eq); const el2 = document.getElementById(pair.ans);
        if (el1 && el2) {
            const r1 = el1.getBoundingClientRect(); const r2 = el2.getBoundingClientRect();
            const x1 = r1.left - areaRect.left; const y1 = (r1.top - areaRect.top) + (r1.height / 2); const x2 = r2.right - areaRect.left; const y2 = (r2.top - areaRect.top) + (r2.height / 2);
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 4; ctx.stroke();
        }
    });
}


// =================== חנות ופרסים ===================

window.claimSetReward = function() { revealPokemonInteractive([getRandomId(Math.random() > 0.8 ? 'rare' : 'common')], 'reward'); }

window.openShop = function() { state.phase = 'shop'; renderShop(getContainer()); }

function renderShop(container) {
    container.innerHTML = `
        <div class="text-center bounce-in w-full">
            <h2 class="text-3xl font-bold text-purple-600 mb-2">חנות חבילות פוקימונים</h2>
            <p class="text-gray-600 mb-6">יש לך כרגע <b>${state.score}</b> נקודות</p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="bg-white border-2 border-gray-200 rounded-xl p-4 flex flex-col items-center shadow hover:shadow-md transition">
                    <div class="text-4xl mb-2">🎒</div><h3 class="font-bold text-lg">חבילה רגילה</h3><p class="text-sm text-gray-500 mb-4">3 פוקימונים רגילים</p>
                    <button onclick="window.buyPack(15, 'basic')" class="${state.score >= 15 ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed'} text-white font-bold py-2 px-6 rounded-full w-full mt-auto">15 נק'</button>
                </div>
                <div class="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex flex-col items-center shadow hover:shadow-md transition">
                    <div class="text-4xl mb-2">💼</div><h3 class="font-bold text-lg text-blue-700">חבילה נדירה</h3><p class="text-sm text-blue-600 mb-4">2 רגילים, 1 נדיר!</p>
                    <button onclick="window.buyPack(30, 'super')" class="${state.score >= 30 ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-400 cursor-not-allowed'} text-white font-bold py-2 px-6 rounded-full w-full mt-auto">30 נק'</button>
                </div>
                <div class="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 flex flex-col items-center shadow-lg transform hover:scale-105 transition relative">
                    <div class="absolute -top-3 -right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">לוהט!</div>
                    <div class="text-4xl mb-2">🎁</div><h3 class="font-bold text-lg text-yellow-700">חבילת אגדות</h3><p class="text-sm text-yellow-700 mb-4">1 רגיל, 1 נדיר, 1 אגדי!</p>
                    <button onclick="window.buyPack(50, 'ultra')" class="${state.score >= 50 ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-gray-400 cursor-not-allowed'} text-white font-bold py-2 px-6 rounded-full w-full mt-auto">50 נק'</button>
                </div>
            </div>
            <button onclick="window.startRandomSet()" class="text-gray-500 hover:text-gray-800 font-medium underline">חזור והמשך באתגר</button>
        </div>
    `;
}

window.buyPack = async function(cost, type) {
    if(state.score < cost) return; 
    state.score -= cost; document.getElementById('score-display').innerText = state.score; saveUserData();
    let ids = [];
    if (type === 'basic') ids = [getRandomId('common'), getRandomId('common'), getRandomId('common')];
    else if (type === 'super') ids = [getRandomId('common'), getRandomId('common'), getRandomId('rare')];
    else ids = [getRandomId('common'), getRandomId('rare'), getRandomId('legendary')];
    revealPokemonInteractive(ids, 'pack', type);
}

function getRandomId(rarityStr) { const arr = rarityLists[rarityStr]; return arr[randomInt(0, arr.length - 1)]; }

async function fetchPokemonData(id) {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`); const data = await res.json();
    const isLegend = rarityLists.legendary.includes(id); const isRare = rarityLists.rare.includes(id);
    const finalRarity = isLegend ? 'legendary' : (isRare ? 'rare' : 'common');
    return { id: data.id, name: data.name.charAt(0).toUpperCase() + data.name.slice(1), imgUrl: data.sprites.other['official-artwork'].front_default || data.sprites.front_default, rarity: finalRarity };
}

function revealPokemonInteractive(idsToFetch, context, packType = 'basic') {
    state.phase = 'reward'; 
    let clicksNeeded = context === 'pack' ? 5 : 3; let currentClicks = 0;
    let itemHtml = context === 'pack' ? `<div id="interactive-item" class="booster-pack pack-${packType} my-4"><div class="pack-title">חבילה</div></div>` : `<div id="interactive-item" class="cursor-pointer transition transform hover:scale-110 my-4" style="width: 150px; height: 150px;"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" class="w-full h-full object-contain drop-shadow-xl"></div>`;
    
    getContainer().innerHTML = `
        <div class="text-center bounce-in flex flex-col items-center justify-center min-h-[300px]">
            <h2 class="text-2xl font-bold text-gray-700 mb-2">${context === 'pack' ? 'קנית חבילה! לחץ עליה כדי לפתוח' : 'הנה הפרס שלך! לחץ כדי לתפוס אותו'}</h2>
            ${itemHtml}
            <div class="mt-4 w-48 h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner"><div id="click-progress" class="h-full ${context === 'pack' ? 'bg-purple-500' : 'bg-red-500'} transition-all duration-300" style="width: 0%;"></div></div>
            <p class="text-gray-400 text-sm mt-2 font-medium">לחץ עוד <span id="clicks-left">${clicksNeeded}</span> פעמים!</p>
        </div>
    `;
    
    const item = document.getElementById('interactive-item'); const bar = document.getElementById('click-progress'); const left = document.getElementById('clicks-left');
    item.onclick = () => {
        currentClicks++; item.classList.remove('shake-hard'); void item.offsetWidth; item.classList.add('shake-hard'); 
        bar.style.width = `${(currentClicks / clicksNeeded) * 100}%`; left.innerText = Math.max(0, clicksNeeded - currentClicks);
        if(currentClicks >= clicksNeeded) { 
            item.onclick = null; 
            if (context === 'pack') { item.classList.replace('shake-hard', 'rip-open'); setTimeout(() => showLoadingAndFetch(idsToFetch, context), 800); } 
            else showLoadingAndFetch(idsToFetch, context); 
        }
    };
}

async function showLoadingAndFetch(idsToFetch, context) {
    getContainer().innerHTML = `<div class="text-center flex flex-col items-center justify-center min-h-[300px] bounce-in"><div class="animate-spin rounded-full h-16 w-16 border-b-4 ${context === 'pack' ? 'border-purple-500' : 'border-red-500'} mb-4"></div><h2 class="text-2xl font-bold text-gray-600">${context === 'pack' ? 'שולף קלפים...' : 'תופס...'}</h2></div>`;
    try {
        const results = await Promise.allSettled(idsToFetch.map(id => fetchPokemonData(id))); 
        const pokemons = results.filter(r => r.status === 'fulfilled').map(r => r.value);
        if (pokemons.length === 0) throw new Error("Fetch failed");
        pokemons.forEach(p => state.pokemons.push(p)); saveUserData(); updatePokedex();

        let gridHtml = `<div class="flex flex-wrap justify-center gap-6 mb-8 mt-6">`;
        pokemons.forEach((p, index) => {
            const borderColor = p.rarity === 'legendary' ? '#eab308' : (p.rarity === 'rare' ? '#3b82f6' : '#9ca3af'); 
            const bgClass = p.rarity === 'legendary' ? 'bg-yellow-50' : (p.rarity === 'rare' ? 'bg-blue-50' : 'bg-white'); 
            const title = p.rarity === 'legendary' ? '⭐ אגדי!' : (p.rarity === 'rare' ? '🌟 נדיר!' : '');
            if (context === 'pack') { 
                gridHtml += `<div class="tcg-card-container bounce-in" style="animation-delay: ${index * 0.2}s" onclick="this.classList.toggle('flipped')"><div class="tcg-card-inner"><div class="tcg-card-cover"></div><div class="tcg-card-reveal ${bgClass}" style="border-color: ${borderColor}">${title ? `<span class="text-xs font-bold mb-1">${title}</span>` : '<span class="text-xs font-bold mb-1 opacity-0">.</span>'}<img src="${p.imgUrl}" class="w-20 h-20 object-contain drop-shadow-md mb-2"><span class="font-bold text-gray-800 text-sm text-center">${p.name}</span></div></div></div>`; 
            } else { 
                gridHtml += `<div class="bounce-in flex flex-col items-center p-4 rounded-xl border-4 ${bgClass} shadow-lg" style="width: 160px; border-color: ${borderColor}">${title ? `<span class="text-xs font-bold mb-2">${title}</span>` : ''}<img src="${p.imgUrl}" class="w-24 h-24 object-contain drop-shadow-md mb-2"><span class="font-bold text-gray-800">${p.name}</span></div>`; 
            }
        });
        gridHtml += `</div>`;
        getContainer().innerHTML = `<div class="text-center bounce-in flex flex-col items-center"><h2 class="text-3xl font-bold ${context === 'pack' ? 'text-purple-600' : 'text-green-600'} mb-2">${context === 'pack' ? 'וואו! איזה קלפים!' : 'תתחדש! התווסף לאוסף.'}</h2>${context === 'pack' ? '<p class="text-gray-500 mb-4 animate-pulse">לחץ על הקלפים כדי להפוך אותם</p>' : ''}${gridHtml}<button onclick="window.startRandomSet()" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-full shadow-lg transform transition active:scale-95 text-lg mt-4">המשך לאתגר הבא!</button></div>`;
        
        if (context === 'pack') setTimeout(() => { document.querySelectorAll('.tcg-card-container').forEach((card, i) => { setTimeout(() => card.classList.add('flipped'), 600 + (i * 300)); }); }, 100);
    } catch (error) { getContainer().innerHTML = `<div class="text-center text-red-500 font-bold mb-4">בעיית רשת קטנה. הנקודות והפוקימון נשמרו!</div>`; setTimeout(() => window.startRandomSet(), 3000); }
}

function updatePokedex() {
    const pk = document.getElementById('pokedex'); if(!pk) return;
    document.getElementById('pokemon-count').innerText = state.pokemons.length;
    if(state.pokemons.length > 0) { const emptyMsg = document.getElementById('pokedex-empty'); if(emptyMsg) emptyMsg.style.display = 'none'; }
    pk.innerHTML = state.pokemons.map(p => {
        return `<div class="pokemon-card bounce-in text-center rarity-${p.rarity || 'common'}"><img src="${p.imgUrl}" class="w-16 h-16 mx-auto object-contain"><span class="block text-xs font-bold mt-2 uppercase" style="font-size: 10px;">${p.name}</span></div>`;
    }).reverse().join('');
}