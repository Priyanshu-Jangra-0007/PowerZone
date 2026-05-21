/**
 * PowerZone Food Scanner — Frontend Logic
 */

/* ── State ──────────────────────────────────────────────────────────────────── */
let selectedFile = null;

/* ── DOM Refs ────────────────────────────────────────────────────────────────── */
const dropZone         = document.getElementById('dropZone');
const dropZoneContent  = document.getElementById('dropZoneContent');
const previewImage     = document.getElementById('previewImage');
const removeBtn        = document.getElementById('removeBtn');
const fileInput        = document.getElementById('fileInput');

const analyzeBtn       = document.getElementById('analyzeBtn');
const btnInner         = document.getElementById('btnInner');
const btnLoader        = document.getElementById('btnLoader');

const errorCard        = document.getElementById('errorCard');
const errorMessage     = document.getElementById('errorMessage');

// Output fields
const valItems         = document.getElementById('valItems');
const valCalories      = document.getElementById('valCalories');
const valDetected      = document.getElementById('valDetected');
const valConfidence    = document.getElementById('valConfidence');
const valProtein       = document.getElementById('valProtein');
const valCarbs         = document.getElementById('valCarbs');
const valFat           = document.getElementById('valFat');
const valFiber         = document.getElementById('valFiber');

const ingredientsList  = document.getElementById('ingredientsList');

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
function showError(msg) {
  errorMessage.textContent = msg;
  errorCard.classList.remove('hidden');
}

function hideError() {
  errorCard.classList.add('hidden');
}

function resetResults() {
  valCalories.textContent = '-';
  valConfidence.textContent = '-';
  valProtein.textContent = '-';
  valCarbs.textContent = '-';
  valFat.textContent = '-';
  valFiber.textContent = '-';
  ingredientsList.innerHTML = '<span class="data-label">No items detected yet.</span>';
}

function getScannerUrls() {
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return location.port === '5000'
      ? ['/api/analyze', 'http://127.0.0.1:8000/api/scan']
      : ['http://127.0.0.1:8000/api/scan', '/api/scan'];
  }
  return ['/api/scan', '/api/analyze'];
}

function normalizeScanData(data) {
  const items = Array.isArray(data.items) ? data.items : [];
  const confidencePercent = Number.isFinite(Number(data.confidence_percent))
    ? Number(data.confidence_percent)
    : Number(data.confidence) <= 1
      ? Number(data.confidence || 0) * 100
      : Number(data.confidence || 0);

  return {
    calories: Number(data.calories_kcal ?? data.total_calories ?? 0),
    confidence: confidencePercent,
    items,
    protein: Number(data.total_protein_g ?? items.reduce((sum, item) => sum + Number(item.protein_g || 0), 0)),
    carbs: Number(data.total_carbs_g ?? items.reduce((sum, item) => sum + Number(item.carbs_g || 0), 0)),
    fat: Number(data.total_fat_g ?? items.reduce((sum, item) => sum + Number(item.fat_g || 0), 0)),
  };
}

async function callScannerApi(formData) {
  let lastError = null;

  for (const url of getScannerUrls()) {
    try {
      const res = await fetch(url, { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || data.detail || `Failed to fetch. Server responded with ${res.status}.`);
      }

      return data;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Scanner API is unavailable.');
}

/* ── File Handling ────────────────────────────────────────────────────────── */
function setFile(file) {
  const allowed = ['image/jpeg', 'image/png'];
  if (!allowed.includes(file.type)) {
    showError('Please upload a JPG, JPEG, or PNG image.');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showError('File is too large. Maximum size is 10 MB.');
    return;
  }
  hideError();
  selectedFile = file;

  const reader = new FileReader();
  reader.onload = e => {
    previewImage.src = e.target.result;
    dropZoneContent.classList.add('hidden');
    previewImage.classList.remove('hidden');
    removeBtn.classList.remove('hidden');
    analyzeBtn.disabled = false;
  };
  reader.readAsDataURL(file);
}

function clearFile() {
  selectedFile = null;
  fileInput.value = '';
  previewImage.src = '';
  previewImage.classList.add('hidden');
  removeBtn.classList.add('hidden');
  dropZoneContent.classList.remove('hidden');
  analyzeBtn.disabled = true;
  resetResults();
  hideError();
}

/* ── Drop Zone Events ─────────────────────────────────────────────────────── */
dropZone.addEventListener('click', (e) => {
  if (e.target.id !== 'removeBtn') {
    fileInput.click();
  }
});
dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.style.borderColor = 'var(--primary)';
});
dropZone.addEventListener('dragleave', e => {
  e.preventDefault();
  dropZone.style.borderColor = 'var(--border)';
});
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.style.borderColor = 'var(--border)';
  if (e.dataTransfer.files.length) {
    setFile(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener('change', () => {
  if (fileInput.files.length) {
    setFile(fileInput.files[0]);
  }
});

removeBtn.addEventListener('click', e => {
  e.stopPropagation();
  clearFile();
});

/* ── Analyze ──────────────────────────────────────────────────────────────── */
analyzeBtn.addEventListener('click', async () => {
  if (!selectedFile) return;
  hideError();

  // Loading state
  btnInner.classList.add('hidden');
  btnLoader.classList.remove('hidden');
  analyzeBtn.disabled = true;

  const formData = new FormData();
  formData.append('file', selectedFile);
  formData.append('prompt', ''); // No prompt field in new UI

  try {
    const data = await callScannerApi(formData);

    const normalized = normalizeScanData(data);

    // Populate data
    valCalories.textContent = normalized.calories || 0;
    valConfidence.textContent = normalized.confidence.toFixed(1) + '%';

    // Render Ingredients List
    if (normalized.items.length > 0) {
      ingredientsList.innerHTML = normalized.items.map(i => `
        <div class="ingredient-item">
          <div>
            <div class="ingredient-name">${i.name}</div>
            <div class="ingredient-macros">P: ${i.protein_g}g | C: ${i.carbs_g}g | F: ${i.fat_g}g</div>
          </div>
          <div class="ingredient-cal">${i.calories} kcal</div>
        </div>
      `).join('');
    } else {
      ingredientsList.innerHTML = '<span class="data-label">No items detected.</span>';
    }

    valProtein.textContent = normalized.protein + 'g';
    valCarbs.textContent = normalized.carbs + 'g';
    valFat.textContent = normalized.fat + 'g';
    valFiber.textContent = '0g';

  } catch (err) {
    showError(err.message || 'Failed to fetch. Please try again.');
  } finally {
    btnInner.classList.remove('hidden');
    btnLoader.classList.add('hidden');
    analyzeBtn.disabled = false;
  }
});
