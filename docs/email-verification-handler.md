# Własne potwierdzanie adresu e-mail

Aplikacja udostępnia publiczny handler:

```text
/potwierdz-email
```

Handler obsługuje wyłącznie akcję `mode=verifyEmail`. Wymaga jednorazowego
`oobCode` oraz `apiKey` zgodnego z konfiguracją projektu uruchomionej aplikacji.
Reset hasła, odzyskiwanie adresu i potwierdzanie zmiany adresu nie są na tej
stronie wykonywane.

Wiadomość weryfikacyjna nie otrzymuje tokenu zaproszenia w `continueUrl`.
Użytkownik potwierdza adres w osobnej karcie, zamyka ją i wraca do pozostawionej
otwartej aktywacji.

## Test lokalny w Emulatorze

1. Uruchom lokalne Emulatory wyłącznie dla `demo-gastromanager`:

   ```text
   npm.cmd run emulators
   ```

2. Uruchom aplikację:

   ```text
   npm.cmd run dev:emulators
   ```

3. Rozpocznij aktywację fikcyjnego konta i wyślij wiadomość weryfikacyjną.
4. W Emulator UI otwórz sekcję Authentication i skopiuj jednorazowy `oobCode`
   z lokalnej wiadomości. Nie zapisuj go w repozytorium ani logach.
5. W tej samej lokalnej instancji otwórz:

   ```text
   http://localhost:5173/potwierdz-email?mode=verifyEmail&oobCode=<KOD_Z_EMULATORA>&apiKey=demo-api-key
   ```

6. Kliknij „Potwierdź adres”, zamknij kartę i w pierwotnej karcie aktywacji
   wybierz „Sprawdź potwierdzenie”.

Ten test nie wymaga ani nie może używać prawdziwego projektu Firebase.

## Konfiguracja przyszłej domeny testowej

W projekcie Firebase przeznaczonym dla danej domeny:

1. Dodaj domenę do listy Authentication → Settings → Authorized domains.
2. Upewnij się, że serwer domeny obsługuje routing SPA i zwraca aplikację dla
   ścieżki `/potwierdz-email`.
3. Przejdź do Authentication → Templates → Email address verification.
4. Otwórz edycję szablonu, wybierz „Customize action URL” i wpisz dokładnie:

   ```text
   https://<domena-testowa>/potwierdz-email
   ```

5. Zapisz ustawienie i sprawdź cały przepływ na fikcyjnym koncie.

Nie wykonuj tego kroku dla projektu produkcyjnego w ramach lokalnych testów.

## Konfiguracja przyszłej domeny produkcyjnej

Po zakończeniu testów i po osobnej zgodzie na publikację wykonaj analogiczne
kroki, używając wyłącznie docelowej domeny produkcyjnej:

```text
https://<domena-produkcyjna>/potwierdz-email
```

Najpierw trzeba potwierdzić obsługę routingu SPA, autoryzację domeny i poprawne
działanie pozostałych wiadomości dotyczących konta.

Firebase opisuje niestandardowy adres obsługi akcji jako ustawienie używane
przez wiadomości zarządzania kontem. Ten etap implementuje celowo tylko
`verifyEmail`, dlatego inne tryby są bezpiecznie odrzucane. Przed zmianą adresu
w prawdziwym projekcie trzeba osobno sprawdzić reset hasła, odzyskiwanie adresu
i potwierdzanie zmiany adresu.

Dopóki „Customize action URL” nie zostanie ustawione w Firebase Console,
wiadomości nadal otwierają domyślny ekran Firebase zamiast polskiej strony
aplikacji. Samo dodanie trasy w kodzie nie zmienia adresu w istniejącym
szablonie.

Dokumentacja Firebase:

- https://firebase.google.com/docs/auth/custom-email-handler
- https://firebase.google.com/docs/reference/js/auth.actioncodesettings
