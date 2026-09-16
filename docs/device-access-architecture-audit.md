# Audyt dostępu urządzeń GastroManagera

Data audytu: 8 września 2026 r.

Zakres tego etapu obejmuje analizę istniejącego rozwiązania i naprawę sprzątania
danych tymczasowych. Nie obejmuje wdrożenia nowego modelu urządzeń, nowego
ekranu PIN ani migracji danych produkcyjnych.

## Wnioski wykonawcze

Obecny dokument `deviceSessions/{authTime}` potwierdza konkretną sesję logowania,
a nie fizyczne urządzenie. `auth_time` pochodzi z zaufanego tokenu Firebase Auth,
więc nie może zostać dowolnie podany przez klienta. Jest to bezpieczniejsze od
samego lokalnego identyfikatora, ale nietrwałe: każde ponowne logowanie
e-mailem i hasłem tworzy nową wartość `auth_time` oraz nową ścieżkę dokumentu.

Silnego i trwałego zatwierdzenia pojedynczego urządzenia nie należy budować
wyłącznie po stronie klienta. Firestore Rules nie otrzymują dowolnego sekretu
ani nagłówka urządzenia przy zwykłym odczycie. Widzą przede wszystkim zaufaną
tożsamość z `request.auth.token`, ścieżkę, metodę, czas, zapytanie i dane
zapisywanego dokumentu. Lokalny `deviceId` przesłany przez klienta pozostaje
twierdzeniem klienta i może zostać skopiowany.

Rekomendacja: pozostawić obecny model do czasu świadomej decyzji o backendzie,
a docelowo zastosować minimalny backend autoryzujący klucz urządzenia i
wydający token z podpisanym kontekstem `device_id`. Nie należy wdrażać
pozornego wariantu klientowego jako zabezpieczenia.

## Obecny przebieg

1. Pracownik przyjmuje zaproszenie konta lub urządzenia.
2. Aplikacja pobiera `auth_time` z tokenu Firebase Auth.
3. Powstaje dokument:
   `restaurants/{restaurantId}/members/{authUid}/deviceSessions/{authTime}`.
4. Dokument zawiera losowy `deviceId`, dane opisowe, status `active`, czas
   zatwierdzenia i ostatniej aktywności.
5. Lokalnie zapisywane są:
   - wskazanie zatwierdzonego urządzenia dla pary `authUid/restaurantId`;
   - sól i weryfikator PBKDF2 lokalnego PIN-u dla pary `authUid/deviceId`.
6. Przy każdym chronionym żądaniu pracownika reguły odczytują `auth_time` z
   tokenu i wymagają aktywnego dokumentu sesji o dokładnie takim ID.
7. Ponowne logowanie e-mailem i hasłem nadaje nowy `auth_time`. Dokument nowej
   sesji nie istnieje, dlatego pojawia się „Urządzenie niezatwierdzone”.

Lokalny zapis `gm_approved_device_v1` nie uczestniczy w autoryzacji reguł i nie
jest obecnie używany jako bezpieczny sposób odnalezienia urządzenia po nowym
logowaniu. To prawidłowe z punktu widzenia bezpieczeństwa: dane z localStorage
nie są zaufanym dowodem dla serwera.

## Wady obecnego modelu

- zatwierdzenie znika logicznie po każdym nowym logowaniu, mimo że `deviceId`
  i lokalny PIN nadal mogą istnieć;
- główny przycisk „Wyloguj” dla konta Firebase wywołuje pełne
  `logoutCurrentDevice()`: usuwa lokalny PIN i lokalne wskazanie urządzenia oraz
  kończy sesję Firebase;
- automatyczna bezczynność korzysta już z lżejszego `lockApplication()`, ale
  zachowanie głównego przycisku nie jest z nią spójne;
- status urządzenia obsługuje `active` i `disconnected`, ale nie ma osobnego
  `suspended` oraz operacji przywrócenia;
- `lastActiveAt` jest aktualizowane przy wczytaniu kontekstu, nie stanowi
  ciągłego monitora obecności;
- usunięcie danych przeglądarki usuwa lokalny PIN i identyfikator urządzenia;
- trwały cache Firestore może pozostawić wcześniej pobrane dane dostępne
  offline. Odebranie dostępu jest egzekwowane przez serwer po ponownym
  połączeniu, ale nie może „cofnąć” odczytu już znajdującego się w lokalnym
  cache odłączonego urządzenia;
- jedno konto w kilku restauracjach ma osobne członkostwa i osobne dokumenty
  sesji, lecz wszystkie są nadal związane z jednym `auth_time` logowania.

## Model stanów aplikacji

| Stan | Firebase Auth | Lokalny PIN | Dokument urządzenia | Dostęp biznesowy |
| --- | --- | --- | --- | --- |
| Odblokowana | aktywny | zweryfikowany | `active` | dozwolony zgodnie z członkostwem |
| Zablokowana PIN-em | pozostaje aktywny | wymagany | `active` | listenery zatrzymane, stan wrażliwy wyczyszczony |
| Wylogowana z aplikacji | brak aktywnej sesji w UI | pozostaje | `active` | brak do ponownego logowania i autoryzacji urządzenia |
| Urządzenie wstrzymane | może pozostać aktywny | pozostaje | `suspended` | blokada serwerowa po kontakcie z serwerem |
| Urządzenie usunięte | sesja ma zostać zakończona | usunięty | brak aktywnego dokumentu | nowe zaproszenie wymagane |
| Nowe urządzenie | aktywny po logowaniu | brak | brak | tylko aktywacja i wylogowanie |
| Członkostwo zablokowane | może pozostać aktywny | bez znaczenia | dowolny | reguły blokują całą restaurację |

Te stany muszą być osobnymi operacjami. Nie wolno kierować ich wszystkich do
jednego `logout()`.

## Znaczenie operacji docelowych

### Zablokuj aplikację

- pozostawia Firebase Auth, `deviceId`, dokument urządzenia i weryfikator PIN;
- zatrzymuje listenery, czyści wrażliwy stan Pinia i blokuje router;
- po poprawnym PIN-ie ponownie pobiera kontekst i uruchamia listenery;
- jest jedynym mechanizmem używanym przez główny przycisk „Wyloguj” oraz timeout
  bezczynności.

### Wyloguj z aplikacji

- kończy sesję Firebase i wraca do logowania e-mail/hasło;
- nie usuwa zatwierdzenia urządzenia ani lokalnego PIN-u;
- po ponownym logowaniu wymaga bezpiecznego potwierdzenia tego samego urządzenia
  przez backend, ale nie nowego zaproszenia.

### Wstrzymaj urządzenie

- ustawia `status: suspended`;
- zachowuje dokument, lokalny PIN i możliwość przywrócenia;
- urządzenie nie może samo zmienić statusu;
- po `status: active` ponownie działa bez zaproszenia i ustawiania PIN-u.

### Usuń urządzenie

- trwale usuwa aktywne poświadczenie urządzenia;
- czyści lokalny PIN przy następnym kontakcie klienta;
- kończy bieżący dostęp i wymaga nowego zaproszenia;
- informacja audytowa może pozostać w oddzielnej historii bezpieczeństwa.

### Zablokuj członkostwo

- blokuje wszystkie urządzenia danego konta tylko w danej restauracji;
- nie wpływa na aktywne członkostwa tego konta w innych restauracjach.

## Ocena proponowanego modelu danych

Docelowa ścieżka jest właściwa:

```text
restaurants/{restaurantId}/members/{authUid}/devices/{deviceId}
```

Minimalny dokument:

```js
{
  deviceId: 'losowy-identyfikator-niebędący-sekretem',
  restaurantId: '...',
  authUid: '...',
  employeeId: '...',
  name: 'Telefon służbowy',
  status: 'active', // active | suspended
  publicKey: { /* publiczna część klucza urządzenia */ },
  credentialVersion: 1,
  approvedAt: '...',
  approvedBy: '...',
  suspendedAt: null,
  suspendedBy: null,
  lastSeenAt: '...',
  schemaVersion: 1
}
```

`deviceId` identyfikuje rekord, lecz nie uwierzytelnia urządzenia. Sekret lub
prywatny klucz pozostaje wyłącznie w bezpiecznym magazynie przeglądarki/PWA.
Firestore nie może zawierać PIN-u, weryfikatora PIN-u, hasła, tokenu Firebase,
surowego sekretu ani prywatnego klucza.

## Możliwości i ograniczenia Firestore Rules

Odpowiedzi na pytania bezpieczeństwa:

1. **Czy Rules mogą potwierdzić posiadanie sekretu urządzenia?** Nie przy
   zwykłym odczycie SDK. Rules nie wykonują zewnętrznej kryptografii ani
   wyzwania podpisu urządzenia.
2. **Czy sekret można przekazać przy zwykłym odczycie?** Nie jako dowolny,
   zaufany nagłówek widoczny dla Rules. Umieszczenie wartości w ścieżce lub
   zapytaniu czyni ją danymi podanymi przez klienta i nie zapewnia dowodu
   posiadania klucza.
3. **Czy można wstrzymać jedno urządzenie bez backendu?** Można sterować UI i
   sprawdzać dokument wskazany przez klienta, ale bez zaufanego powiązania
   `deviceId` z tokenem nie jest to silna izolacja jednego urządzenia.
4. **Czy wariant klientowy jest realnym zabezpieczeniem?** Zapewnia kontrolę
   wygody i ograniczenie przypadkowego użycia, lecz nie odporną na skopiowanie
   identyfikatora lub modyfikację klienta kontrolę urządzenia.
5. **Czy `auth_time` jest bezpieczne, ale nietrwałe?** Tak. Claim jest podpisany
   przez Firebase Auth, ale zmienia się przy nowym logowaniu.
6. **Minimalny backend:** dwie małe funkcje callable do wyzwania i weryfikacji
   podpisu klucza urządzenia oraz wydania custom tokenu z `device_id` i
   `restaurant_id`. Reguły sprawdzają podpisany claim i aktywny dokument
   urządzenia.
7. **Częstotliwość backendu:** przy pierwszym zatwierdzeniu, jawnym logowaniu
   e-mail/hasło i przełączeniu restauracji. Lokalny PIN i zwykłe operacje
   Firestore nie wywołują backendu.
8. **Koszt:** wymaga planu Blaze. Przy dwóch wywołaniach na autoryzację i
   założeniu 60 urządzeń na restaurację daje około 120 wywołań miesięcznie na
   restaurację przy jednej autoryzacji urządzenia miesięcznie: 120 / 1 200 /
   2 400 dla 1 / 10 / 20 restauracji. Nawet przy codziennej autoryzacji byłoby
   około 3 600 / 36 000 / 72 000 wywołań miesięcznie. To znacznie poniżej
   oficjalnego limitu 2 mln bezpłatnych wywołań miesięcznie, ale projekt nadal
   wymaga podpiętego rozliczenia, budżetów i uwzględnienia czasu CPU, sieci,
   logów, buildów oraz przechowywania obrazu funkcji. Nie jest to gwarancja
   zerowego rachunku.

## Wariant bez backendu

Można zachować `deviceSessions/{authTime}` i poprawić tylko interfejs:

- główny przycisk oraz bezczynność blokują aplikację PIN-em;
- pełne wylogowanie jasno ostrzega, że ponowne logowanie wymaga zaproszenia;
- manager nadal odłącza konkretną sesję logowania;
- `deviceId` może służyć wyłącznie jako etykieta i pomoc UX.

Zaleta: brak Functions i planu Blaze. Wada: nie spełnia wymagania trwałego
zatwierdzenia po wylogowaniu e-mail/hasło ani silnego wstrzymania fizycznego
urządzenia. Nie należy opisywać tego wariantu jako pełnej kontroli urządzeń.

## Wariant z minimalnym backendem — rekomendowany

1. Podczas zatwierdzania PWA generuje parę kluczy; klucz prywatny jest
   nieeksportowalny i pozostaje lokalnie, publiczny trafia do dokumentu.
2. `beginDeviceAuthorization` zwraca jednorazowe, krótko ważne wyzwanie.
3. Urządzenie podpisuje wyzwanie, a `completeDeviceAuthorization` sprawdza:
   Firebase Auth, członkostwo, status urządzenia i podpis.
4. Backend wydaje custom token dla tego samego `authUid`, zawierający podpisane
   `restaurant_id`, `device_id` i wersję poświadczenia.
5. Firestore Rules wymagają zgodnych claimów i dokumentu `status: active`.
6. Zmiana statusu na `suspended`, usunięcie urządzenia lub blokada członkostwa
   natychmiast blokuje nowe operacje serwerowe po dotarciu żądania do Firestore.

Przed wdrożeniem trzeba prototypem w Emulatorze potwierdzić zachowanie
dodatkowych claimów po odświeżeniu tokenu, przełączenie restauracji oraz obsługę
utraty lokalnego klucza. Nie należy używać globalnego custom claimu urządzenia
ustawianego na koncie, ponieważ jedno konto może działać równocześnie na wielu
urządzeniach i w wielu restauracjach.

## PWA, restart i tryb offline

- `browserLocalPersistence` zachowuje sesję Auth po zamknięciu okna i restarcie
  aplikacji, dopóki użytkownik jawnie się nie wyloguje lub dane witryny nie
  zostaną usunięte.
- Aktualizacja kodu PWA nie powinna usuwać IndexedDB ani localStorage.
- Usunięcie profilu przeglądarki lub danych aplikacji usuwa lokalny klucz i PIN,
  więc wymaga nowego zaproszenia.
- Reset hasła unieważnia dotychczasowe tokeny odświeżania i wymaga ponownego
  logowania; zatwierdzenie urządzenia może pozostać, ale musi ponownie przejść
  backendowe wyzwanie.
- Urządzenie offline może pokazywać dane wcześniej zapisane w trwałym cache.
  Po odzyskaniu sieci reguły odrzucą żądania urządzenia wstrzymanego/usuniętego,
  a listener powinien wyczyścić wrażliwy stan i lokalny cache. Nie da się zdalnie
  usunąć danych z urządzenia, które pozostaje całkowicie offline.

## Plan migracji z `deviceSessions/{authTime}`

1. Dodać feature flagę nowego modelu, domyślnie wyłączoną.
2. Dodać backend i reguły dla `devices/{deviceId}` bez usuwania starych ścieżek.
3. Nowe aktywacje zapisywać w nowym modelu, a konta testowe ponownie zatwierdzić.
4. Dodać ekran PIN i rozdzielone operacje blokady, wylogowania i odłączenia.
5. Dodać managerowi statusy `active/suspended` i osobną historię audytową.
6. Przenieść testowe urządzenia, następnie przeprowadzić kontrolowaną migrację
   urządzeń produkcyjnych. Legacy PIN pozostaje aktywny do osobnej decyzji.
7. Po okresie przejściowym oznaczyć stare sesje jako legacy. Odłączone sesje
   usuwać po 90 dniach; aktywnych starych sesji nie usuwać automatycznie przed
   potwierdzeniem migracji użytkownika.
8. Dopiero po pełnych testach wyłączyć reguły `auth_time`.

## Wpływ i możliwość wycofania

- Obecne konta testowe mogą zostać wyczyszczone i ponownie aktywowane.
- Produkcyjne urządzenia legacy nie są zmieniane w tym etapie.
- Rollback polega na wyłączeniu feature flagi i powrocie do kontroli
  `deviceSessions/{authTime}`. Nowych dokumentów nie trzeba usuwać w trakcie
  rollbacku.
- Żadna migracja nie może usuwać członkostw, pracowników, grafików ani historii.

## Następne etapy

1. Decyzja właściciela projektu: ograniczony wariant bez backendu albo Blaze i
   minimalny backend.
2. Prototyp kryptograficzny i test custom tokenu wyłącznie w Emulatorze.
3. Model `devices`, statusy oraz reguły równolegle do legacy.
4. Rozdzielenie komend: blokada PIN, wylogowanie konta, wstrzymanie i usunięcie.
5. Nowy mobilny ekran PIN z klawiaturą ekranową, klawiaturą fizyczną,
   dostępnością i dyskretnymi ustawieniami.
6. Poprawki aktywacji wymienione w wymaganiach, bez usuwania kodu legacy.
7. Testy PWA: restart, aktualizacja, offline, utrata storage, reset hasła,
   wiele urządzeń i wiele restauracji.
8. Kontrolowany pilotaż w projekcie testowym, a znacznie później osobna decyzja
   o publikacji.

## Wymagane testy nowego modelu

- podpis prawidłowego i obcego klucza;
- replay starego wyzwania;
- skopiowany `deviceId` bez klucza prywatnego;
- `active`, `suspended`, przywrócenie i trwałe usunięcie;
- blokada członkostwa wszystkich urządzeń jednej restauracji;
- brak wpływu na drugą restaurację tego samego konta;
- restart i aktualizacja PWA;
- wylogowanie e-mail/hasło oraz ponowne rozpoznanie urządzenia;
- reset hasła i odświeżanie tokenów;
- utrata IndexedDB/localStorage;
- urządzenie offline w momencie odebrania dostępu;
- brak PIN-u, weryfikatora, hasła i sekretów w Firestore i logach;
- zgodność oraz późniejsze wycofanie legacy PIN.

## Źródła oficjalne Firebase

- Firestore Rules — struktura `request`:
  https://firebase.google.com/docs/reference/rules/rules.firestore.Request
- Firestore Rules — warunki i limity odczytów reguł:
  https://firebase.google.com/docs/firestore/security/rules-conditions
- Firestore — zapytania i reguły („rules are not filters”):
  https://firebase.google.com/docs/firestore/security/rules-query
- Firestore — indeksy dla zapytań złożonych:
  https://firebase.google.com/docs/firestore/query-data/index-overview
- Firebase Auth — trwałość sesji webowej:
  https://firebase.google.com/docs/auth/web/auth-state-persistence
- Firebase Auth — zarządzanie sesjami i unieważnianie tokenów:
  https://firebase.google.com/docs/auth/admin/manage-sessions
- Firebase Auth — custom claims i zaufane środowisko Admin SDK:
  https://firebase.google.com/docs/auth/admin/custom-claims
- Cloud Functions — funkcje callable i automatyczna walidacja Auth/App Check:
  https://firebase.google.com/docs/functions/callable
- Firebase — cennik i bezpłatne limity Functions/Firestore:
  https://firebase.google.com/pricing
- Cloud Functions — limity i wymaganie planu Blaze:
  https://firebase.google.com/docs/functions/quotas
