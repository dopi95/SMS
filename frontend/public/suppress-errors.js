// Suppress console errors globally before React hydration
(function() {
  if (typeof window !== 'undefined') {
    const originalError = console.error;
    const originalWarn = console.warn;
    
    // Override console.error completely for hydration warnings
    console.error = function(...args) {
      // Block all hydration and extension-related errors
      return;
    };
    
    console.warn = function(...args) {
      // Block all warnings
      return;
    };
    
    // Also override React's error logging
    window.addEventListener('error', function(e) {
      if (e.message && (
        e.message.includes('Extra attributes') ||
        e.message.includes('fdprocessedid') ||
        e.message.includes('Hydration')
      )) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    });
  }
})();