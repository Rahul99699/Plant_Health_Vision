// === NAVBAR + SMOOTH SCROLL =======================

const navbar = document.querySelector('.navbar');
const navLinks = document.querySelectorAll('.nav-link');
const menuToggle = document.querySelector('.menu-toggle');
const navLinksContainer = document.querySelector('.nav-links');
const scrollToHowBtn = document.getElementById('scrollToHow');

window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

menuToggle.addEventListener('click', () => {
    navLinksContainer.classList.toggle('open');
});

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
        navLinksContainer.classList.remove('open');
    });
});

if (scrollToHowBtn) {
    scrollToHowBtn.addEventListener('click', () => {
        const target = document.querySelector('#how-it-works');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

// === THEME TOGGLE (3 themes: dark, light, nature) ===

const themeToggle = document.getElementById('themeToggle');
const body = document.body;
const themes = ['dark', 'light', 'nature'];

function setTheme(theme) {
    body.setAttribute('data-theme', theme);
    localStorage.setItem('agriscan-theme', theme);
    const icon = themeToggle.querySelector('i');
    if (theme === 'light') {
        icon.className = 'fas fa-sun';
    } else if (theme === 'nature') {
        icon.className = 'fas fa-leaf';
    } else {
        icon.className = 'fas fa-moon';
    }
}

// Load saved theme
const savedTheme = localStorage.getItem('agriscan-theme');
if (themes.includes(savedTheme)) {
    setTheme(savedTheme);
} else {
    setTheme('dark');
}

themeToggle.addEventListener('click', () => {
    const current = body.getAttribute('data-theme') || 'dark';
    const index = themes.indexOf(current);
    const next = themes[(index + 1) % themes.length];
    setTheme(next);
});

// === REVEAL ON SCROLL =============================

const revealEls = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver(
    entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = entry.target.style.getPropertyValue('--delay') || '0s';
                entry.target.style.transitionDelay = delay;
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    },
    { threshold: 0.12 }
);

revealEls.forEach(el => observer.observe(el));

// === COUNTERS =====================================

const counters = document.querySelectorAll('.counter');
let countersStarted = false;

const counterObserver = new IntersectionObserver(
    entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !countersStarted) {
                countersStarted = true;
                counters.forEach(counter => {
                    const target = parseFloat(counter.dataset.target || '0');
                    const suffix = counter.dataset.suffix || '';
                    const decimals = parseInt(counter.dataset.decimals || '0', 10);
                    const duration = 1400;
                    const startTime = performance.now();

                    function update(now) {
                        const elapsed = now - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        const value = target * progress;
                        const formatted = value.toFixed(decimals);
                        counter.textContent = `${formatted}${suffix}`;
                        if (progress < 1) {
                            requestAnimationFrame(update);
                        }
                    }

                    requestAnimationFrame(update);
                });
                counterObserver.disconnect();
            }
        });
    },
    { threshold: 0.4 }
);

counters.forEach(c => counterObserver.observe(c));

// === TOAST NOTIFICATIONS ==========================

const toastContainer = document.getElementById('toastContainer');

function showToast(message, type = 'success', timeout = 2500) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const iconClass = type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check';
    toast.innerHTML = `<i class="fas ${iconClass}"></i><span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(6px)';
        setTimeout(() => toast.remove(), 250);
    }, timeout);
}

// === UPLOAD & PREVIEW =============================

const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const browseBtn = document.getElementById('browseBtn');
const imagePreview = document.getElementById('imagePreview');
const previewImage = document.getElementById('previewImage');
const removeBtn = document.getElementById('removeBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const sampleBtn = document.getElementById('sampleBtn');
const loadingEl = document.getElementById('loading');
const analyzeHint = document.querySelector('.analyze-hint');

const viewOriginalBtn = document.getElementById('viewOriginalBtn');
const viewAiBtn = document.getElementById('viewAiBtn');
const aiOverlay = document.getElementById('aiOverlay');

const thumbsContainer = document.getElementById('thumbsContainer');

const mobileUploadBtn = document.getElementById('mobileUploadBtn');
const mobileAnalyzeBtn = document.getElementById('mobileAnalyzeBtn');

let currentImageDataUrl = null;
let recentImages = [];

function enableAnalyze(enabled) {
    analyzeBtn.disabled = !enabled;
    analyzeBtn.setAttribute('aria-disabled', String(!enabled));
    if (enabled) {
        analyzeHint.textContent = 'Ready to analyze image';
    } else {
        analyzeHint.textContent = 'No image is uploaded yet';
    }
}

function setView(mode) {
    if (mode === 'ai') {
        aiOverlay.classList.add('visible');
        viewOriginalBtn.classList.remove('active');
        viewAiBtn.classList.add('active');
    } else {
        aiOverlay.classList.remove('visible');
        viewOriginalBtn.classList.add('active');
        viewAiBtn.classList.remove('active');
    }
}

function showPreview(src, pushToHistory = true) {
    imagePreview.classList.add('visible');
    previewImage.src = src;
    currentImageDataUrl = src;
    enableAnalyze(true);
    setView('original');

    if (pushToHistory) {
        recentImages.unshift(src);
        if (recentImages.length > 8) recentImages.pop();
        renderThumbs();
    }
}

function clearPreview() {
    imagePreview.classList.remove('visible');
    previewImage.removeAttribute('src');
    currentImageDataUrl = null;
    enableAnalyze(false);
}

function renderThumbs() {
    thumbsContainer.innerHTML = '';
    if (!recentImages.length) {
        const p = document.createElement('p');
        p.className = 'no-thumbs';
        p.textContent = 'No recent images yet.';
        thumbsContainer.appendChild(p);
        return;
    }
    recentImages.forEach(src => {
        const div = document.createElement('div');
        div.className = 'thumb';
        div.innerHTML = `<img src="${src}" alt="Previous leaf">`;
        div.addEventListener('click', () => showPreview(src, false));
        thumbsContainer.appendChild(div);
    });
}

browseBtn.addEventListener('click', () => imageInput.click());
if (mobileUploadBtn) {
    mobileUploadBtn.addEventListener('click', () => imageInput.click());
}

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file.', 'error');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        showToast('Max file size is 5MB.', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
        showPreview(ev.target.result);
        showToast('Image loaded successfully.', 'success');
    };
    reader.readAsDataURL(file);
});

['dragenter', 'dragover'].forEach(eventName => {
    uploadArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.add('dragover');
    });
});

['dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('dragover');
    });
});

uploadArea.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showToast('Please drop an image file.', 'error');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        showToast('Max file size is 5MB.', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
        showPreview(ev.target.result);
        showToast('Image dropped successfully.', 'success');
    };
    reader.readAsDataURL(file);
});

removeBtn.addEventListener('click', () => {
    imageInput.value = '';
    clearPreview();
});

viewOriginalBtn.addEventListener('click', () => setView('original'));
viewAiBtn.addEventListener('click', () => setView('ai'));

// Sample image (placeholder)
sampleBtn.addEventListener('click', () => {
    const sampleUrl = 'https://images.unsplash.com/photo-1535295972055-1c762f4483e5?auto=format&fit=crop&w=800&q=80';
    showPreview(sampleUrl);
    showToast('Sample image loaded.', 'success');
});

// === FAKE AI ANALYSIS LOGIC =======================

const confidenceScoreEl = document.getElementById('confidenceScore');
const confidenceGaugeEl = document.getElementById('confidenceGauge');
const diseaseNameEl = document.getElementById('diseaseName');
const diseaseDescriptionEl = document.getElementById('diseaseDescription');
const severityLevelEl = document.getElementById('severityLevel');
const severityTextEl = document.getElementById('severityText');
const treatmentOptionsEl = document.getElementById('treatmentOptions');
const preventiveListEl = document.getElementById('preventiveList');
const historyListEl = document.getElementById('historyList');
const resultTagsEl = document.getElementById('resultTags');
const exportHintEl = document.getElementById('exportHint');
const scanProgressEl = document.getElementById('scanProgress');
const scanBarEl = document.getElementById('scanBar');
const miniChartEl = document.getElementById('miniChart');
const scansTodayEl = document.getElementById('scansToday');

let severityHistory = [];

const mockDiseases = [
    {
        name: 'Early Blight',
        severity: 'moderate',
        confidenceRange: [84, 96],
        description: 'A common fungal disease causing brown patches with concentric rings on older leaves.',
        tags: ['fungal', 'tomato', 'potato'],
        treatments: [
            'Remove and destroy heavily infected leaves.',
            'Apply a copper-based or chlorothalonil fungicide as per label directions.',
            'Avoid overhead irrigation and water early in the day.'
        ],
        preventive: [
            'Rotate crops every season and avoid planting tomatoes after potatoes.',
            'Use resistant or tolerant plant varieties.',
            'Mulch around plants to prevent soil splash.'
        ]
    },
    {
        name: 'Powdery Mildew',
        severity: 'early',
        confidenceRange: [80, 92],
        description: 'White, powdery fungal growth on upper leaf surfaces, often in warm and dry conditions.',
        tags: ['fungal', 'leaf', 'common'],
        treatments: [
            'Prune infected parts to improve air circulation.',
            'Spray with sulfur or potassium bicarbonate-based fungicide.',
            'Avoid excess nitrogen fertilization.'
        ],
        preventive: [
            'Provide adequate spacing between plants.',
            'Grow resistant cultivars when available.',
            'Keep foliage as dry as possible.'
        ]
    },
    {
        name: 'Leaf Rust',
        severity: 'severe',
        confidenceRange: [88, 98],
        description: 'Orange or brown pustules on the underside of leaves leading to yellowing and premature leaf drop.',
        tags: ['rust', 'cereal', 'wheat'],
        treatments: [
            'Use systemic fungicides early when symptoms appear.',
            'Remove volunteer host plants around the field.',
            'Destroy highly infected plant debris after harvest.'
        ],
        preventive: [
            'Plant certified, rust-resistant varieties.',
            'Avoid overcrowding plants.',
            'Monitor fields regularly during humid weather.'
        ]
    },
    {
        name: 'Healthy Leaf',
        severity: 'none',
        confidenceRange: [90, 99],
        description: 'No significant disease symptoms detected. Leaf appears healthy and vigorous.',
        tags: ['healthy', 'no-disease'],
        treatments: [
            'No chemical treatment required at this stage.',
            'Continue routine crop management and monitoring.'
        ],
        preventive: [
            'Maintain balanced fertilization and irrigation.',
            'Scout fields weekly to detect early changes.',
            'Ensure good soil drainage.'
        ]
    }
];

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function mapSeverityToWidth(severity) {
    switch (severity) {
        case 'early':
            return 33;
        case 'moderate':
            return 66;
        case 'severe':
            return 100;
        case 'none':
        default:
            return 5;
    }
}

function mapSeverityText(severity) {
    switch (severity) {
        case 'early':
            return 'Early stage infection detected. Act now to prevent spread.';
        case 'moderate':
            return 'Moderate infection. Targeted treatment is recommended.';
        case 'severe':
            return 'Severe infection. Immediate and intensive action required.';
        case 'none':
        default:
            return 'No disease detected. Plant is currently healthy.';
    }
}

function updateHistory(diseaseName, confidence, severity) {
    const noHistoryEl = historyListEl.querySelector('.no-history');
    if (noHistoryEl) {
        noHistoryEl.remove();
    }

    const item = document.createElement('div');
    item.className = 'history-item';

    const left = document.createElement('div');
    const right = document.createElement('div');

    left.innerHTML = `
        <div class="history-disease">${diseaseName}</div>
        <div class="history-meta">
            <span>${severity.charAt(0).toUpperCase() + severity.slice(1)} severity</span>
        </div>
    `;

    const time = new Date();
    const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    right.className = 'history-meta';
    right.textContent = `${confidence}% • ${timeStr}`;

    item.appendChild(left);
    item.appendChild(right);

    historyListEl.prepend(item);
}

function setTags(tags) {
    resultTagsEl.innerHTML = '';
    if (!tags || !tags.length) return;
    tags.forEach(tag => {
        const span = document.createElement('span');
        span.className = 'result-tag';
        span.textContent = tag;
        resultTagsEl.appendChild(span);
    });
}

function typeText(element, text) {
    element.textContent = '';
    let index = 0;
    const interval = setInterval(() => {
        element.textContent += text.charAt(index);
        index++;
        if (index >= text.length) {
            clearInterval(interval);
        }
    }, 40);
}

function updateGauge(confidence) {
    const angle = confidence * 3.6;
    confidenceGaugeEl.style.backgroundImage =
        `conic-gradient(var(--accent-strong) 0deg ${angle}deg, #111827 ${angle}deg 360deg)`;
}

function updateMiniChart(severity) {
    severityHistory.unshift(severity);
    if (severityHistory.length > 6) severityHistory.pop();

    miniChartEl.innerHTML = '';
    severityHistory.forEach(s => {
        const bar = document.createElement('div');
        bar.className = 'mini-chart-bar';
        const value = mapSeverityToWidth(s);
        bar.style.height = `${Math.max(value, 10)}%`;
        miniChartEl.appendChild(bar);
    });
}

// scans today (simple counter)
function loadScansToday() {
    const todayKey = new Date().toISOString().slice(0, 10);
    const stored = localStorage.getItem('agriscan-scans');
    let data = stored ? JSON.parse(stored) : {};
    if (!data[todayKey]) data[todayKey] = 0;
    scansTodayEl.textContent = data[todayKey];
    return { todayKey, data };
}

function incrementScansToday() {
    const { todayKey, data } = loadScansToday();
    data[todayKey] = (data[todayKey] || 0) + 1;
    localStorage.setItem('agriscan-scans', JSON.stringify(data));
    scansTodayEl.textContent = data[todayKey];
}

loadScansToday();

// Main “Analyze” button: simulate AI
analyzeBtn.addEventListener('click', () => {
    if (!currentImageDataUrl) {
        showToast('Upload an image first.', 'error');
        return;
    }

    loadingEl.classList.add('active');
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';

    // scanning animation
    scanProgressEl.classList.add('active');
    scanBarEl.style.width = '0%';
    let progress = 0;
    const scanInterval = setInterval(() => {
        progress += 4;
        scanBarEl.style.width = `${Math.min(progress, 100)}%`;
        if (progress >= 100) {
            clearInterval(scanInterval);
        }
    }, 70);

    // Simulate model processing delay
    const delay = 1500 + Math.random() * 1000;
    setTimeout(() => {
        const randomDisease = mockDiseases[Math.floor(Math.random() * mockDiseases.length)];
        const [min, max] = randomDisease.confidenceRange;
        const confidence = randomBetween(min, max);

        // Update UI
        confidenceScoreEl.textContent = `${confidence}%`;
        updateGauge(confidence);

        typeText(diseaseNameEl, randomDisease.name);
        diseaseDescriptionEl.textContent = randomDisease.description;

        const severity = randomDisease.severity;
        const severityWidth = mapSeverityToWidth(severity);
        severityLevelEl.style.width = `${severityWidth}%`;
        severityTextEl.textContent = mapSeverityText(severity);

        // Treatments
        if (randomDisease.treatments && randomDisease.treatments.length) {
            const ul = document.createElement('ul');
            randomDisease.treatments.forEach(t => {
                const li = document.createElement('li');
                li.textContent = t;
                ul.appendChild(li);
            });
            treatmentOptionsEl.innerHTML = '';
            treatmentOptionsEl.appendChild(ul);
        }

        // Preventive measures
        if (randomDisease.preventive && randomDisease.preventive.length) {
            preventiveListEl.innerHTML = '';
            randomDisease.preventive.forEach(p => {
                const li = document.createElement('li');
                li.textContent = p;
                preventiveListEl.appendChild(li);
            });
        }

        // Tags
        setTags(randomDisease.tags);

        // History
        updateHistory(randomDisease.name, confidence, severity);

        // Mini chart
        updateMiniChart(severity);

        // Export hint
        exportHintEl.textContent = 'You can now export or share this report.';

        // Scan count
        incrementScansToday();

        loadingEl.classList.remove('active');
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Analyze Image';
        showToast('Analysis complete (demo data).', 'success');
    }, delay);
});

if (mobileAnalyzeBtn) {
    mobileAnalyzeBtn.addEventListener('click', () => analyzeBtn.click());
}

// === EXPORT / PRINT / SHARE (SIMPLE ACTIONS) ======

const saveReportBtn = document.getElementById('saveReportBtn');
const shareBtn = document.getElementById('shareBtn');
const printBtn = document.getElementById('printBtn');

function hasResult() {
    return diseaseNameEl.textContent && diseaseNameEl.textContent !== 'No Analysis Yet';
}

saveReportBtn.addEventListener('click', () => {
    if (!hasResult()) {
        showToast('Run an analysis first to generate a report.', 'error');
        return;
    }
    showToast('In a real app this would generate a PDF report (use jsPDF or backend).', 'success', 4000);
});

shareBtn.addEventListener('click', async () => {
    if (!hasResult()) {
        showToast('Run an analysis first to share results.', 'error');
        return;
    }

    const shareData = {
        title: 'AgriScan AI - Plant Disease Report',
        text: `Diagnosis: ${diseaseNameEl.textContent}\nConfidence: ${confidenceScoreEl.textContent}\nSeverity: ${severityTextEl.textContent}`,
        url: window.location.href
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            console.log('Share cancelled', err);
        }
    } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
        showToast('Share text copied to clipboard.', 'success');
    } else {
        alert('Sharing not supported on this browser.');
    }
});

printBtn.addEventListener('click', () => {
    if (!hasResult()) {
        showToast('Run an analysis first before printing.', 'error');
        return;
    }
    window.print();
});

// === FAQ ACCORDION ================================

const faqItems = document.querySelectorAll('.faq-item');

faqItems.forEach(item => {
    const header = item.querySelector('.faq-header');
    header.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        faqItems.forEach(i => i.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
    });
});

// === TESTIMONIAL SLIDER ===========================

const testimonialTrack = document.getElementById('testimonialTrack');
const prevTestimonial = document.getElementById('prevTestimonial');
const nextTestimonial = document.getElementById('nextTestimonial');

const testimonials = [
    {
        text: 'AgriScan AI helped us detect blight early in our tomato field, saving almost an entire season of yield.',
        name: 'Farmer from Punjab',
        role: 'Smallholder farmer'
    },
    {
        text: 'The interface is simple enough for our field staff to use and the recommendations are very practical.',
        name: 'Field Officer',
        role: 'Agricultural cooperative'
    },
    {
        text: 'As a researcher, I love how this project demonstrates real-world use of CNNs for precision agriculture.',
        name: 'LPU Researcher',
        role: 'Machine learning lab'
    }
];

let currentTestimonialIndex = 0;

function renderTestimonials() {
    testimonialTrack.innerHTML = '';
    testimonials.forEach((t, index) => {
        const div = document.createElement('div');
        div.className = 'testimonial-slide';
        if (index === currentTestimonialIndex) div.classList.add('active');
        div.innerHTML = `
            <div class="testimonial-text">“${t.text}”</div>
            <div class="testimonial-meta"><strong>${t.name}</strong> · ${t.role}</div>
        `;
        testimonialTrack.appendChild(div);
    });
}

function showTestimonial(index) {
    const slides = testimonialTrack.querySelectorAll('.testimonial-slide');
    slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
    });
}

if (testimonialTrack) {
    renderTestimonials();

    prevTestimonial.addEventListener('click', () => {
        currentTestimonialIndex =
            (currentTestimonialIndex - 1 + testimonials.length) % testimonials.length;
        showTestimonial(currentTestimonialIndex);
    });

    nextTestimonial.addEventListener('click', () => {
        currentTestimonialIndex =
            (currentTestimonialIndex + 1) % testimonials.length;
        showTestimonial(currentTestimonialIndex);
    });
    //
    // auto-rotate
    setInterval(() => {
        currentTestimonialIndex =
            (currentTestimonialIndex + 1) % testimonials.length;
        showTestimonial(currentTestimonialIndex);
    }, 9000);
}
// === NAVBAR + SMOOTH SCROLL =======================

const navbar = document.querySelector('.navbar');
const navLinks = document.querySelectorAll('.nav-link');
const menuToggle = document.querySelector('.menu-toggle');
const navLinksContainer = document.querySelector('.nav-links');
const scrollToHowBtn = document.getElementById('scrollToHow');

window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

menuToggle.addEventListener('click', () => {
    navLinksContainer.classList.toggle('open');
});

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
        navLinksContainer.classList.remove('open');
    });
});

if (scrollToHowBtn) {
    scrollToHowBtn.addEventListener('click', () => {
        const target = document.querySelector('#how-it-works');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

// === THEME TOGGLE (3 themes: dark, light, nature) ===

const themeToggle = document.getElementById('themeToggle');
const body = document.body;
const themes = ['dark', 'light', 'nature'];

function setTheme(theme) {
    body.setAttribute('data-theme', theme);
    localStorage.setItem('agriscan-theme', theme);
    const icon = themeToggle.querySelector('i');
    if (theme === 'light') {
        icon.className = 'fas fa-sun';
    } else if (theme === 'nature') {
        icon.className = 'fas fa-leaf';
    } else {
        icon.className = 'fas fa-moon';
    }
}

// Load saved theme
const savedTheme = localStorage.getItem('agriscan-theme');
if (themes.includes(savedTheme)) {
    setTheme(savedTheme);
} else {
    setTheme('dark');
}

themeToggle.addEventListener('click', () => {
    const current = body.getAttribute('data-theme') || 'dark';
    const index = themes.indexOf(current);
    const next = themes[(index + 1) % themes.length];
    setTheme(next);
});

// === REVEAL ON SCROLL =============================

const revealEls = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver(
    entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = entry.target.style.getPropertyValue('--delay') || '0s';
                entry.target.style.transitionDelay = delay;
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    },
    { threshold: 0.12 }
);

revealEls.forEach(el => observer.observe(el));

// === COUNTERS =====================================

const counters = document.querySelectorAll('.counter');
let countersStarted = false;

const counterObserver = new IntersectionObserver(
    entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !countersStarted) {
                countersStarted = true;
                counters.forEach(counter => {
                    const target = parseFloat(counter.dataset.target || '0');
                    const suffix = counter.dataset.suffix || '';
                    const decimals = parseInt(counter.dataset.decimals || '0', 10);
                    const duration = 1400;
                    const startTime = performance.now();

                    function update(now) {
                        const elapsed = now - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        const value = target * progress;
                        const formatted = value.toFixed(decimals);
                        counter.textContent = `${formatted}${suffix}`;
                        if (progress < 1) {
                            requestAnimationFrame(update);
                        }
                    }

                    requestAnimationFrame(update);
                });
                counterObserver.disconnect();
            }
        });
    },
    { threshold: 0.4 }
);

counters.forEach(c => counterObserver.observe(c));

// === TOAST NOTIFICATIONS ==========================

const toastContainer = document.getElementById('toastContainer');

function showToast(message, type = 'success', timeout = 2500) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const iconClass = type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check';
    toast.innerHTML = `<i class="fas ${iconClass}"></i><span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(6px)';
        setTimeout(() => toast.remove(), 250);
    }, timeout);
}

// === UPLOAD & PREVIEW =============================

const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const browseBtn = document.getElementById('browseBtn');
const imagePreview = document.getElementById('imagePreview');
const previewImage = document.getElementById('previewImage');
const removeBtn = document.getElementById('removeBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const sampleBtn = document.getElementById('sampleBtn');
const loadingEl = document.getElementById('loading');
const analyzeHint = document.querySelector('.analyze-hint');

const viewOriginalBtn = document.getElementById('viewOriginalBtn');
const viewAiBtn = document.getElementById('viewAiBtn');
const aiOverlay = document.getElementById('aiOverlay');

const thumbsContainer = document.getElementById('thumbsContainer');

const mobileUploadBtn = document.getElementById('mobileUploadBtn');
const mobileAnalyzeBtn = document.getElementById('mobileAnalyzeBtn');

let currentImageDataUrl = null;
let recentImages = [];

function enableAnalyze(enabled) {
    analyzeBtn.disabled = !enabled;
    analyzeBtn.setAttribute('aria-disabled', String(!enabled));
    if (enabled) {
        analyzeHint.textContent = 'Ready to analyze image';
    } else {
        analyzeHint.textContent = 'No image is uploaded yet';
    }
}

function setView(mode) {
    if (mode === 'ai') {
        aiOverlay.classList.add('visible');
        viewOriginalBtn.classList.remove('active');
        viewAiBtn.classList.add('active');
    } else {
        aiOverlay.classList.remove('visible');
        viewOriginalBtn.classList.add('active');
        viewAiBtn.classList.remove('active');
    }
}

function showPreview(src, pushToHistory = true) {
    imagePreview.classList.add('visible');
    previewImage.src = src;
    currentImageDataUrl = src;
    enableAnalyze(true);
    setView('original');

    if (pushToHistory) {
        recentImages.unshift(src);
        if (recentImages.length > 8) recentImages.pop();
        renderThumbs();
    }
}

function clearPreview() {
    imagePreview.classList.remove('visible');
    previewImage.removeAttribute('src');
    currentImageDataUrl = null;
    enableAnalyze(false);
}

function renderThumbs() {
    thumbsContainer.innerHTML = '';
    if (!recentImages.length) {
        const p = document.createElement('p');
        p.className = 'no-thumbs';
        p.textContent = 'No recent images yet.';
        thumbsContainer.appendChild(p);
        return;
    }
    recentImages.forEach(src => {
        const div = document.createElement('div');
        div.className = 'thumb';
        div.innerHTML = `<img src="${src}" alt="Previous leaf">`;
        div.addEventListener('click', () => showPreview(src, false));
        thumbsContainer.appendChild(div);
    });
}

browseBtn.addEventListener('click', () => imageInput.click());
if (mobileUploadBtn) {
    mobileUploadBtn.addEventListener('click', () => imageInput.click());
}

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file.', 'error');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        showToast('Max file size is 5MB.', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
        showPreview(ev.target.result);
        showToast('Image loaded successfully.', 'success');
    };
    reader.readAsDataURL(file);
});

['dragenter', 'dragover'].forEach(eventName => {
    uploadArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.add('dragover');
    });
});

['dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('dragover');
    });
});

uploadArea.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showToast('Please drop an image file.', 'error');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        showToast('Max file size is 5MB.', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
        showPreview(ev.target.result);
        showToast('Image dropped successfully.', 'success');
    };
    reader.readAsDataURL(file);
});

removeBtn.addEventListener('click', () => {
    imageInput.value = '';
    clearPreview();
});

viewOriginalBtn.addEventListener('click', () => setView('original'));
viewAiBtn.addEventListener('click', () => setView('ai'));

// Sample image (placeholder)
sampleBtn.addEventListener('click', () => {
    const sampleUrl = 'https://images.unsplash.com/photo-1535295972055-1c762f4483e5?auto=format&fit=crop&w=800&q=80';
    showPreview(sampleUrl);
    showToast('Sample image loaded.', 'success');
});

// === FAKE AI ANALYSIS LOGIC =======================

const confidenceScoreEl = document.getElementById('confidenceScore');
const confidenceGaugeEl = document.getElementById('confidenceGauge');
const diseaseNameEl = document.getElementById('diseaseName');
const diseaseDescriptionEl = document.getElementById('diseaseDescription');
const severityLevelEl = document.getElementById('severityLevel');
const severityTextEl = document.getElementById('severityText');
const treatmentOptionsEl = document.getElementById('treatmentOptions');
const preventiveListEl = document.getElementById('preventiveList');
const historyListEl = document.getElementById('historyList');
const resultTagsEl = document.getElementById('resultTags');
const exportHintEl = document.getElementById('exportHint');
const scanProgressEl = document.getElementById('scanProgress');
const scanBarEl = document.getElementById('scanBar');
const miniChartEl = document.getElementById('miniChart');
const scansTodayEl = document.getElementById('scansToday');

let severityHistory = [];

const mockDiseases = [
    {
        name: 'Early Blight',
        severity: 'moderate',
        confidenceRange: [84, 96],
        description: 'A common fungal disease causing brown patches with concentric rings on older leaves.',
        tags: ['fungal', 'tomato', 'potato'],
        treatments: [
            'Remove and destroy heavily infected leaves.',
            'Apply a copper-based or chlorothalonil fungicide as per label directions.',
            'Avoid overhead irrigation and water early in the day.'
        ],
        preventive: [
            'Rotate crops every season and avoid planting tomatoes after potatoes.',
            'Use resistant or tolerant plant varieties.',
            'Mulch around plants to prevent soil splash.'
        ]
    },
    {
        name: 'Powdery Mildew',
        severity: 'early',
        confidenceRange: [80, 92],
        description: 'White, powdery fungal growth on upper leaf surfaces, often in warm and dry conditions.',
        tags: ['fungal', 'leaf', 'common'],
        treatments: [
            'Prune infected parts to improve air circulation.',
            'Spray with sulfur or potassium bicarbonate-based fungicide.',
            'Avoid excess nitrogen fertilization.'
        ],
        preventive: [
            'Provide adequate spacing between plants.',
            'Grow resistant cultivars when available.',
            'Keep foliage as dry as possible.'
        ]
    },
    {
        name: 'Leaf Rust',
        severity: 'severe',
        confidenceRange: [88, 98],
        description: 'Orange or brown pustules on the underside of leaves leading to yellowing and premature leaf drop.',
        tags: ['rust', 'cereal', 'wheat'],
        treatments: [
            'Use systemic fungicides early when symptoms appear.',
            'Remove volunteer host plants around the field.',
            'Destroy highly infected plant debris after harvest.'
        ],
        preventive: [
            'Plant certified, rust-resistant varieties.',
            'Avoid overcrowding plants.',
            'Monitor fields regularly during humid weather.'
        ]
    },
    {
        name: 'Healthy Leaf',
        severity: 'none',
        confidenceRange: [90, 99],
        description: 'No significant disease symptoms detected. Leaf appears healthy and vigorous.',
        tags: ['healthy', 'no-disease'],
        treatments: [
            'No chemical treatment required at this stage.',
            'Continue routine crop management and monitoring.'
        ],
        preventive: [
            'Maintain balanced fertilization and irrigation.',
            'Scout fields weekly to detect early changes.',
            'Ensure good soil drainage.'
        ]
    }
];

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function mapSeverityToWidth(severity) {
    switch (severity) {
        case 'early':
            return 33;
        case 'moderate':
            return 66;
        case 'severe':
            return 100;
        case 'none':
        default:
            return 5;
    }
}

function mapSeverityText(severity) {
    switch (severity) {
        case 'early':
            return 'Early stage infection detected. Act now to prevent spread.';
        case 'moderate':
            return 'Moderate infection. Targeted treatment is recommended.';
        case 'severe':
            return 'Severe infection. Immediate and intensive action required.';
        case 'none':
        default:
            return 'No disease detected. Plant is currently healthy.';
    }
}

function updateHistory(diseaseName, confidence, severity) {
    const noHistoryEl = historyListEl.querySelector('.no-history');
    if (noHistoryEl) {
        noHistoryEl.remove();
    }

    const item = document.createElement('div');
    item.className = 'history-item';

    const left = document.createElement('div');
    const right = document.createElement('div');

    left.innerHTML = `
        <div class="history-disease">${diseaseName}</div>
        <div class="history-meta">
            <span>${severity.charAt(0).toUpperCase() + severity.slice(1)} severity</span>
        </div>
    `;

    const time = new Date();
    const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    right.className = 'history-meta';
    right.textContent = `${confidence}% • ${timeStr}`;

    item.appendChild(left);
    item.appendChild(right);

    historyListEl.prepend(item);
}

function setTags(tags) {
    resultTagsEl.innerHTML = '';
    if (!tags || !tags.length) return;
    tags.forEach(tag => {
        const span = document.createElement('span');
        span.className = 'result-tag';
        span.textContent = tag;
        resultTagsEl.appendChild(span);
    });
}

function typeText(element, text) {
    element.textContent = '';
    let index = 0;
    const interval = setInterval(() => {
        element.textContent += text.charAt(index);
        index++;
        if (index >= text.length) {
            clearInterval(interval);
        }
    }, 40);
}

function updateGauge(confidence) {
    const angle = confidence * 3.6;
    confidenceGaugeEl.style.backgroundImage =
        `conic-gradient(var(--accent-strong) 0deg ${angle}deg, #111827 ${angle}deg 360deg)`;
}

function updateMiniChart(severity) {
    severityHistory.unshift(severity);
    if (severityHistory.length > 6) severityHistory.pop();

    miniChartEl.innerHTML = '';
    severityHistory.forEach(s => {
        const bar = document.createElement('div');
        bar.className = 'mini-chart-bar';
        const value = mapSeverityToWidth(s);
        bar.style.height = `${Math.max(value, 10)}%`;
        miniChartEl.appendChild(bar);
    });
}

// scans today (simple counter)
function loadScansToday() {
    const todayKey = new Date().toISOString().slice(0, 10);
    const stored = localStorage.getItem('agriscan-scans');
    let data = stored ? JSON.parse(stored) : {};
    if (!data[todayKey]) data[todayKey] = 0;
    scansTodayEl.textContent = data[todayKey];
    return { todayKey, data };
}

function incrementScansToday() {
    const { todayKey, data } = loadScansToday();
    data[todayKey] = (data[todayKey] || 0) + 1;
    localStorage.setItem('agriscan-scans', JSON.stringify(data));
    scansTodayEl.textContent = data[todayKey];
}

loadScansToday();

// Main “Analyze” button: simulate AI
analyzeBtn.addEventListener('click', () => {
    if (!currentImageDataUrl) {
        showToast('Upload an image first.', 'error');
        return;
    }

    loadingEl.classList.add('active');
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';

    // scanning animation
    scanProgressEl.classList.add('active');
    scanBarEl.style.width = '0%';
    let progress = 0;
    const scanInterval = setInterval(() => {
        progress += 4;
        scanBarEl.style.width = `${Math.min(progress, 100)}%`;
        if (progress >= 100) {
            clearInterval(scanInterval);
        }
    }, 70);

    // Simulate model processing delay
    const delay = 1500 + Math.random() * 1000;
    setTimeout(() => {
        const randomDisease = mockDiseases[Math.floor(Math.random() * mockDiseases.length)];
        const [min, max] = randomDisease.confidenceRange;
        const confidence = randomBetween(min, max);

        // Update UI
        confidenceScoreEl.textContent = `${confidence}%`;
        updateGauge(confidence);

        typeText(diseaseNameEl, randomDisease.name);
        diseaseDescriptionEl.textContent = randomDisease.description;

        const severity = randomDisease.severity;
        const severityWidth = mapSeverityToWidth(severity);
        severityLevelEl.style.width = `${severityWidth}%`;
        severityTextEl.textContent = mapSeverityText(severity);

        // Treatments
        if (randomDisease.treatments && randomDisease.treatments.length) {
            const ul = document.createElement('ul');
            randomDisease.treatments.forEach(t => {
                const li = document.createElement('li');
                li.textContent = t;
                ul.appendChild(li);
            });
            treatmentOptionsEl.innerHTML = '';
            treatmentOptionsEl.appendChild(ul);
        }

        // Preventive measures
        if (randomDisease.preventive && randomDisease.preventive.length) {
            preventiveListEl.innerHTML = '';
            randomDisease.preventive.forEach(p => {
                const li = document.createElement('li');
                li.textContent = p;
                preventiveListEl.appendChild(li);
            });
        }

        // Tags
        setTags(randomDisease.tags);

        // History
        updateHistory(randomDisease.name, confidence, severity);

        // Mini chart
        updateMiniChart(severity);

        // Export hint
        exportHintEl.textContent = 'You can now export or share this report.';

        // Scan count
        incrementScansToday();

        loadingEl.classList.remove('active');
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<i class="fas fa-search"></i> Analyze Image';
        showToast('Analysis complete (demo data).', 'success');
    }, delay);
});

if (mobileAnalyzeBtn) {
    mobileAnalyzeBtn.addEventListener('click', () => analyzeBtn.click());
}

// === EXPORT / PRINT / SHARE (SIMPLE ACTIONS) ======

const saveReportBtn = document.getElementById('saveReportBtn');
const shareBtn = document.getElementById('shareBtn');
const printBtn = document.getElementById('printBtn');

function hasResult() {
    return diseaseNameEl.textContent && diseaseNameEl.textContent !== 'No Analysis Yet';
}

saveReportBtn.addEventListener('click', () => {
    if (!hasResult()) {
        showToast('Run an analysis first to generate a report.', 'error');
        return;
    }
    showToast('In a real app this would generate a PDF report (use jsPDF or backend).', 'success', 4000);
});

shareBtn.addEventListener('click', async () => {
    if (!hasResult()) {
        showToast('Run an analysis first to share results.', 'error');
        return;
    }

    const shareData = {
        title: 'AgriScan AI - Plant Disease Report',
        text: `Diagnosis: ${diseaseNameEl.textContent}\nConfidence: ${confidenceScoreEl.textContent}\nSeverity: ${severityTextEl.textContent}`,
        url: window.location.href
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            console.log('Share cancelled', err);
        }
    } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
        showToast('Share text copied to clipboard.', 'success');
    } else {
        alert('Sharing not supported on this browser.');
    }
});

printBtn.addEventListener('click', () => {
    if (!hasResult()) {
        showToast('Run an analysis first before printing.', 'error');
        return;
    }
    window.print();
});

// === FAQ ACCORDION ================================

const faqItems = document.querySelectorAll('.faq-item');

faqItems.forEach(item => {
    const header = item.querySelector('.faq-header');
    header.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        faqItems.forEach(i => i.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
    });
});

// === TESTIMONIAL SLIDER ===========================

const testimonialTrack = document.getElementById('testimonialTrack');
const prevTestimonial = document.getElementById('prevTestimonial');
const nextTestimonial = document.getElementById('nextTestimonial');

const testimonials = [
    {
        text: 'AgriScan AI helped us detect blight early in our tomato field, saving almost an entire season of yield.',
        name: 'Farmer from Punjab',
        role: 'Smallholder farmer'
    },
    {
        text: 'The interface is simple enough for our field staff to use and the recommendations are very practical.',
        name: 'Field Officer',
        role: 'Agricultural cooperative'
    },
    {
        text: 'As a researcher, I love how this project demonstrates real-world use of CNNs for precision agriculture.',
        name: 'LPU Researcher',
        role: 'Machine learning lab'
    }
];

let currentTestimonialIndex = 0;

function renderTestimonials() {
    testimonialTrack.innerHTML = '';
    testimonials.forEach((t, index) => {
        const div = document.createElement('div');
        div.className = 'testimonial-slide';
        if (index === currentTestimonialIndex) div.classList.add('active');
        div.innerHTML = `
            <div class="testimonial-text">“${t.text}”</div>
            <div class="testimonial-meta"><strong>${t.name}</strong> · ${t.role}</div>
        `;
        testimonialTrack.appendChild(div);
    });
}

function showTestimonial(index) {
    const slides = testimonialTrack.querySelectorAll('.testimonial-slide');
    slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
    });
}

if (testimonialTrack) {
    renderTestimonials();

    prevTestimonial.addEventListener('click', () => {
        currentTestimonialIndex =
            (currentTestimonialIndex - 1 + testimonials.length) % testimonials.length;
        showTestimonial(currentTestimonialIndex);
    });

    nextTestimonial.addEventListener('click', () => {
        currentTestimonialIndex =
            (currentTestimonialIndex + 1) % testimonials.length;
        showTestimonial(currentTestimonialIndex);
    });
    //
    // auto-rotate
    setInterval(() => {
        currentTestimonialIndex =
            (currentTestimonialIndex + 1) % testimonials.length;
        showTestimonial(currentTestimonialIndex);
    }, 9000);
}


