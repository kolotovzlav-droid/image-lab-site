import('./tour-webgl.js?v=parkfit').then(({ startTour }) => startTour()).catch(() => {
  const canvas = document.querySelector('#tour-scene');
  canvas.replaceWith(canvas.cloneNode());
  const fallback = document.createElement('script');
  fallback.src = 'tour.js?v=parkfit';
  document.head.append(fallback);
});
