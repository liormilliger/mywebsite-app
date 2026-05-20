document.addEventListener('DOMContentLoaded', function() {
    // --- Hamburger Menu Logic ---
    const hamburger = document.querySelector('.hamburger-menu');
    const navLinksContainer = document.querySelector('.nav-links-container');
    const closeButton = document.querySelector('.close-menu-btn');
    const navLinks = document.querySelectorAll('.nav-links-container a');

    // Open the menu when hamburger is clicked
    if (hamburger && navLinksContainer) {
        hamburger.addEventListener('click', () => {
            navLinksContainer.classList.add('active');
        });
    }

    // Close the menu when the new 'X' button is clicked
    if (closeButton && navLinksContainer) {
        closeButton.addEventListener('click', () => {
            navLinksContainer.classList.remove('active');
        });
    }
    
    // Close the menu when any link inside it is clicked
    if (navLinks.length > 0 && navLinksContainer) {
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navLinksContainer.classList.remove('active');
            });
        });
    }

    // --- Simple Accordion Logic ---
    const accordions = document.querySelectorAll('.accordion-header:not(.code-accordion .accordion-header)');
    accordions.forEach(acc => {
        acc.addEventListener('click', function() {
            this.classList.toggle('active');
            const icon = this.querySelector('.accordion-icon');
            const content = this.nextElementSibling;

            if (content.style.maxHeight) {
                content.style.maxHeight = null;
                if(icon) icon.textContent = '+';
            } else {
                if(content) content.style.maxHeight = content.scrollHeight + 'px';
                if(icon) icon.textContent = '−';
            }
        });
    });

    // --- Ticker Strip ---
    const tickerEl = document.querySelector('.ticker-text');
    if (tickerEl) {
        const messages = [
            '30% Cloud Cost Savings',
            'Complex K8s Migrations',
            'Agentic Workflows for Automating Tasks',
            'Data Pipelines for LLMs',
            'Modular Ansible Deployments',
            'Umbrella-Subchart Helm Deployments',
            'Per-Service CI/CD Pipelines',
        ];
        let idx = 0;
        tickerEl.textContent = messages[0];

        setInterval(() => {
            tickerEl.classList.add('fade-out');
            setTimeout(() => {
                idx = (idx + 1) % messages.length;
                tickerEl.textContent = messages[idx];
                tickerEl.classList.remove('fade-out');
            }, 350);
        }, 2500);
    }

    // --- Scroll Fade-in Animations ---
    if ('IntersectionObserver' in window) {
        const targets = [
            ...document.querySelectorAll('.project-card'),
            ...document.querySelectorAll('.grid-item'),
            ...document.querySelectorAll('.contact-item'),
            ...document.querySelectorAll('.stat-item'),
            ...document.querySelectorAll('.about-me-content section'),
        ];

        targets.forEach(el => el.classList.add('fade-in-up'));

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08 });

        targets.forEach(el => observer.observe(el));
    }
});