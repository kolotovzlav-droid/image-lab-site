import('./tour-webgl.js').then(({ startTour }) => startTour()).catch(() => {
  const canvas = document.querySelector('#tour-scene');
  canvas.replaceWith(canvas.cloneNode());
  const fallback = document.createElement('script');
  fallback.src = 'tour.js';
  document.head.append(fallback);
});
