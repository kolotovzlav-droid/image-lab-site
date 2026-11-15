import('./tour-webgl.js?v=parkfit-layout').then(({ startTour }) => startTour()).catch(() => {
  const canvas = document.querySelector('#tour-scene');
  canvas.replaceWith(canvas.cloneNode());
  const fallback = document.createElement('script');
  fallback.src = 'tour.js?v=parkfit-layout';
  document.head.append(fallback);
});
