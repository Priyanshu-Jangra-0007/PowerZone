// Navbar scroll effect
const navbar = document.getElementById('navbar');
const navContainer = document.querySelector('.nav-container');
const menuToggle = document.querySelector('.nav-menu-toggle');
const mobileMenuQuery = window.matchMedia('(max-width: 768px)');

function closeMobileMenu() {
    if (!navContainer || !menuToggle) {
        return;
    }
    document.body.classList.remove('menu-open');
    navContainer.classList.remove('menu-open');
    menuToggle.setAttribute('aria-expanded', 'false');
}

function setMobileMenuState(isOpen) {
    if (!navContainer || !menuToggle) {
        return;
    }
    navContainer.classList.toggle('menu-open', isOpen);
    document.body.classList.toggle('menu-open', isOpen);
    menuToggle.setAttribute('aria-expanded', String(isOpen));
}

if (navContainer && menuToggle) {
    menuToggle.addEventListener('click', (event) => {
        event.stopPropagation();
        const isOpen = !navContainer.classList.contains('menu-open');
        setMobileMenuState(isOpen);
    });

    document.addEventListener('click', (event) => {
        if (!navContainer.contains(event.target)) {
            closeMobileMenu();
        }
    });

    window.addEventListener('resize', () => {
        if (!mobileMenuQuery.matches) {
            closeMobileMenu();
        }
    });

    document.querySelectorAll('.nav-links a, .nav-dropdown-menu a, .nav-cta a').forEach(link => {
        link.addEventListener('click', () => {
            if (mobileMenuQuery.matches) {
                closeMobileMenu();
            }
        });
    });
}

window.addEventListener('scroll', () => {
    if (!navbar) {
        return;
    }
    if (window.scrollY > 100) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Smooth transition effect for nav links
const navLinks = document.querySelectorAll('.nav-links > a, .nav-dropdown-toggle');

navLinks.forEach(link => {
    link.addEventListener('mouseenter', function() {
        // Add smooth scale effect
        this.style.transform = 'translateY(-2px) scale(1.05)';
    });
    
    link.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
});

const networkDropdown = document.querySelector('.nav-dropdown');
const networkToggle = document.querySelector('.nav-dropdown-toggle');

if (networkDropdown && networkToggle) {
    const closeNetworkDropdown = () => {
        networkDropdown.classList.remove('open');
        networkToggle.setAttribute('aria-expanded', 'false');
    };

    const openNetworkDropdown = () => {
        networkDropdown.classList.add('open');
        networkToggle.setAttribute('aria-expanded', 'true');
    };

    networkDropdown.addEventListener('mouseenter', () => {
        if (!mobileMenuQuery.matches) {
            openNetworkDropdown();
        }
    });

    networkDropdown.addEventListener('mouseleave', () => {
        if (!mobileMenuQuery.matches) {
            closeNetworkDropdown();
        }
    });

    networkToggle.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const isOpen = networkDropdown.classList.toggle('open');
        networkToggle.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', (event) => {
        if (!networkDropdown.contains(event.target)) {
            closeNetworkDropdown();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeNetworkDropdown();
            closeMobileMenu();
        }
    });
}

// Scroll animation for feature boxes
const observerOptions = {
    threshold: 0.2,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate');
        }
    });
}, observerOptions);

// Observe all feature boxes
document.querySelectorAll('.feature-box').forEach(box => {
    observer.observe(box);
});

// Keep hero content static on scroll

// Add hover glow effect to buttons
document.querySelectorAll('.btn-primary, .btn-register').forEach(button => {
    button.addEventListener('mouseenter', function() {
        this.style.boxShadow = '0 0 30px rgba(227, 30, 36, 0.6)';
    });
    
    button.addEventListener('mouseleave', function() {
        this.style.boxShadow = '';
    });
});
