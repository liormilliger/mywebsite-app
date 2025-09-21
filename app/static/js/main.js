document.addEventListener('DOMContentLoaded', function() {
    // --- Hamburger Menu Logic ---
    const hamburger = document.querySelector('.hamburger-menu');
    const navLinksContainer = document.querySelector('.nav-links-container');
    if (hamburger) {
        hamburger.addEventListener('click', () => navLinksContainer.classList.toggle('active'));
    }

    // --- Simple Accordion Logic ---
    const accordions = document.querySelectorAll('.accordion-header');
    accordions.forEach(acc => {
        acc.addEventListener('click', function() {
            this.classList.toggle('active');
            const icon = this.querySelector('.accordion-icon');
            const content = this.nextElementSibling;
            
            if (content.style.maxHeight) {
                // If it's open, close it
                content.style.maxHeight = null;
                if(icon) icon.textContent = '+';
            } else {
                // If it's closed, open it
                if(content) content.style.maxHeight = content.scrollHeight + 'px';
                if(icon) icon.textContent = '−';
            }
        });
    });
});
