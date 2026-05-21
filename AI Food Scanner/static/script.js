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
    const res  = await fetch('/api/analyze', { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `Failed to fetch. Server responded with ${res.status}.`);
    }

    // Populate data
    valCalories.textContent = data.total_calories || 0;
    valConfidence.textContent = (data.confidence || 0) + '%';

    // Render Ingredients List
    if (data.items && data.items.length > 0) {
      ingredientsList.innerHTML = data.items.map(i => `
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

    // Sum macros
    let p = 0, c = 0, f = 0, fiber = 0; // Fiber isn't parsed in backend typically, mock it if needed or 0
    if (data.items) {
      data.items.forEach(i => {
        p += i.protein_g || 0;
        c += i.carbs_g || 0;
        f += i.fat_g || 0;
        fiber += i.fiber_g || 0;
      });
    }

    valProtein.textContent = p + 'g';
    valCarbs.textContent = c + 'g';
    valFat.textContent = f + 'g';
    valFiber.textContent = fiber + 'g';

  } catch (err) {
    showError(err.message || 'Failed to fetch. Please try again.');
  } finally {
    btnInner.classList.remove('hidden');
    btnLoader.classList.add('hidden');
    analyzeBtn.disabled = false;
  }
});
