// Service Worker — 勤怠アプリ PWA キャッシュ戦略
const CACHE_NAME = 'kintai-v1'
const STATIC_CACHE = 'kintai-static-v1'

// プリキャッシュするアセット
const PRECACHE_URLS = [
  '/',
  '/stamp',
  '/login',
  '/offline',
]

// インストール: 静的アセットをプリキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

// アクティベート: 古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME && key !== STATIC_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

// フェッチ: ネットワーク優先 + キャッシュフォールバック
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // API リクエストはネットワークのみ（キャッシュしない）
  if (url.pathname.startsWith('/api/')) {
    return
  }

  // ナビゲーションリクエスト（ページ遷移）
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // 成功したらキャッシュに保存
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          return response
        })
        .catch(() => {
          // オフライン時はキャッシュから返す
          return caches.match(request)
            .then(cached => cached || caches.match('/offline'))
        })
    )
    return
  }

  // 静的アセット（JS, CSS, 画像, フォント）: キャッシュ優先
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/_next/image') ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/)
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          const clone = response.clone()
          caches.open(STATIC_CACHE).then(cache => cache.put(request, clone))
          return response
        })
      })
    )
    return
  }

  // その他: ネットワーク優先
  event.respondWith(
    fetch(request)
      .then(response => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
        return response
      })
      .catch(() => caches.match(request))
  )
})
