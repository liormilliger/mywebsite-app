document.addEventListener('DOMContentLoaded', function() {
    // --- Hamburger Menu Logic ---
    const hamburger = document.querySelector('.hamburger-menu');
    const navLinksContainer = document.querySelector('.nav-links-container');

    if (hamburger) {
        hamburger.addEventListener('click', function() {
            navLinksContainer.classList.toggle('active');
        });
    }

    // --- Accordion Logic ---
    const accordions = document.querySelectorAll('.accordion-header');

    accordions.forEach(accordion => {
        accordion.addEventListener('click', function() {
            this.classList.toggle('active');
            const icon = this.querySelector('.accordion-icon');
            const content = this.nextElementSibling;

            if (content.style.maxHeight) {
                // If it's open, close it
                content.style.maxHeight = null;
                if (icon) icon.textContent = '+';
            } else {
                // If it's closed, open it to its full height
                content.style.maxHeight = content.scrollHeight + 'px';
                if (icon) icon.textContent = '−'; // Minus sign for open state
            }
        });
    });
});