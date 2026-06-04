const form = document.querySelector('#coachForm');
const messageInput = document.querySelector('#message');
const submitButton = document.querySelector('#submitButton');
const statusEl = document.querySelector('#status');
const resultTitle = document.querySelector('#resultTitle');
const summaryEl = document.querySelector('#summary');
const exerciseList = document.querySelector('#exerciseList');
const jsonOutput = document.querySelector('#jsonOutput');
const clearButton = document.querySelector('#clearButton');

const state = {
    history: [],
    seen_exercises: [],
    excluded_exercises: []
};

const API_CANDIDATES = (() => {
    const candidates = [];
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.protocol === 'file:') {
        candidates.push({ name: 'fastapi-local', url: 'http://127.0.0.1:8000/api/forge-ai' });
    } else {
        candidates.push({ name: 'production', url: '/api/forge-ai' });
    }
    return candidates;
})();

function setStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.classList.toggle('is-error', isError);
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function listItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
        return '';
    }

    return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderResponse(data) {
    const response = data.response || {};
    state.history = data.history || [];
    state.seen_exercises = data.seen_exercises || [];
    state.excluded_exercises = data.excluded_exercises || [];

    const titleParts = [
        response.request_type?.replaceAll('_', ' '),
        response.focus || response.target
    ].filter(Boolean);

    resultTitle.textContent = titleParts.length ? titleParts.join(' - ') : 'ForgeAi response';
    summaryEl.className = 'forge-ai-summary';
    summaryEl.textContent = response.reasoning || 'Generated workout response.';

    const exercises = response.exercises || [];
    exerciseList.innerHTML = exercises.map((exercise) => `
        <article class="forge-ai-exercise-card">
            <h3>${escapeHtml(exercise.name || 'Exercise')}</h3>
            <div class="forge-ai-meta-row">
                ${exercise.muscle_group ? `<span class="forge-ai-pill">${escapeHtml(exercise.muscle_group)}</span>` : ''}
                ${exercise.equipment ? `<span class="forge-ai-pill">${escapeHtml(exercise.equipment)}</span>` : ''}
                ${exercise.sets ? `<span class="forge-ai-pill">${escapeHtml(exercise.sets)} sets</span>` : ''}
                ${exercise.reps ? `<span class="forge-ai-pill">${escapeHtml(exercise.reps)} reps</span>` : ''}
                ${exercise.rest ? `<span class="forge-ai-pill">${escapeHtml(exercise.rest)} rest</span>` : ''}
            </div>
            ${exercise.why_selected ? `<p>${escapeHtml(exercise.why_selected)}</p>` : ''}
            ${listItems(exercise.instructions)}
            ${listItems(exercise.form_tips)}
        </article>
    `).join('');

    jsonOutput.textContent = JSON.stringify(response, null, 2);
}

async function parseResponseBody(response) {
    const rawText = await response.text();
    if (!rawText) {
        return null;
    }

    try {
        return JSON.parse(rawText);
    } catch (_error) {
        return { raw: rawText };
    }
}

async function callForgeAiApi(payload) {
    let lastError = null;

    for (const candidate of API_CANDIDATES) {
        try {
            const response = await fetch(candidate.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await parseResponseBody(response);

            if (!response.ok) {
                const apiError = new Error(
                    data?.detail ||
                    data?.error ||
                    data?.raw ||
                    `Request failed (${response.status})`
                );
                apiError.isApiError = true;
                apiError.status = response.status;
                apiError.sourceName = candidate.name;
                lastError = apiError;

                if (response.status === 404 || response.status === 405) {
                    continue;
                }
                throw apiError;
            }

            if (!data || typeof data !== 'object') {
                throw new Error('ForgeAi returned an empty response.');
            }

            return data;
        } catch (error) {
            if (error?.isApiError) {
                throw error;
            }

            lastError = new Error(`${candidate.name}: ${error.message}`);
        }
    }

    throw lastError || new Error('ForgeAi API is unreachable.');
}

async function submitPrompt(message) {
    submitButton.disabled = true;
    setStatus('ForgeAi is building your workout...');

    try {
        const data = await callForgeAiApi({
            message,
            history: state.history,
            seen_exercises: state.seen_exercises,
            excluded_exercises: state.excluded_exercises
        });

        renderResponse(data);
        setStatus('ForgeAi is ready for the next prompt.');
    } catch (error) {
        const isLocalPage = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.protocol === 'file:';
        const fallbackMessage = isLocalPage
            ? 'ForgeAi API is not reachable. Start the FastAPI server on http://127.0.0.1:8000 and try again.'
            : 'ForgeAi request failed.';
        setStatus(error.message || fallbackMessage, true);
    } finally {
        submitButton.disabled = false;
        messageInput.focus();
    }
}

form.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = messageInput.value.trim() || 'Give me the full workout route for today.';
    submitPrompt(message);
});

document.querySelectorAll('[data-prompt]').forEach((button) => {
    button.addEventListener('click', () => {
        messageInput.value = button.dataset.prompt;
        submitPrompt(button.dataset.prompt);
    });
});

clearButton.addEventListener('click', () => {
    state.history = [];
    state.seen_exercises = [];
    state.excluded_exercises = [];
    messageInput.value = '';
    resultTitle.textContent = 'Waiting for your request';
    summaryEl.className = 'forge-ai-summary forge-ai-summary-empty';
    summaryEl.textContent = 'Type a request above to generate a personalized workout response.';
    exerciseList.innerHTML = '';
    jsonOutput.textContent = '{}';
    setStatus('');
    messageInput.focus();
});
