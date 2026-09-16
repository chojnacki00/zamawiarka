# Ręczny test kont pracowników w Emulatorach Firebase

Ta procedura używa wyłącznie projektu `demo-gastromanager`. Nie wykonuje
wdrożenia i nie powinna zapisywać danych w produkcyjnym Firebase.

## Przygotowanie

Wymagane są Node.js, Java oraz zależności zainstalowane przez `npm install`.
Porty są zapisane centralnie w `firebase-emulators.json`:

- Authentication: `127.0.0.1:9099`;
- Firestore: `127.0.0.1:8080`;
- Emulator UI: `127.0.0.1:4000`.

Fikcyjnego, zweryfikowanego właściciela wraz z markerem legacy można przygotować
po uruchomieniu Emulatorów poleceniem:

```text
npm.cmd run seed:emulator-owner
```

Skrypt działa wyłącznie dla `demo-gastromanager` i hosta `127.0.0.1`. Twardo
odmawia pracy z produkcyjnym identyfikatorem projektu. Po wykonaniu wypisuje
fikcyjny e-mail, hasło i UID przeznaczone wyłącznie do lokalnych testów.

## Test krok po kroku

1. W pierwszym terminalu uruchom `npm.cmd run emulators`.
   Oczekiwany wynik: Auth, Firestore i Emulator UI działają dla
   `demo-gastromanager`; terminal pozostaje zajęty do zakończenia pracy.
2. W drugim terminalu uruchom `npm.cmd run dev:emulators`.
   Oczekiwany wynik: Vite pokazuje lokalny adres aplikacji, a konsola informuje
   o jawnym połączeniu z Emulatorami.
3. Aby sprawdzić bootstrap istniejącego właściciela, w Emulator UI przejdź do
   Authentication i utwórz użytkownika z całkowicie fikcyjnym e-mailem oraz
   fikcyjnym hasłem. Zaznacz `emailVerified`, zapisz konto i skopiuj jego UID.
   Nie używaj danych prawdziwego konta ani projektu innego niż
   `demo-gastromanager`.
4. W Firestore Emulator UI utwórz dokument `users/{uid}/app/state`, podstawiając
   skopiowany UID. Dodaj w nim pole `initialized` typu boolean o wartości `true`.
   Opcjonalny dokument `users/{uid}` może zawierać wyłącznie testowe oznaczenie,
   np. `emulatorSeed: true`; o możliwości bootstrapu decyduje poddokument
   `app/state`.
5. Otwórz `http://localhost:5173/login` i zaloguj się fikcyjnym e-mailem oraz
   hasłem utworzonym w Auth Emulatorze. Samo utworzenie konta w Emulator UI nie
   tworzy sesji przeglądarki i nie powinno przekierowywać do `/logowanie`.
6. Potwierdź automatyczny bootstrap. Oczekiwany wynik: aplikacja tworzy
   restaurację i członkostwo właściciela dla tego samego UID, po czym pokazuje
   testową restaurację. Nowe przypadkowe konto bez `users/{uid}/app/state` nie
   może ominąć tego warunku.

   Po poprawnym bootstrapie Firestore zawiera dokładnie powiązany zestaw:

   - `accounts/{uid}`;
   - `restaurants/{uid}`;
   - `restaurants/{uid}/members/{uid}` z `role: "owner"`, `status: "active"`,
     `employeeId: null` i `permissionProfileId: null`.

   Dokumenty są tworzone w jednej transakcji. Jeżeli po wcześniejszej próbie
   istnieje tylko `accounts/{uid}`, ponowne logowanie bezpiecznie dokończy
   bootstrap, o ile nadal istnieje `users/{uid}/app/state`. Konto bez tego
   markera nie uzyska restauracji ani członkostwa.
7. W ustawieniach zespołu utwórz pracownika z e-mailem i wymaganym profilem,
   a następnie wybierz „Utwórz zaproszenie”. Oczekiwany wynik: jeden modal
   pokazuje QR i identyczny link; Firestore zawiera prywatny skrót tokenu,
   bezpieczny publiczny podgląd i slot, ale nie surowy token, hasło ani PIN.
8. Skopiuj pokazany link aktywacyjny i otwórz go w osobnym profilu/oknie
   przeglądarki. Oczekiwany wynik: aplikacja nie twierdzi, że wysłała samo
   zaproszenie e-mailem; link przekazuje manager.
9. Zarejestruj konto dokładnie adresem zapisanym w zaproszeniu. Oczekiwany
   wynik: Firebase Auth tworzy użytkownika, ale nieweryfikowany e-mail nie może
   jeszcze przyjąć zaproszenia.
10. Otwórz `http://127.0.0.1:4000`, przejdź do Authentication i otwórz lokalną
   wiadomość/link weryfikacyjny. Oczekiwany wynik: po kliknięciu konto ma
   `emailVerified: true`.
11. Wróć do pierwotnego `/aktywacja?t=…`, nazwij urządzenie i zatwierdź.
   Oczekiwany wynik: jedna transakcja tworzy `members/{authUid}`, zapisuje
   `deviceSessions/{authTime}` i usuwa prywatny dokument, publiczny podgląd
   oraz slot; przerwanie operacji nie zostawia połowy wyniku.
12. Ustaw czterocyfrowy PIN lokalny. Oczekiwany wynik: Firestore nie otrzymuje
   PIN-u; w pamięci przeglądarki zapisane są tylko sól i weryfikator PBKDF2.
13. Zamknij i ponownie otwórz aplikację. Oczekiwany wynik: Firebase Auth
    odtwarza konto i członkostwo, a lokalny PIN odblokowuje tylko to urządzenie.
14. Porównaj konto managera i zwykłego pracownika. Oczekiwany wynik: pracownik
    z `can_view_schedule` widzi wyłącznie dozwoloną projekcję grafiku i własną
    dyspozycję; operacje managerskie wymagają właściwych uprawnień.
15. Jako manager wybierz „Dodaj urządzenie”, otwórz nowy QR w drugim profilu
    przeglądarki i zaloguj istniejące konto. Bez tego zaproszenia samo hasło nie
    daje dostępu. Następnie odłącz pierwsze urządzenie: tylko jego `auth_time`
    traci dostęp, a drugie nadal działa.
16. W Emulator UI sprawdź użyte zaproszenie. Oczekiwany wynik: dokument nie
    istnieje, a członkostwo istnieje dokładnie w zaproszonej restauracji.
17. Utwórz testowe wygasłe zaproszenie/kod z `expiresAt` w przeszłości, po czym
    wejdź uprawnionym kontem do zespołu. Oczekiwany wynik: dane własnej
    restauracji są usunięte, a dane innych restauracji pozostają bez zmian.
18. Zakończ oba procesy klawiszami `Ctrl+C` i sprawdź Firebase Console projektu
    produkcyjnego. Oczekiwany wynik: nie ma nowych kont ani dokumentów;
    konfiguracja używała wyłącznie identyfikatora zaczynającego się od `demo-`.

## Rozpoznanie błędu bootstrapu właściciela

Jeżeli po logowaniu istnieje tylko `accounts/{uid}`, a ekran pokazuje techniczny
błąd konfiguracji zamiast gotowej restauracji:

1. sprawdź, czy Auth Emulator pokazuje dokładnie ten sam UID i zweryfikowany
   e-mail;
2. sprawdź istnienie `users/{uid}/app/state` oraz boolean `initialized: true`;
3. uruchom Emulatory ponownie, aby wczytały aktualne lokalne `firestore.rules`;
4. sprawdź konsolę pod kątem błędu inicjalizacji konta — komunikat o braku linku
   zaproszenia jest prawidłowy wyłącznie dla konta bez markera legacy;
5. nie twórz ręcznie `restaurants/{uid}` ani `members/{uid}`. Ponowne logowanie
   powinno atomowo utworzyć lub dokończyć cały zestaw.

## Checklista przyszłej konfiguracji wiadomości Firebase

- nazwa aplikacji i nadawcy widoczna dla użytkownika: „GastroManager”;
- polski temat i treść weryfikacji adresu;
- adres powrotu prowadzący do `/konto`, bez tokenu zaproszenia;
- docelowa domena aplikacji dodana do autoryzowanych domen Firebase Auth;
- `localhost`/lokalny origin używany wyłącznie podczas testów;
- bez własnej usługi pocztowej techniczny adres nadawcy może nadal należeć do
  domeny projektu Firebase.

## Testy automatyczne

- `npm.cmd run test:firestore-rules` — uruchamia Firestore Emulator, testuje
  reguły i kończy Emulator również po błędzie.
- `npm.cmd run test:employee-auth-emulator` — uruchamia Auth i Firestore,
  wykonuje rzeczywisty przepływ rejestracji, weryfikacji i przyjęcia zaproszenia.
- `npm.cmd run test:emulators` — wykonuje oba zestawy w jednej izolowanej sesji.

Skrypt weryfikacyjny przed uruchomieniem odrzuca produkcyjny `projectId` oraz
rozbieżne porty. Produkcyjny build ignoruje flagę emulatorów, ponieważ
połączenie emulatorowe wymaga jednocześnie
`VITE_USE_FIREBASE_EMULATORS=true` i trybu deweloperskiego Vite.
