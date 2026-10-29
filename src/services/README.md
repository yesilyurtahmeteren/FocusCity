# Services

Cihaz saati adaptörü `focus-clock.ts` içindedir. Focus domain ihtiyaç duyduğu UTC milisaniyeyi parametre olarak alır; economy/map domain duvar saati kullanmaz. `application-save.ts` v1/v2→v3 migration, tamamlanan oturum settlement ve kayıt/ledger/map replay doğrulamasını yapar. Provider AsyncStorage adaptörünü store'a enjekte eder. Auth/sync veya ağ servisi yoktur.
