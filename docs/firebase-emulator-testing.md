# Ręczny test kont pracowników w Emulatorach Firebase

Ta procedura używa wyłącznie projektu `demo-gastromanager`. Nie wykonuje
wdrożenia i nie powinna zapisywać danych w produkcyjnym Firebase.

## Przygotowanie

Wymagane są Node.js, Java oraz zależności zainstalowane przez `npm install`.
Porty są zapisane centralnie w `firebase-emulators.json`:

- Authentication: `127.0.0.1:9099`;
- Firestore: `127.0.0.1:8080`;
- Emulator UI: `127.0.0.1:4000`.

## Test krok po kroku

1. W pierwszym terminalu uruchom `npm.cmd run emulators`.
   Oczekiwany wynik: Auth, Firestore i Emulator UI działają dla
   `demo-gastromanager`; terminal pozostaje zajęty do zakończenia pracy.
2. W drugim terminalu uruchom `npm.cmd run dev:emulators`.
   Oczekiwany wynik: Vite pokazuje lokalny adres aplikacji, a konsola informuje
   o jawnym połączeniu z Emulatorami.
3. Otwórz aplikację i utwórz konto administratora/właściciela. Jeżeli testujesz
   bootstrap starego właściciela, najpierw dodaj w Emulator UI dokument
   `users/{uid}/app/state`; nowe przypadkowe konto nie może ominąć tego warunku.
   Oczekiwany wynik: konto ma członkostwo właściciela tylko we własnej
   restauracji.
4. W ustawieniach zespołu utwórz pracownika, wymagany profil uprawnień i wybierz
   „Utwórz zaproszenie”. Oczekiwany wynik: w kolekcji `invitations` powstaje
   dokument `pending` z terminem ważności, bez hasła i PIN-u.
5. Skopiuj pokazany link aktywacyjny i otwórz go w osobnym profilu/oknie
   przeglądarki. Oczekiwany wynik: aplikacja nie twierdzi, że wysłała samo
   zaproszenie e-mailem; link przekazuje manager.
6. Zarejestruj konto dokładnie adresem zapisanym w zaproszeniu. Oczekiwany
   wynik: Firebase Auth tworzy użytkownika, ale nieweryfikowany e-mail nie może
   jeszcze przyjąć zaproszenia.
7. Otwórz `http://127.0.0.1:4000`, przejdź do Authentication i otwórz lokalną
   wiadomość/link weryfikacyjny. Oczekiwany wynik: po kliknięciu konto ma
   `emailVerified: true`.
8. Wróć do `/konto`, odśwież status i przyjmij zaproszenie. Oczekiwany wynik:
   jedna transakcja tworzy `members/{authUid}` i usuwa dokument zaproszenia;
   przerwanie operacji nie zostawia połowy wyniku.
9. Ustaw czterocyfrowy PIN lokalny. Oczekiwany wynik: Firestore nie otrzymuje
   PIN-u; w pamięci przeglądarki zapisane są tylko sól i weryfikator PBKDF2.
10. Zamknij i ponownie otwórz aplikację. Oczekiwany wynik: Firebase Auth
    odtwarza konto i członkostwo, a lokalny PIN odblokowuje tylko to urządzenie.
11. Porównaj konto managera i zwykłego pracownika. Oczekiwany wynik: pracownik
    z `can_view_schedule` widzi wyłącznie dozwoloną projekcję grafiku i własną
    dyspozycję; operacje managerskie wymagają właściwych uprawnień.
12. Jako manager ustaw członkostwo pracownika na `blocked`, pozostawiając jego
    sesję zalogowaną. Oczekiwany wynik: następny odczyt/zapis chronionych danych
    jest odrzucony przez reguły.
13. W Emulator UI sprawdź użyte zaproszenie. Oczekiwany wynik: dokument nie
    istnieje, a członkostwo istnieje dokładnie w zaproszonej restauracji.
14. Utwórz testowe wygasłe zaproszenie/kod z `expiresAt` w przeszłości, po czym
    wejdź uprawnionym kontem do zespołu. Oczekiwany wynik: dane własnej
    restauracji są usunięte, a dane innych restauracji pozostają bez zmian.
15. Zakończ oba procesy klawiszami `Ctrl+C` i sprawdź Firebase Console projektu
    produkcyjnego. Oczekiwany wynik: nie ma nowych kont ani dokumentów;
    konfiguracja używała wyłącznie identyfikatora zaczynającego się od `demo-`.

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
