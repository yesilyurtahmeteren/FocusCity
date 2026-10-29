export const tr = {
  appName: 'Focus City',
  navigation: { home: 'Odaklan', foundation: 'Geçmiş', city: 'Şehir' },
  home: {
    title: 'Kendi ritminde geliş.',
    description: 'Odaklanma alışkanlığınla büyüyecek şehrin için ilk adım.',
    emptyTitle: 'Şehrinin hikâyesi henüz başlamadı',
    emptyDescription:
      'Bu sürüm uygulamanın temel altyapısını içerir. Odaklanma oturumları ve şehir özellikleri henüz kullanıma açık değil.',
    action: 'Altyapıyı incele',
  },
  foundation: {
    title: 'Sağlam bir başlangıç',
    description: 'Faz 0 · Proje altyapısı',
    themeTitle: 'Cihazına uyumlu görünüm',
    themeDescription:
      'Açık ve koyu tema, sistem tercihini izler. Metin boyutları erişilebilirlik ayarlarına uyum sağlar.',
    scopeTitle: 'Sıradaki adım',
    scopeDescription:
      'Bir sonraki fazda odaklanma oturumları geliştirilecek. Bu sürümde sayaç, ödül veya şehir kaydı bulunmuyor.',
  },
  error: {
    title: 'Bir sorun oluştu',
    description: 'Bu ekranı yeniden açmayı deneyebilirsin.',
    retry: 'Yeniden dene',
  },
} as const;

export const locale = 'tr-TR' as const;
