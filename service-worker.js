self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open('video-cache').then((cache) => {
			return cache.addAll([
				'./front.html',
				'./favicon.png',
				'./assets/css/video-style.css',
				'./assets/js/video-script.js',
				'./assets/img/arrow-down.svg',
				'./assets/img/arrow-up.svg',
				'./assets/img/camera.svg',
				'./assets/img/external-link.svg',
				'./assets/img/half-star.svg',
			]);
		})
	);
});

self.addEventListener('fetch', (event) => {
	event.respondWith(
		caches.match(event.request).then((response) => {
			return response || fetch(event.request);
		})
	);
});