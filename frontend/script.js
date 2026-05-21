// Navbar scroll effect
const navbar = document.getElementById('navbar');
const navContainer = document.querySelector('.nav-container');
const menuToggle = document.querySelector('.nav-menu-toggle');
const mobileMenuQuery = window.matchMedia('(max-width: 768px)');
const navCta = document.querySelector('.nav-cta');
const DISPLAY_NAME_KEY = 'powerzone-display-name';
const AVATAR_URL_KEY = 'powerzone-avatar-url';
const hasSupabaseAuth = Boolean(window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY);
const navSupabase = hasSupabaseAuth && typeof window.getPowerzoneSupabaseClient === 'function'
    ? window.getPowerzoneSupabaseClient()
    : null;
const defaultNavActions = navCta
    ? Array.from(navCta.querySelectorAll('.btn-outlined, .btn-register')).map((node) => node.cloneNode(true))
    : [];
const navLinksContainer = document.querySelector('.nav-links');
const defaultNetworkDropdown = navLinksContainer
    ? navLinksContainer.querySelector('.nav-dropdown')
    : null;
let isNavbarAuthenticated = false;
let navbarAuthReady = Promise.resolve(false);
let wasMobileNavbarLayout = mobileMenuQuery.matches;

function getClientEntryLinks() {
    return Array.from(document.querySelectorAll('a[href^="client.html"], a[href^="login.html?redirect=client.html%3Fview%3Ddashboard"]'));
}

function loadStoredProfile() {
    try {
        return {
            name: (localStorage.getItem(DISPLAY_NAME_KEY) || '').trim(),
            avatarUrl: (localStorage.getItem(AVATAR_URL_KEY) || '').trim()
        };
    } catch (_error) {
        return { name: '', avatarUrl: '' };
    }
}

function createInitials(name) {
    const parts = String(name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2);
    if (!parts.length) {
        return 'A';
    }
    return parts.map((part) => part[0].toUpperCase()).join('');
}

function clearStoredProfile() {
    try {
        localStorage.removeItem(DISPLAY_NAME_KEY);
        localStorage.removeItem(AVATAR_URL_KEY);
    } catch (_error) {
        // Ignore storage failures.
    }
}

async function logoutUser() {
    clearStoredProfile();
    renderGuestNav();
    if (navSupabase) {
        try {
            await navSupabase.auth.signOut();
        } catch (_error) {
            // Ignore sign-out failures and continue to login.
        }
    }
    window.location.href = 'login.html?logout=1';
}

function updateClientEntryLinks(isAuthenticated) {
    isNavbarAuthenticated = isAuthenticated;
    const nextHref = 'client.html?view=dashboard';
    getClientEntryLinks().forEach((link) => {
        link.href = nextHref;
    });
}

function renderGuestNetworkLink() {
    if (!navLinksContainer || !defaultNetworkDropdown) {
        return;
    }

    const dashboardLink = navLinksContainer.querySelector('.nav-auth-dashboard');
    if (dashboardLink) {
        dashboardLink.remove();
    }

    if (!navLinksContainer.querySelector('.nav-dropdown')) {
        navLinksContainer.appendChild(defaultNetworkDropdown.cloneNode(true));
    }
    bindClientEntryRouting();
}

function renderAuthenticatedNetworkLink() {
    if (!navLinksContainer) {
        return;
    }

    navLinksContainer.querySelectorAll('.nav-dropdown').forEach((node) => node.remove());

    if (navLinksContainer.querySelector('.nav-auth-dashboard')) {
        return;
    }

    const dashboardLink = document.createElement('a');
    dashboardLink.href = 'client.html?view=dashboard';
    dashboardLink.className = 'nav-auth-dashboard';
    dashboardLink.textContent = 'Dashboard';
    navLinksContainer.appendChild(dashboardLink);
    bindClientEntryRouting();
}

function bindClientEntryRouting() {
    getClientEntryLinks().forEach((link) => {
        if (link.dataset.clientRouteBound === 'true') {
            return;
        }
        link.dataset.clientRouteBound = 'true';
        link.addEventListener('click', async (event) => {
            event.preventDefault();
            window.location.href = 'client.html?view=dashboard';
        });
    });
}

function renderGuestNav() {
    if (!navCta) {
        return;
    }

    document.querySelectorAll('.nav-profile-menu').forEach((node) => node.remove());

    if (navCta.querySelector('.btn-outlined, .btn-register')) {
        return;
    }

    defaultNavActions.forEach((node) => {
        navCta.appendChild(node.cloneNode(true));
    });
    renderGuestNetworkLink();
    updateClientEntryLinks(false);
}

function renderAuthenticatedNav() {
    if (!navCta) {
        return;
    }

    const profile = loadStoredProfile();
    if (!profile.name) {
        renderGuestNav();
        return;
    }

    updateClientEntryLinks(true);
    renderAuthenticatedNetworkLink();

    navCta.querySelectorAll('.btn-outlined, .btn-register').forEach((element) => {
        element.remove();
    });

    document.querySelectorAll('.nav-profile-menu').forEach((node) => node.remove());

    if (navCta.querySelector('.nav-profile-menu') || (navLinksContainer && navLinksContainer.querySelector('.nav-profile-menu'))) {
        return;
    }

    const profileMenu = document.createElement('div');
    profileMenu.className = 'nav-profile-menu';
    if (mobileMenuQuery.matches) {
        profileMenu.classList.add('nav-mobile-profile-item');
    }

    const profileButton = document.createElement('button');
    profileButton.type = 'button';
    profileButton.className = 'nav-profile-badge';
    profileButton.setAttribute('aria-label', `${profile.name} account menu`);
    profileButton.setAttribute('aria-haspopup', 'menu');
    profileButton.setAttribute('aria-expanded', 'false');
    profileButton.title = profile.name;
    const badgeMedia = document.createElement('span');
    badgeMedia.className = 'nav-profile-badge-media';
    if (profile.avatarUrl) {
        const avatarImage = document.createElement('img');
        avatarImage.className = 'nav-profile-badge-image';
        avatarImage.src = profile.avatarUrl;
        avatarImage.alt = `${profile.name} profile`;
        badgeMedia.appendChild(avatarImage);
    } else {
        const badgeInitials = document.createElement('span');
        badgeInitials.className = 'nav-profile-badge-initials';
        badgeInitials.textContent = createInitials(profile.name);
        badgeMedia.appendChild(badgeInitials);
    }
    profileButton.appendChild(badgeMedia);

    const badgeLabel = document.createElement('span');
    badgeLabel.className = 'nav-profile-badge-label';
    badgeLabel.textContent = profile.name;
    profileButton.appendChild(badgeLabel);

    const dropdown = document.createElement('div');
    dropdown.className = 'nav-profile-dropdown';
    dropdown.setAttribute('role', 'menu');
    dropdown.setAttribute('aria-label', 'Account options');

    const logoutButton = document.createElement('button');
    logoutButton.type = 'button';
    logoutButton.className = 'nav-profile-action nav-profile-logout';
    logoutButton.setAttribute('role', 'menuitem');
    logoutButton.textContent = 'Log Out';
    dropdown.appendChild(logoutButton);

    const closeProfileMenu = () => {
        profileMenu.classList.remove('open');
        profileButton.setAttribute('aria-expanded', 'false');
    };

    const openProfileMenu = () => {
        profileMenu.classList.add('open');
        profileButton.setAttribute('aria-expanded', 'true');
    };

    profileButton.addEventListener('click', (event) => {
        if (!mobileMenuQuery.matches) {
            event.preventDefault();
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        const isOpen = profileMenu.classList.toggle('open');
        profileButton.setAttribute('aria-expanded', String(isOpen));
    });

    profileMenu.addEventListener('mouseenter', () => {
        if (!mobileMenuQuery.matches) {
            openProfileMenu();
        }
    });

    profileMenu.addEventListener('mouseleave', () => {
        if (!mobileMenuQuery.matches) {
            closeProfileMenu();
        }
    });

    logoutButton.addEventListener('click', async (event) => {
        event.preventDefault();
        closeProfileMenu();
        if (mobileMenuQuery.matches) {
            closeMobileMenu();
        }
        await logoutUser();
    });

    document.addEventListener('click', (event) => {
        if (!profileMenu.contains(event.target)) {
            closeProfileMenu();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeProfileMenu();
        }
    });

    profileMenu.appendChild(profileButton);
    profileMenu.appendChild(dropdown);
    if (mobileMenuQuery.matches && navLinksContainer) {
        navLinksContainer.appendChild(profileMenu);
    } else {
        navCta.appendChild(profileMenu);
    }
}

async function syncNavbarAuthState() {
    if (!navSupabase) {
        if (loadStoredProfile().name) {
            renderAuthenticatedNav();
        } else {
            renderGuestNav();
        }
        return;
    }

    try {
        const { data } = await navSupabase.auth.getSession();
        if (data.session?.user) {
            renderAuthenticatedNav();
        } else {
            clearStoredProfile();
            renderGuestNav();
        }
    } catch (_error) {
        renderGuestNav();
    }
}

navbarAuthReady = syncNavbarAuthState();
bindClientEntryRouting();

if (navSupabase) {
    navSupabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
            renderAuthenticatedNav();
        } else {
            clearStoredProfile();
            renderGuestNav();
        }
    });
}

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
        const isMobile = mobileMenuQuery.matches;
        if (!isMobile) {
            closeMobileMenu();
        }
        if (isMobile !== wasMobileNavbarLayout) {
            wasMobileNavbarLayout = isMobile;
            if (isNavbarAuthenticated) {
                renderAuthenticatedNav();
            } else {
                renderGuestNav();
            }
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

// Add hover glow effect to buttons
document.querySelectorAll('.btn-primary, .btn-register').forEach(button => {
    button.addEventListener('mouseenter', function() {
        this.style.boxShadow = '0 0 30px rgba(227, 30, 36, 0.6)';
    });
    
    button.addEventListener('mouseleave', function() {
        this.style.boxShadow = '';
    });
});
