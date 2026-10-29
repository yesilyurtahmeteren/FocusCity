# Faz 2 ekonomi sözleşmesi

Bu bölüm Faz 2'nin saf ekonomi temelini tanımlar. Faz 3'te harita harcamaları ve application save version 3 eklendi; güncel harita/ödül sıralaması ve migration için `docs/map.md` geçerlidir. Aşağıdaki version 2 replay açıklaması tarihsel temeldir; güncel store v3 net bakiyesini işlem günlüğüyle doğrular.

Bu değerler master planın ilk dengeleme varsayımlarıdır. Canlı katalog veya sunucuda doğrulanmış ekonomi değildir. Kaynak kodu `src/domain/economy/balance.ts` içinde merkezileştirilmiştir.

| Kural      | Tam sayı hesabı / saklanan kalan                                                     |
| ---------- | ------------------------------------------------------------------------------------ |
| Temel para | `floor((öncekiKalan + geçerliSaniye * 2) / 60)`; pay kalanı 0–59                     |
| Temel RP   | `floor((öncekiRpSaniye + geçerliSaniye) / 600)`; saniye kalanı 0–599                 |
| Bonus RP   | `floor((öncekiBonusBirim + geçerliSaniye * bonusBP) / 6_000_000)`; kalan 0–5_999_999 |
| Emek       | Geçerli saniye bir kez `unallocatedLaborSeconds` içine eklenir                       |
| Dönem      | Toplam geçerli saniyenin her 3600'ünde bir; saniye kalanı 0–3599                     |

Bonus birimi 1/6.000.000 RP'dir. Böylece farklı oturum bonuslarıyla kazanılan saniyeler de kesir kaybetmez. Bir okul +500, kütüphane +1000, üniversite +1500, eğitim programı +500 basis point sağlar; toplam en fazla 3000 (%30). Kaynaklar adet değil “ilk aktif var mı” boolean değerleridir. Bonus oturum başındaki snapshot'a bağlıdır; oturum ortası veya sonundaki şehir durumu bonusu geriye dönük değiştirmez. Bu fazda bina/politika olmadığı için gerçek oturum snapshot'ı 0'dır. Eski kayıtlardaki eksik bonus da 0 kabul edilir.

Ödül ID'si oturum ID'sidir. Aynı ID ve içerik ikinci kez verildiğinde no-op; aynı ID farklı süre/bonus/bitiş içeriğiyle geldiğinde hata. İptal 0 ödeme ve 0 emektir. Para ve RP ayrıca kazanılır; emek dağıtım API'si bu fazda yoktur, dolayısıyla aynı süre iki projeye yazılamaz.

## Şehir ve dönem girdileri

`CityState` kalıcı kaynakları, kalıntıları, nüfusu, vergi tercihini ve son dönem raporunu tutar. Hesaplanabilir memnuniyet her karede state'e kopyalanmaz. `CityConditions` saf fonksiyona verilen türetilmiş altyapı girdisidir: aktif konut kapasitesi, aktif seviye 1 ticaret sayısı, altyapı katsayısı, hizmet erişim bonus/eksileri ve işletme hizmetleri. Yol/enerji uygunluğunu haritadan türetme sonraki fazlara aittir. Koordinat, bina yerleştirme veya hayalî bina örnekleri Faz 2 kaydına eklenmedi.

Uygulama şu anda boş altyapı kullanır: nüfus/kapasite/vergi/gider 0, dönem memnuniyeti 50. Testlerdeki konut/ticaret/hizmet girdileri açıkça sentetik engine fixture'larıdır; üretim UI'sine yüklenmez.

## Dönem sırası

1. Tamamlanan oturumun para/RP/emek ödülünü bir kez ekle.
2. Kazanılmış ama işlenmemiş dönemleri artan sırayla işle. Aynı dönem tekrar çağrılırsa no-op; atlanan veya kazanılmamış dönem reddedilir.
3. Bekleyen vergi değişikliği varsa bu yeni dönemin başında etkinleştir. Bu fazda politika değiştiren UI/API sunulmaz.
4. Aktif nüfus `min(nüfus, aktifKonutKapasitesi)`; temel vergi `floor(aktifNüfus / 5) + 30 * aktifSeviye1TicaretSayısı`.
5. Vergiyi politika katsayısıyla çarp, aşağı yuvarla: düşük 7500, dengeli 10000, yüksek 13500 BP.
6. Kullanılabilir bütçe mevcut para + vergi. İşletme hizmetlerini önce küçük `priority`, eşitlikte ID'nin kod birimi sırasıyla fonla. Yeterli bütçe yoksa o hizmeti atla, daha ucuz alt sıradakileri değerlendirmeye devam et. Borç veya otomatik bina silme yok.
7. Finanse edilen gider / istenen gider oranını 10000 BP tabanında aşağı yuvarla. Bu ilk prototipte hizmet bonuslarına ve göç altyapı katsayısına bu oran uygulanır. Finanse edilemeyen hizmet ID'leri ve istenen/ödenen giderler rapora yazılır. Gider talebi yoksa finansman katsayısı 10000'dir. Kesinti yalnızca bu dönem için hesaplanır; gelecek dönemde bütçe yeniden değerlendirilir.
8. Memnuniyet `clamp(50 + fonlananPark/Eğitim/KamuBonusu + vergiEtkisi - altyapıCezası, 0, 100)`. Vergi etkisi düşük +6, dengeli 0, yüksek −10.
9. Göç `min(max(0, kapasite-nüfus), floor(5 * memnuniyet/100 * etkinAltyapı/10000 * göçBP/10000))`. Göç BP düşük 12000, dengeli 10000, yüksek 7500. Tüm ara çarpımlar safe integer; nüfus eksilmez.
10. `lastProcessedCityPeriod` ve son raporu güncelle; tüm oturum işlemini tek snapshot olarak kaydet.

Bu sırada çok dönem kazandıran bir oturumun ödülü dönemlerden önce cüzdana geçer. Farklı oturumlara bölme, ileride hizmet finansmanı başladığında dönem başındaki likiditeyi değiştirebilir; temel para/RP/emek oranlarını değiştiremez. Harita ile mahalle bazlı kapsama, tek tek hizmet kesintilerinin özgül etkileri ve belediye programları sonraki fazların ayrı sözleşmesidir.

Seviye 1 gider varsayımları: park 3, santral 12, okul 8, kütüphane 6, ticaret 5; konut/belediye 0. Önerilen gelecekteki servis önceliği santral → okul → kütüphane → park → ticaret; `priority` girdisi bunu açıkça belirleyecek. Konut kapasiteleri 10/20/35 olarak tanımlı; diğer yüksek seviye gider veya hizmet değerleri uydurulmadı.

## Kalıcılık ve doğrulama

Uygulama zarfı version 2; iç focus verisi geriye uyumlu version 1. Tamamlanan geçmişin kalıcı kayıt sırası ters çevrilerek eski→yeni işlenir; UTC'ye göre sıralanmaz. Cihaz saatini geri almak ledger sırasını değiştiremez. Yüklemede ledger ve CityState, geçmiş + bonus snapshot'larından yeniden hesaplanıp kayıtla karşılaştırılır. Tutarsız bakiye, negatif değer, eksik veya çift ödeme sessizce düzeltilmez; kayıt korunarak hata gösterilir.

Bu doğrulama, harcama ve inşa olmadığı için tam replay yapabilir. Faz 3/5 veya belediye değişiklikleri eklenirken yeni kayıt sürümü ve olay sözleşmesi gerekir; version 2 üzerinde balances doğrudan değiştirilmemeli. Yerel veri değiştirilebildiğinden bu yöntem sunucu güvenliği veya hile önleme iddiası taşımaz.

Duvar saati ekonomi motoruna parametre değildir. Bitmiş oturumu olmayan üç gün, dönem/borç/nüfus kaybı üretmez. Kullanıcı uygulamayı kapatmadan önce çalışan bir odaklanma oturumu varsa, o oturumun en fazla planlanan süresi Faz 1 kuralıyla tamamlanıp bir kez ödüllendirilebilir; aradan geçen günler ayrıca sayılmaz.
