// Shared by the match centre and its storyboard.
(() => {
  const palettes = {
    matchday: 'Matchday',
    forest: 'Pitch green',
    midnight: 'Midnight blue',
    burgundy: 'Burgundy',
    charcoal: 'Carbon gold'
  };
  const modes = {auto: 'Device', light: 'Light', dark: 'Dark'};
  const preferenceKey = 'boltz-appearance';
  const darkPreference = matchMedia('(prefers-color-scheme: dark)');
  let palette = 'matchday';
  let mode = 'auto';

  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(preferenceKey));
      if (saved && Object.hasOwn(palettes, saved.palette) && Object.hasOwn(modes, saved.mode)) {
        palette = saved.palette;
        mode = saved.mode;
        return;
      }
      const legacy = localStorage.getItem('boltz-theme');
      if (['day','night','forest','midnight','burgundy','charcoal'].includes(legacy)) {
        palette = Object.hasOwn(palettes, legacy) ? legacy : 'matchday';
        mode = ['day','forest'].includes(legacy) ? 'light' : 'dark';
      }
    } catch { /* Preferences still work without persistent storage. */ }
  }
  function apply() {
    const effective = mode === 'auto' ? (darkPreference.matches ? 'dark' : 'light') : mode;
    document.body.dataset.mode = effective;
    document.body.dataset.palette = palette;
    document.documentElement.style.colorScheme = effective;
    for (const input of document.querySelectorAll('[data-appearance]')) {
      input.checked = input.value === (input.dataset.appearance === 'mode' ? mode : palette);
    }
    document.body.dispatchEvent(new CustomEvent('boltz-appearance', {bubbles:true,detail:{mode:effective,palette}}));
  }
  function options(key, choices, selected) {
    return Object.entries(choices).map(([value,label]) =>
      '<label class="appearance-option"><input type="radio" data-appearance="'+key+'" name="appearance-'+key+'" value="'+value+'" '+(selected === value ? 'checked' : '')+'><span data-swatch="'+value+'">'+label+'</span></label>'
    ).join('');
  }
  window.appearanceControls = () =>
    '<h2>Appearance</h2><fieldset class="appearance-field"><legend>Mode</legend><div>'+options('mode',modes,mode)+'</div></fieldset>'+
    '<fieldset class="appearance-field"><legend>Colour palette</legend><div>'+options('palette',palettes,palette)+'</div></fieldset>';

  document.addEventListener('change', event => {
    const input = event.target;
    if (!input.matches('input[data-appearance]')) return;
    if (input.dataset.appearance === 'mode' && Object.hasOwn(modes,input.value)) mode = input.value;
    if (input.dataset.appearance === 'palette' && Object.hasOwn(palettes,input.value)) palette = input.value;
    try { localStorage.setItem(preferenceKey, JSON.stringify({palette, mode})); } catch {}
    apply();
  });
  darkPreference.addEventListener('change', () => { if (mode === 'auto') apply(); });
  window.addEventListener('storage', event => {
    if (event.key === preferenceKey && event.newValue) { restore(); apply(); }
  });
  restore();
  apply();
})();
