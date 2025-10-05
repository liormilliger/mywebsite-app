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
    const accordions = document.querySelectorAll('.accordion-header');
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
});