console.log("Popup script loaded");

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
  // Get root element
  const root = document.getElementById('root');
  
  // Create main container
  const container = document.createElement('div');
  container.className = 'App width-300';
  
  // Create title
  const title = document.createElement('h1');
  title.className = 'text-center';
  title.textContent = 'alphaXiv';
  
  // Create description
  const description = document.createElement('p');
  description.className = 'text-md';
  description.innerHTML = '<em>You can adjust your settings below.</em>';
  
  // Create form group
  const form = document.createElement('form');
  form.className = 'flex flex-col gap-2';

  // Create checkbox options
  const options = [
    {
      id: 'showAlphaXiv',
      label: 'Show AlphaXiv Link',
      tooltip: 'Shows an AlphaXiv link next to the PDF download button on ArXiv pages.',
      disabled: false
    },
    {
      id: 'alertWhenActivity',
      label: 'Alert When Activity (coming soon)',
      tooltip: 'This feature is currently under development.',
      disabled: true
    },
    {
      id: 'ntab',
      label: 'Open in New Tab (coming soon)',
      tooltip: 'This feature is currently under development.',
      disabled: true
    }
  ];

  // Load saved preferences
  browser.storage.sync.get(['user_preferences']).then(result => {
    const savedPrefs = result.user_preferences || { showAlphaXiv: true };

    options.forEach(option => {
      const wrapper = document.createElement('div');
      wrapper.className = 'flex items-center justify-between gap-2';

      const label = document.createElement('label');
      label.className = 'flex items-center gap-2';
      if (option.disabled) {
        label.style.color = '#999';
      }
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = option.id;
      checkbox.checked = savedPrefs[option.id] || false;
      checkbox.disabled = option.disabled;
      
      if (!option.disabled) {
        checkbox.addEventListener('change', () => {
          browser.storage.sync.get(['user_preferences']).then(current => {
            const prefs = current.user_preferences || { showAlphaXiv: true };
            prefs[option.id] = checkbox.checked;
            browser.storage.sync.set({ user_preferences: prefs });
          });
        });
      }

      const labelText = document.createElement('span');
      labelText.textContent = option.label;

      // Create tooltip
      const tooltip = document.createElement('span');
      tooltip.className = 'tooltip';
      tooltip.title = option.tooltip;
      tooltip.innerHTML = '?';
      
      label.appendChild(checkbox);
      label.appendChild(labelText);
      wrapper.appendChild(label);
      wrapper.appendChild(tooltip);
      form.appendChild(wrapper);
    });
  });

  // Create footer
  const footer = document.createElement('div');
  footer.className = 'mt-4';
  footer.innerHTML = `
    <hr>
    <p class="text-2xs text-center">alphaXiv 2024</p>
  `;

  // Assemble all elements
  container.appendChild(title);
  container.appendChild(document.createElement('hr'));
  container.appendChild(description);
  container.appendChild(form);
  container.appendChild(footer);
  
  root.appendChild(container);

  // Add more event listeners as needed
});
