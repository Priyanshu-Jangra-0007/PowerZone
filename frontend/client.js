const STORAGE_KEY = 'powerzone-client-state-v1';
const goalChart = document.getElementById('goal-process-chart');
const navLinks = Array.from(document.querySelectorAll('.side-nav a[data-view]'));
const panels = Array.from(document.querySelectorAll('.dashboard-view[data-panel]'));

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
    }
};

let state = loadState();

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

function setActiveView(view) {
    const normalized = panels.some((panel) => panel.dataset.panel === view) ? view : 'dashboard';
    state.view = normalized;
    navLinks.forEach((link) => link.classList.toggle('active', link.dataset.view === normalized));
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

    if (!state.todos.length) {
        const empty = document.createElement('li');
        empty.className = 'todo-empty';
        empty.textContent = 'Add workout task...';
        list.appendChild(empty);
        return;
    }

    state.todos.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = item.done ? 'done' : '';
        li.innerHTML = `<label><input type="checkbox" data-key="todos" data-index="${index}" ${item.done ? 'checked' : ''}> <span class="todo-text">${item.text}</span></label><button type="button" data-delete="todos" data-index="${index}">Delete</button>`;
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
    navLinks.forEach((link) => {
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
    bindAddForm('dashboard-todo-form', 'dashboard-todo-input', 'todos', (text) => ({ text, done: false }), { prepend: true });
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
    if (state.view === 'dashboard') drawGoalProcess();
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

