import '@testing-library/jest-dom/vitest'

// The suite asserts the Turkish surface, so state the locale instead of relying
// on whatever the application default happens to be. A test that inherits the
// default silently stops covering the language it was written for.
window.history.replaceState({}, '', '/?lang=tr')
