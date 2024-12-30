const PopupManager = (function () {
  const createPopup = (id, content, options = {}) => {
    const svg = document.querySelector('svg');
    const popup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    popup.setAttribute('id', id);
    popup.setAttribute('class', 'popup');

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('rx', options.rx || 10);
    rect.setAttribute('fill', options.fill || '#ffe6d5');
    rect.setAttribute('stroke', options.stroke || '#cc3300');
    rect.setAttribute('stroke-width', options.strokeWidth || 1);
    popup.appendChild(rect);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', 5);
    text.setAttribute('y', 15);
    text.setAttribute('font-size', options.fontSize || '0.8em');
    text.setAttribute('fill', options.textColor || '#000');
    text.textContent = content;
    popup.appendChild(text);

    svg.appendChild(popup);

    updatePopupDimensions(popup);
  };

  const updatePopupDimensions = (popup) => {
    const text = popup.querySelector('text');
    const rect = popup.querySelector('rect');
    const bbox = text.getBBox();

    rect.setAttribute('width', bbox.width + 10);
    rect.setAttribute('height', bbox.height + 20);
    rect.setAttribute('x', 0);
    rect.setAttribute('y', 0);
  };

  const showPopup = (id, x, y, adjust = { dx: 0, dy: 0 }) => {
    const popup = document.getElementById(id);
    const rect = popup.querySelector('rect');
    popup.style.display = 'block';

    const popupWidth = parseFloat(rect.getAttribute('width'));
    const popupHeight = parseFloat(rect.getAttribute('height'));

    const boundedX = Math.max(10, Math.min(x + adjust.dx - popupWidth / 2, 1100 - popupWidth - 10));
    const boundedY = Math.max(10, Math.min(y + adjust.dy - popupHeight, 700 - popupHeight - 10));

    popup.setAttribute('transform', `translate(${boundedX}, ${boundedY})`);
    popup.classList.add('show');
  };

  const hidePopup = (id) => {
    const popup = document.getElementById(id);
    if (popup) {
      popup.classList.remove('show');
      popup.style.display = 'none';
    }
  };

  return {
    createPopup,
    showPopup,
    hidePopup,
  };
})();

function setupInteractivity() {
  const pills = document.querySelectorAll('.pill');
  pills.forEach(pill => {
    const popupId = pill.dataset.popup;

    pill.addEventListener('mouseenter', (event) => {
      const bbox = pill.getBoundingClientRect();
      const svg = document.querySelector('svg');
      const pt = svg.createSVGPoint();
      pt.x = bbox.x + bbox.width / 2;
      pt.y = bbox.y;
      const svgPoint = pt.matrixTransform(svg.getScreenCTM().inverse());

      // Adjust positions for specific popups
      const adjust = popupId === 'popup-likelihood'
        ? { dx: -50, dy: -50 }
        : popupId === 'popup-prior'
        ? { dx: 50, dy: -50 }
        : { dx: 0, dy: 30 };

      PopupManager.showPopup(popupId, svgPoint.x, svgPoint.y, adjust);
      fadeOthers(pill, true);
    });

    pill.addEventListener('mouseleave', () => {
      PopupManager.hidePopup(popupId);
      fadeOthers(pill, false);
    });
  });

  const posterior = document.querySelector('#posterior');
  posterior.addEventListener('click', () => {
    const notes = document.querySelector('.notes');
    notes.classList.toggle('show');
  });
}

function fadeOthers(target, fade) {
  document.querySelectorAll('.pill').forEach(pill => {
    if (pill !== target) {
      pill.classList.toggle('faded', fade);
    }
  });
}
