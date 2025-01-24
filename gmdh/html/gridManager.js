// gridManager.js
class GridManager {
    constructor() {
        this.gridLayout = document.querySelector('.grid-layout');
        this.draggedItem = null;
        this.dragStartTime = 0;
        this.initialize();
    }

    initialize() {
        // Convert existing grid items to interactive format
        const items = this.gridLayout.querySelectorAll('.grid-item');
        items.forEach(item => this.makeItemInteractive(item));
    }

    makeItemInteractive(item) {
        // Create header with controls
        const content = item.innerHTML;
        const title = item.querySelector('h3').textContent;
        
        item.innerHTML = `
            <div class="grid-item-header">
                <h3>${title}</h3>
            </div>
            <div class="grid-item-content">${content}</div>
        `;

        // Remove the original h3
        item.querySelector('.grid-item-content h3').remove();

        const header = item.querySelector('.grid-item-header');
        let isDragging = false;
        
        // Mouse-based drag and drop with click detection
        header.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Only handle left click
            e.preventDefault(); // Prevent text selection
            
            this.dragStartTime = Date.now();
            isDragging = false;
            
            const startX = e.clientX;
            const startY = e.clientY;
            const itemRect = item.getBoundingClientRect();
            const gridRect = this.gridLayout.getBoundingClientRect();
            
            const onMouseMove = (e) => {
                // Only start dragging if mouse has moved more than 5 pixels
                if (!isDragging && (Math.abs(e.clientX - startX) > 5 || Math.abs(e.clientY - startY) > 5)) {
                    isDragging = true;
                    
                    // Create ghost element
                    const ghost = item.cloneNode(true);
                    ghost.classList.add('dragging');
                    ghost.style.position = 'fixed';
                    ghost.style.top = itemRect.top + 'px';
                    ghost.style.left = itemRect.left + 'px';
                    ghost.style.width = itemRect.width + 'px';
                    ghost.style.height = itemRect.height + 'px';
                    ghost.style.zIndex = '1000';
                    ghost.style.opacity = '0.9';
                    ghost.style.pointerEvents = 'none';
                    document.body.appendChild(ghost);

                    // Add placeholder
                    item.style.opacity = '0';
                }
                
                if (!isDragging) return;
                
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                
                // Move the ghost
                const ghost = document.querySelector('.dragging');
                if (ghost) {
                    ghost.style.transform = `translate(${dx}px, ${dy}px)`;
                }
                
                // Find position in grid
                const mouseY = e.clientY;
                const elements = Array.from(this.gridLayout.children);
                let targetIndex = elements.length;

                for (let i = 0; i < elements.length; i++) {
                    const el = elements[i];
                    if (el === item) continue;
                    
                    const rect = el.getBoundingClientRect();
                    const centerY = rect.top + rect.height / 2;
                    
                    if (mouseY < centerY) {
                        targetIndex = i;
                        break;
                    }
                }

                // Move the actual item
                const currentIndex = elements.indexOf(item);
                if (targetIndex !== currentIndex) {
                    if (targetIndex === elements.length) {
                        this.gridLayout.appendChild(item);
                    } else {
                        this.gridLayout.insertBefore(item, elements[targetIndex]);
                    }
                }
            };
            
            const onMouseUp = (e) => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                
                const dragDuration = Date.now() - this.dragStartTime;
                
                if (!isDragging && dragDuration < 200) {
                    // It was a click, not a drag
                    item.classList.toggle('collapsed');
                } else if (isDragging) {
                    // Remove ghost
                    const ghost = document.querySelector('.dragging');
                    if (ghost) ghost.remove();
                    
                    // Restore item
                    item.style.opacity = '1';
                    
                    // Animate final position
                    const finalRect = item.getBoundingClientRect();
                    const dx = itemRect.left - finalRect.left;
                    const dy = itemRect.top - finalRect.top;
                    
                    item.style.transform = `translate(${dx}px, ${dy}px)`;
                    requestAnimationFrame(() => {
                        item.style.transition = 'transform 0.2s ease-out';
                        item.style.transform = 'translate(0, 0)';
                        setTimeout(() => {
                            item.style.transition = '';
                        }, 200);
                    });
                }
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }
}

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    window.gridManager = new GridManager();
}); 