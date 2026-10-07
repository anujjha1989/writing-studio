// iOS keeps the layout viewport taller than the visible page when the keyboard opens.
// Share its visible bounds with overlays and the editor, including after rotation.
const viewport = window.visualViewport;
function updateViewport() {
  const height = viewport?.height ?? innerHeight;
  const top = viewport?.offsetTop ?? 0;
  // Pinch zoom also shrinks the viewport; it should not be mistaken for a keyboard.
  const inset = !viewport || viewport.scale === 1 ? Math.max(0, innerHeight - height - top) : 0;
  const style = document.documentElement.style;
  style.setProperty('--visible-height', `${height}px`);
  style.setProperty('--viewport-top', `${top}px`);
  style.setProperty('--keyboard-inset', `${inset}px`);
  document.body.classList.toggle('keyboard-open', inset > 100);
}
viewport?.addEventListener('resize', updateViewport, { passive: true });
viewport?.addEventListener('scroll', updateViewport, { passive: true });
addEventListener('resize', updateViewport, { passive: true });
updateViewport();
