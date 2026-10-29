import type { MapError } from '@/domain/map/placement';

export const mapCopy = {
  title: 'Yerleşim prototipi',
  balance: 'Kullanılabilir para',
  inspect: 'İncele',
  addRoad: 'Yol ekle · Ücretsiz',
  removeRoad: 'Yol kaldır',
  chooseCell:
    'Bir araç seç, ardından haritada bir hücreye dokun. Binalar seçilen hücreden sağa ve aşağı yerleşir.',
  scrollHint:
    '12×12 harita yatay kaydırılır. Diğer satırları görmek için ekranı dikey kaydır. Ortadaki 8×8 arazi açık.',
  legend: 'B: Belediye · K: Konut · P: Park · E: Santral · Y: Yol · ×: Kilitli',
  preview: 'Yerleşim önizlemesi',
  valid: 'Geçerli yerleşim',
  invalid: 'Yerleşim yapılamaz',
  disconnected: 'Uyarı: Belediye merkezine bağlı bir yola erişmiyor.',
  removeWarning: 'Uyarı: Bu yolun kaldırılması bağlantıları koparabilir.',
  connected: 'Belediyeye bağlı yol erişimi var.',
  noConnection: 'Belediyeye bağlı yol erişimi yok.',
  confirm: 'Değişikliği onayla',
  cancel: 'Önizlemeyi iptal et',
  price: 'Onayda ödenecek para',
  selected: 'Seçilen hücre',
  noSelection: 'Henüz hücre seçilmedi.',
  empty: 'Boş arazi',
  locked: 'Kilitli arazi',
  road: 'Yol',
  active: 'Kurucu belediye · Etkin',
  planned: 'İnşaat planı · Henüz tamamlanmadı',
  progressHint:
    'Odaklanma emeğiyle inşaatı ilerletme henüz açık değil. Bu plan henüz nüfus veya hizmet sağlamaz.',
  move: 'Taşı · Ücretsiz',
  moving: 'Taşımak için yeni sol üst hücreyi seç.',
  fixed: 'Başlangıç belediyesi sabittir; taşınamaz.',
  focusNeeded: 'Gerekli odaklanma',
} as const;

export const mapErrors: Record<MapError, string> = {
  outside: 'Bütün yapı harita sınırları içinde kalmalı.',
  locked: 'Yapının bütün hücreleri açık arazide olmalı.',
  occupied: 'Bu alan bina veya yol ile çakışıyor.',
  funds: 'Bu yerleşim için yeterli şehir paran yok.',
  fixed: 'Başlangıç belediyesi yeniden satın alınamaz veya taşınamaz.',
  missing: 'Taşınacak yapı bulunamadı.',
  road_exists: 'Bu hücrede zaten bir yol var.',
  no_road: 'Bu hücrede kaldırılacak yol yok.',
  invalid: 'Bu değişiklik geçerli değil.',
  duplicate: 'Bu işlem zaten kaydedilmiş.',
};
