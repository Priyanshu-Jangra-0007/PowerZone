const STORAGE_KEY = 'powerzone-client-state-v1';
const goalChart = document.getElementById('goal-process-chart');
const sideNavLinks = Array.from(document.querySelectorAll('.side-nav a[data-view]'));
const panels = Array.from(document.querySelectorAll('.dashboard-view[data-panel]'));
const greetingHeading = document.getElementById('client-greeting');
const profileName = document.getElementById('client-profile-name');
const profileRole = document.getElementById('client-profile-role');
const profileAvatar = document.getElementById('client-avatar');
const hasSupabase = Boolean(window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY);
const clientSupabase = hasSupabase
    ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
    : null;
const CLIENT_DISPLAY_NAME_KEY = 'powerzone-display-name';
const CLIENT_AVATAR_URL_KEY = 'powerzone-avatar-url';
const CLIENT_PROFILE_CACHE_KEY = 'powerzone-profile-cache';

const defaultState = {
    view: 'dashboard',
    todos: [],
    diets: [
        { text: '7:30 AM Oats + egg whites', done: false },
        { text: '2:00 PM Grilled chicken + rice', done: false }
    ],
    workouts: [
        { text: 'Strength lower body block', done: false },
        { text: '20 min incline treadmill', done: true }
    ],
    supplements: [
        { text: 'Whey isolate - post workout', done: false },
        { text: 'Omega-3 - with lunch', done: false }
    ],
    goals: [
        { title: 'Body fat to 16%', progress: 58 },
        { title: 'Deadlift 120kg', progress: 44 }
    ],
    todayGoals: [
        { text: 'Complete warmup and mobility', done: false },
        { text: 'Hit protein target (140g+)', done: false }
    ],
    trainer: [
        { text: 'Mobility review - Tue 7:00 PM', done: false },
        { text: 'Form correction - Thu 8:00 PM', done: false }
    ],
    appointments: [
        { title: 'Training', time: '10:00 AM' },
        { title: 'Nutrition', time: '11:30 AM' },
        { title: 'Diet & Health', time: '4:00 PM' },
        { title: 'Muscles guide', time: '6:00 PM' }
    ],
    members: ['Priyanshu', 'Anika', 'Rahul', 'Nisha', 'Kabir'],
    friends: ['Rohan', 'Aarav', 'Siya'],
    activeFriend: 'Rohan',
    conversations: {
        Rohan: [
            { from: 'friend', text: 'Bro, leg day complete?' },
            { from: 'you', text: 'Yes, done. Finishing cooldown now.' }
        ],
        Aarav: [
            { from: 'friend', text: 'Need your meal prep list.' }
        ],
        Siya: [
            { from: 'friend', text: 'Let us do yoga class tomorrow.' }
        ]
    },
    settings: {
        notifications: true,
        emailSummary: false,
        units: 'metric'
    },
    gymAttendance: {}
};

let state = loadState();
const dashboardTodoPreset = [
    'Train lan for running',
    'Chest workout',
    'Belly fat loss',
    'Abs training for josh',
    'Train lan for running'
];

function isDashboardTodoPreset(list) {
    if (!Array.isArray(list) || list.length !== dashboardTodoPreset.length) return false;
    return list.every((item, index) => String(item.text || '').trim() === dashboardTodoPreset[index]);
}

function cloneState(source) {
    return JSON.parse(JSON.stringify(source));
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return cloneState(defaultState);
        const parsed = JSON.parse(raw);
        return {
            ...cloneState(defaultState),
            ...parsed,
            settings: {
                ...defaultState.settings,
                ...(parsed.settings || {})
            }
        };
    } catch (_error) {
        return cloneState(defaultState);
    }
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_error) {
        // Ignore storage failures.
    }
}

function normalizeChecklist(key) {
    if (!Array.isArray(state[key])) {
        state[key] = [];
        return;
    }
    state[key] = state[key]
        .map((item) => {
            if (typeof item === 'string') {
                return { text: item, done: false };
            }
            if (item && typeof item === 'object') {
                return {
                    text: String(item.text || '').trim(),
                    done: Boolean(item.done)
                };
            }
            return null;
        })
        .filter((item) => item && item.text);
}

function getLoginRedirectUrl() {
    const params = new URLSearchParams(window.location.search);
    const query = params.toString();
    const currentTarget = window.location.pathname.toLowerCase().includes('client.html')
        ? `client.html${query ? `?${query}` : ''}`
        : 'client.html?view=dashboard';
    return `login.html?redirect=${encodeURIComponent(currentTarget)}`;
}

function deriveDisplayName(user) {
    const metadata = user && typeof user === 'object' ? (user.user_metadata || {}) : {};
    const identityData = Array.isArray(user && user.identities)
        ? user.identities
            .map((identity) => identity && identity.identity_data ? identity.identity_data : null)
            .find((value) => value && typeof value === 'object')
        : null;
    let storedName = '';
    let cachedName = '';
    try {
        storedName = localStorage.getItem(CLIENT_DISPLAY_NAME_KEY) || '';
        const rawCache = localStorage.getItem(CLIENT_PROFILE_CACHE_KEY);
        const profileCache = rawCache ? JSON.parse(rawCache) : {};
        const normalizedEmail = String(user?.email || '').trim().toLowerCase();
        cachedName = normalizedEmail && profileCache[normalizedEmail]
            ? String(profileCache[normalizedEmail].name || '')
            : '';
    } catch (_error) {
        storedName = '';
        cachedName = '';
    }
    const candidates = [
        cachedName,
        metadata.full_name,
        metadata.display_name,
        metadata.name,
        metadata.user_name,
        identityData && identityData.full_name,
        identityData && identityData.name,
        identityData && identityData.user_name,
        user?.email,
        storedName
    ];
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim()) {
            return candidate.includes('@') ? candidate.split('@')[0] : candidate.trim();
        }
    }
    return 'Athlete';
}

function deriveInitials(name) {
    const parts = String(name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2);
    if (!parts.length) return 'A';
    return parts.map((part) => part[0].toUpperCase()).join('');
}

function getFirstName(name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) {
        return 'Athlete';
    }
    return trimmed.split(/\s+/)[0];
}

function isEmailLikeName(name) {
    return typeof name === 'string' && name.includes('@');
}

async function syncAccountDisplayName(user) {
    if (!clientSupabase || !user) {
        return user;
    }

    const metadata = user && typeof user === 'object' ? (user.user_metadata || {}) : {};
    const resolvedName = deriveDisplayName(user);
    if (!resolvedName || isEmailLikeName(resolvedName) || metadata.full_name === resolvedName) {
        return user;
    }

    const { data, error } = await clientSupabase.auth.updateUser({
        data: {
            ...metadata,
            full_name: resolvedName
        }
    });

    return error ? user : (data.user || user);
}

function applyAuthenticatedUser(user) {
    const displayName = deriveDisplayName(user);
    const metadata = user && typeof user === 'object' ? (user.user_metadata || {}) : {};
    const avatarUrl = [metadata.avatar_url, metadata.picture, metadata.photo_url]
        .find((value) => typeof value === 'string' && value.trim()) || '';
    const firstName = getFirstName(displayName);
    try {
        localStorage.setItem(CLIENT_DISPLAY_NAME_KEY, displayName);
        if (avatarUrl) {
            localStorage.setItem(CLIENT_AVATAR_URL_KEY, avatarUrl);
        } else {
            localStorage.removeItem(CLIENT_AVATAR_URL_KEY);
        }
    } catch (_error) {
        // Ignore storage failures.
    }
    if (greetingHeading) {
        greetingHeading.textContent = `Hi ${firstName}!`;
    }
    if (profileName) {
        profileName.textContent = displayName;
    }
    if (profileRole) {
        profileRole.textContent = user?.email || 'PowerZone member';
    }
    if (profileAvatar) {
        profileAvatar.textContent = deriveInitials(displayName);
    }
}

async function requireAuthenticatedUser() {
    if (!clientSupabase) {
        window.location.replace(getLoginRedirectUrl());
        return null;
    }

    const resolveSessionUser = async () => {
        const { data, error } = await clientSupabase.auth.getSession();
        if (error) {
            return null;
        }
        return data.session?.user || null;
    };

    let sessionUser = await resolveSessionUser();

    if (!sessionUser) {
        sessionUser = await new Promise((resolve) => {
            const timeoutId = window.setTimeout(() => {
                subscription.data.subscription.unsubscribe();
                resolve(null);
            }, 1200);

            const subscription = clientSupabase.auth.onAuthStateChange((_event, session) => {
                if (session?.user) {
                    window.clearTimeout(timeoutId);
                    subscription.data.subscription.unsubscribe();
                    resolve(session.user);
                }
            });
        });
    }

    if (!sessionUser) {
        window.location.replace(getLoginRedirectUrl());
        return null;
    }

    const userResponse = await clientSupabase.auth.getUser();
    return userResponse.data?.user || sessionUser;
}

function setActiveView(view) {
    const normalized = panels.some((panel) => panel.dataset.panel === view) ? view : 'dashboard';
    state.view = normalized;
    sideNavLinks.forEach((link) => link.classList.toggle('active', link.dataset.view === normalized));
    panels.forEach((panel) => panel.classList.toggle('active', panel.dataset.panel === normalized));
    const nextUrl = `client.html?view=${encodeURIComponent(normalized)}`;
    if (window.location.pathname.toLowerCase().includes('client.html')) {
        window.history.replaceState({}, '', nextUrl);
    }
    if (normalized === 'dashboard') drawGoalProcess();
    saveState();
}

function getViewFromLocation() {
    const params = new URLSearchParams(window.location.search);
    const queryView = params.get('view');
    if (queryView) return queryView;
    const file = (window.location.pathname.split('/').pop() || '').toLowerCase();
    const map = {
        'client-dashboard.html': 'dashboard',
        'client-diets.html': 'diets',
        'client-workouts.html': 'workouts',
        'client-supplements.html': 'supplements',
        'client-goals.html': 'goals',
        'client-trainer.html': 'trainer',
        'client-members.html': 'members',
        'client-messages.html': 'messages',
        'client-settings.html': 'settings'
    };
    return map[file] || '';
}

const calendarTitle = document.getElementById('calendar-title');
const calendarGrid = document.getElementById('calendar-grid');
const calendarPrev = document.getElementById('calendar-prev');
const calendarNext = document.getElementById('calendar-next');
let calendarCursor = new Date();

function formatDateKey(year, month, day) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
}

function renderCalendar() {
    if (!calendarTitle || !calendarGrid) return;
    if (!state.gymAttendance || typeof state.gymAttendance !== 'object') {
        state.gymAttendance = {};
    }

    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();
    const monthName = calendarCursor.toLocaleString('en-US', { month: 'long' });
    calendarTitle.textContent = `${monthName} ${year}`;

    const firstDay = new Date(year, month, 1);
    const lastDate = new Date(year, month + 1, 0).getDate();
    const offset = firstDay.getDay();
    const today = new Date();

    calendarGrid.innerHTML = '';

    for (let i = 0; i < offset; i += 1) {
        const blank = document.createElement('button');
        blank.type = 'button';
        blank.className = 'calendar-day empty';
        blank.disabled = true;
        calendarGrid.appendChild(blank);
    }

    for (let day = 1; day <= lastDate; day += 1) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'calendar-day';
        btn.textContent = String(day);
        btn.dataset.day = String(day);

        if (
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day
        ) {
            btn.classList.add('today');
        }

        const key = formatDateKey(year, month, day);
        if (state.gymAttendance[key]) {
            btn.classList.add('attended');
        }

        calendarGrid.appendChild(btn);
    }
}

function drawGoalProcess() {
    if (!goalChart) return;
    const ctx = goalChart.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = goalChart.clientWidth;
    const height = 260;

    goalChart.width = width * dpr;
    goalChart.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const pad = { top: 20, right: 20, bottom: 34, left: 38 };
    const graphW = width - pad.left - pad.right;
    const graphH = height - pad.top - pad.bottom;
    const stepX = graphW / (labels.length - 1);

    const goalSeries = [30, 24, 48, 58, 34, 38, 33];

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = '#edf0f7';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i += 1) {
        const y = pad.top + (graphH / 5) * i;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.stroke();
    }

    ctx.fillStyle = '#9aa2b3';
    ctx.font = '12px Segoe UI';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i += 1) {
        const value = 100 - i * 20;
        const y = pad.top + (graphH / 5) * i + 4;
        ctx.fillText(`${value}%`, pad.left - 8, y);
    }

    ctx.textAlign = 'center';
    labels.forEach((label, i) => {
        const x = pad.left + stepX * i;
        ctx.fillText(label, x, height - 10);
    });

    const curvePoints = goalSeries.map((value, index) => ({
        x: pad.left + index * stepX,
        y: pad.top + graphH - (value / 100) * graphH
    }));

    function traceCurve() {
        curvePoints.forEach((pt, index) => {
            if (index === 0) ctx.moveTo(pt.x, pt.y);
            else {
                const prev = curvePoints[index - 1];
                const cpX = (prev.x + pt.x) / 2;
                ctx.bezierCurveTo(cpX, prev.y, cpX, pt.y, pt.x, pt.y);
            }
        });
    }

    ctx.beginPath();
    traceCurve();
    ctx.strokeStyle = '#f59a54';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    traceCurve();
    ctx.lineTo(curvePoints[curvePoints.length - 1].x, pad.top + graphH);
    ctx.lineTo(curvePoints[0].x, pad.top + graphH);
    ctx.closePath();
    const area = ctx.createLinearGradient(0, pad.top, 0, pad.top + graphH);
    area.addColorStop(0, 'rgba(245, 154, 84, 0.35)');
    area.addColorStop(1, 'rgba(245, 154, 84, 0)');
    ctx.fillStyle = area;
    ctx.fill();

    const focusIndex = 3;
    const fx = pad.left + focusIndex * stepX;
    const fy = pad.top + graphH - (goalSeries[focusIndex] / 100) * graphH;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx, height - pad.bottom);
    ctx.strokeStyle = '#e7ad83';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(fx, fy, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff0e4';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(fx, fy, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#f59a54';
    ctx.fill();
    ctx.fillStyle = '#f59a54';
    ctx.textAlign = 'center';
    ctx.fillText('58%', fx, fy - 10);

    ctx.font = '12px Segoe UI';
    ctx.textAlign = 'left';
    const legendY = 16;
    function drawLegendItem(x, color, label) {
        ctx.fillStyle = color;
        ctx.fillRect(x, legendY - 8, 9, 9);
        ctx.fillStyle = '#a8b2c5';
        ctx.fillText(label, x + 14, legendY);
    }
    drawLegendItem(pad.left, '#8e75ff', 'Body Building');
    drawLegendItem(pad.left + 126, '#f59a54', 'Yoga class');
    drawLegendItem(pad.left + 232, '#79d68d', 'Fat Reduction');
}

function renderToggleList(listId, dataKey, options = {}) {
    const { showDelete = true, showMenuDots = false } = options;
    const list = document.getElementById(listId);
    if (!list) return;

    list.innerHTML = '';

    state[dataKey].forEach((item, index) => {
        const li = document.createElement('li');
        li.className = item.done ? 'done' : '';
        li.innerHTML = showDelete
            ? `<label><input type="checkbox" data-key="${dataKey}" data-index="${index}" ${item.done ? 'checked' : ''}> <span class="todo-text">${item.text}</span></label><button type="button" data-delete="${dataKey}" data-index="${index}">Delete</button>`
            : `<label><input type="checkbox" data-key="${dataKey}" data-index="${index}" ${item.done ? 'checked' : ''}> <span class="todo-text">${item.text}</span></label>${showMenuDots ? '<button type="button" class="todo-dots" aria-label="Task options">&#8942;</button>' : ''}`;
        list.appendChild(li);
    });
}

function renderTodoList() {
    normalizeChecklist('todos');
    const list = document.getElementById('todo-list');
    if (!list) return;
    list.innerHTML = '';

    if (!isDashboardTodoPreset(state.todos)) {
        state.todos = dashboardTodoPreset.map((text) => ({ text, done: false }));
        saveState();
    }

    state.todos.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = item.done ? 'done' : '';
        li.innerHTML = `<label><input type="checkbox" data-key="todos" data-index="${index}" ${item.done ? 'checked' : ''}> <span class="todo-text">${item.text}</span></label><button type="button" class="todo-dots" aria-label="Task options">&#8942;</button>`;
        list.appendChild(li);
    });
}

function renderGoals() {
    const target = document.getElementById('goal-tracker');
    if (!target) return;
    target.innerHTML = '';
    state.goals.forEach((goal) => {
        const row = document.createElement('div');
        row.className = 'goal-entry';
        row.innerHTML = `
            <div class="goal-entry-head"><strong>${goal.title}</strong><span>${goal.progress}%</span></div>
            <div class="goal-entry-bar"><span style="width:${goal.progress}%"></span></div>
        `;
        target.appendChild(row);
    });
}

function generateDietPlan(goal, type) {
    const byGoal = {
        'fat-loss': [
            'Breakfast: Veg omelette + oats (low oil)',
            'Lunch: Grilled protein + salad + brown rice',
            'Snack: Greek yogurt + seeds',
            'Dinner: Stir-fry veggies + lean protein'
        ],
        'muscle-gain': [
            'Breakfast: Oats + milk + banana + peanut butter',
            'Lunch: Chicken/paneer rice bowl + veggies',
            'Snack: Whey shake + nuts',
            'Dinner: Roti + dal + paneer/chicken'
        ],
        maintenance: [
            'Breakfast: Eggs + multigrain toast + fruit',
            'Lunch: Balanced plate with protein/carb/fiber',
            'Snack: Fruit + nuts',
            'Dinner: Light protein-rich meal'
        ]
    };
    const byType = {
        balanced: 'Balanced macro split with moderate carbs and protein.',
        vegetarian: 'Vegetarian protein focus using paneer, tofu, dal, soy.',
        'high-protein': 'Higher protein intake with lower sugar choices.'
    };
    return {
        note: byType[type] || byType.balanced,
        meals: byGoal[goal] || byGoal.maintenance
    };
}

function renderDietPlan(plan) {
    const list = document.getElementById('diet-plan-list');
    if (!list) return;
    if (!plan) {
        list.innerHTML = '';
        return;
    }
    list.innerHTML = `
        <li><strong>Plan Description:</strong> <span class="meta">${plan.note}</span></li>
        ${plan.meals.map((meal) => `<li>${meal}</li>`).join('')}
    `;
}

function renderMembers(filterText = '') {
    const list = document.getElementById('members-list');
    if (!list) return;
    const q = filterText.trim().toLowerCase();
    const members = state.members.filter((name) => name.toLowerCase().includes(q));
    list.innerHTML = members.map((name) => `<li>${name}</li>`).join('');
}

function renderFriends() {
    const list = document.getElementById('friends-list');
    if (!list) return;
    list.innerHTML = state.friends
        .map((name) => `<li data-friend="${name}" class="${name === state.activeFriend ? 'active-friend' : ''}">${name}</li>`)
        .join('');
}

function renderConversation() {
    const title = document.getElementById('chat-title');
    const history = document.getElementById('chat-history');
    if (!title || !history) return;
    const friend = state.activeFriend || state.friends[0];
    title.textContent = friend ? `Conversation with ${friend}` : 'Conversation';
    const messages = friend ? (state.conversations[friend] || []) : [];
    history.innerHTML = messages
        .map((msg) => `<li class="${msg.from === 'you' ? 'from-you' : 'from-friend'}"><span>${msg.from === 'you' ? 'You' : friend}: ${msg.text}</span></li>`)
        .join('');
}

function bindAddForm(formId, inputId, key, mapFn, options = {}) {
    const { prepend = false } = options;
    const form = document.getElementById(formId);
    const input = document.getElementById(inputId);
    if (!form || !input) return;

    const addItem = () => {
        const value = input.value.trim();
        if (!value) return;
        if (!Array.isArray(state[key])) {
            state[key] = [];
        }
        if (prepend) {
            state[key].unshift(mapFn(value));
        } else {
            state[key].push(mapFn(value));
        }
        input.value = '';
        saveState();
        renderAll();
        if (key === 'todos') {
            const todoList = document.getElementById('todo-list');
            if (todoList) {
                todoList.scrollTop = 0;
            }
        }
    };

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        addItem();
    });

    const button = form.querySelector('button[type="button"]');
    if (button) {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            addItem();
        });
    }

    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            addItem();
        }
    });
}

function bindStaticEvents() {
    sideNavLinks.forEach((link) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const view = link.dataset.view;
            if (!view) return;
            setActiveView(view);
        });
    });

    document.addEventListener('change', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        if (target.dataset.key) {
            const key = target.dataset.key;
            const index = Number(target.dataset.index);
            if (state[key] && state[key][index]) {
                state[key][index].done = target.checked;
                saveState();
                renderAll();
            }
        }
    });

    document.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const key = target.getAttribute('data-delete');
        const index = Number(target.getAttribute('data-index'));
        if (key && state[key] && Number.isInteger(index)) {
            state[key].splice(index, 1);
            saveState();
            renderAll();
        }

        const friend = target.getAttribute('data-friend');
        if (friend) {
            state.activeFriend = friend;
            saveState();
            renderFriends();
            renderConversation();
        }
    });

    const goalForm = document.getElementById('goal-form');
    const goalTitle = document.getElementById('goal-title');
    const goalProgress = document.getElementById('goal-progress');
    if (goalForm && goalTitle && goalProgress) {
        goalForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const title = goalTitle.value.trim();
            const progress = Math.max(0, Math.min(100, Number(goalProgress.value) || 0));
            if (!title) return;
            state.goals.push({ title, progress });
            goalTitle.value = '';
            goalProgress.value = '';
            saveState();
            renderAll();
        });
    }

    const membersFilter = document.getElementById('members-filter');
    if (membersFilter) {
        membersFilter.addEventListener('input', () => renderMembers(membersFilter.value));
    }

    const dietProfileForm = document.getElementById('diet-profile-form');
    const dietGoal = document.getElementById('diet-goal');
    const dietType = document.getElementById('diet-type');
    if (dietProfileForm && dietGoal && dietType) {
        dietProfileForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const plan = generateDietPlan(dietGoal.value, dietType.value);
            renderDietPlan(plan);
        });
    }

    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    if (messageForm && messageInput) {
        messageForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const text = messageInput.value.trim();
            const friend = state.activeFriend;
            if (!text || !friend) return;
            state.conversations[friend] = state.conversations[friend] || [];
            state.conversations[friend].push({ from: 'you', text });
            messageInput.value = '';
            saveState();
            renderConversation();
        });
    }

    const friendForm = document.getElementById('friend-form');
    const friendInput = document.getElementById('friend-input');
    if (friendForm && friendInput) {
        friendForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const name = friendInput.value.trim();
            if (!name) return;
            if (!state.friends.includes(name)) state.friends.push(name);
            state.conversations[name] = state.conversations[name] || [];
            state.activeFriend = name;
            friendInput.value = '';
            saveState();
            renderFriends();
            renderConversation();
        });
    }

    const notif = document.getElementById('notif-setting');
    const email = document.getElementById('email-setting');
    const units = document.getElementById('units-setting');
    if (notif && email && units) {
        notif.checked = !!state.settings.notifications;
        email.checked = !!state.settings.emailSummary;
        units.value = state.settings.units || 'metric';
        notif.addEventListener('change', () => {
            state.settings.notifications = notif.checked;
            saveState();
        });
        email.addEventListener('change', () => {
            state.settings.emailSummary = email.checked;
            saveState();
        });
        units.addEventListener('change', () => {
            state.settings.units = units.value;
            saveState();
        });
    }

    bindAddForm('diet-form', 'diet-input', 'diets', (text) => ({ text, done: false }));
    bindAddForm('workout-form', 'workout-input', 'workouts', (text) => ({ text, done: false }));
    bindAddForm('supplement-form', 'supplement-input', 'supplements', (text) => ({ text, done: false }));
    bindAddForm('trainer-form', 'trainer-input', 'trainer', (text) => ({ text, done: false }));
    bindAddForm('today-goal-form', 'today-goal-input', 'todayGoals', (text) => ({ text, done: false }));

    if (calendarPrev && calendarNext && calendarGrid) {
        calendarPrev.addEventListener('click', () => {
            calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
            renderCalendar();
        });
        calendarNext.addEventListener('click', () => {
            calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
            renderCalendar();
        });
        calendarGrid.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof HTMLButtonElement)) return;
            const day = Number(target.dataset.day);
            if (!day) return;
            const year = calendarCursor.getFullYear();
            const month = calendarCursor.getMonth();
            const key = formatDateKey(year, month, day);
            state.gymAttendance[key] = !state.gymAttendance[key];
            saveState();
            renderCalendar();
        });
    }

}

function renderAll() {
    renderTodoList();
    renderToggleList('diet-list', 'diets');
    renderToggleList('workout-list', 'workouts');
    renderToggleList('supplement-list', 'supplements');
    renderToggleList('trainer-list', 'trainer');
    renderToggleList('today-goal-list', 'todayGoals');
    renderGoals();
    renderMembers();
    renderFriends();
    renderConversation();
    renderCalendar();
    if (state.view === 'dashboard') drawGoalProcess();
}

async function initializeClientPage() {
    const initialUser = await requireAuthenticatedUser();
    if (!initialUser) {
        return;
    }

    const user = await syncAccountDisplayName(initialUser);
    applyAuthenticatedUser(user);

    if (clientSupabase) {
        clientSupabase.auth.onAuthStateChange((_event, session) => {
            if (!session?.user) {
                window.location.replace(getLoginRedirectUrl());
                return;
            }
            applyAuthenticatedUser(session.user);
        });
    }

    bindStaticEvents();
    const routeView = getViewFromLocation();
    const isMainClientPage = window.location.pathname.toLowerCase().endsWith('client.html');
    setActiveView(routeView || (isMainClientPage ? 'dashboard' : state.view) || 'dashboard');
    renderAll();
    const defaultGoal = document.getElementById('diet-goal');
    const defaultType = document.getElementById('diet-type');
    renderDietPlan(generateDietPlan(defaultGoal ? defaultGoal.value : 'fat-loss', defaultType ? defaultType.value : 'balanced'));
    drawGoalProcess();
    requestAnimationFrame(drawGoalProcess);
    setTimeout(drawGoalProcess, 120);
    window.addEventListener('resize', drawGoalProcess);

    if (goalChart && typeof ResizeObserver !== 'undefined') {
        const chartObserver = new ResizeObserver(() => drawGoalProcess());
        const chartContainer = goalChart.closest('.goal-process');
        if (chartContainer) {
            chartObserver.observe(chartContainer);
        }
    }
}

initializeClientPage();

