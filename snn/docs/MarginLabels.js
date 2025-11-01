/**
 * MarginLabels.js
 *
 * Vertical navigation labels in the left margin of narrative documentation.
 * Syncs with active section via scroll events and provides click navigation.
 *
 * Features:
 * - Auto-generates labels from section headings
 * - Highlights active section
 * - Click to scroll to section
 * - Listens to narrative:section-change events
 */

class MarginLabels {
    constructor(containerId, sectionSelector = '.doc-section') {
        this.container = document.getElementById(containerId);
        this.sectionSelector = sectionSelector;
        this.labels = [];
        this.activeLabel = null;

        if (!this.container) {
            console.error(`MarginLabels: Container "${containerId}" not found`);
            return;
        }

        this.init();
    }

    init() {
        // Find all sections
        const sections = document.querySelectorAll(this.sectionSelector);

        if (sections.length === 0) {
            console.warn('MarginLabels: No sections found');
            return;
        }

        // Generate label for each section
        sections.forEach((section, idx) => {
            const label = this.createLabel(section, idx);
            this.labels.push(label);
            this.container.appendChild(label.element);
        });

        // Listen for section changes
        window.addEventListener('narrative:section-change', (e) => {
            this.setActive(e.detail.section);
        });

        // Set first label as active
        if (this.labels.length > 0) {
            this.setActive(this.labels[0].sectionId);
        }

        console.log(`MarginLabels: Created ${this.labels.length} labels`);
    }

    createLabel(section, idx) {
        const sectionId = section.dataset.section;

        // Extract label text from section heading or data attribute
        let labelText = section.dataset.label;

        if (!labelText) {
            const heading = section.querySelector('h2, h3, h4');
            labelText = heading ? heading.textContent : `Section ${idx + 1}`;
        }

        // Create label element
        const el = document.createElement('div');
        el.className = 'margin-label';
        el.textContent = labelText;
        el.dataset.section = sectionId;

        // Click handler - scroll to section
        el.addEventListener('click', () => {
            section.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });

        return {
            element: el,
            sectionId: sectionId,
            text: labelText
        };
    }

    setActive(sectionId) {
        // Remove active class from all
        this.labels.forEach(label => {
            label.element.classList.remove('active');
        });

        // Add to matching label
        const label = this.labels.find(l => l.sectionId === sectionId);
        if (label) {
            label.element.classList.add('active');
            this.activeLabel = sectionId;
        }
    }

    getActive() {
        return this.activeLabel;
    }
}
