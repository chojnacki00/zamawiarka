# Wspólna obsługa wiadomości Firebase Auth

Aplikacja udostępnia jeden publiczny handler wszystkich używanych wiadomości
zarządzania kontem:

```text
/akcja-konta
```

Adres `/potwierdz-email` pozostaje aliasem zgodności, ale nie jest docelowym
Action URL. Handler sprawdza `apiKey`, obecność jednorazowego `oobCode` oraz
rzeczywistą operację kodu zwróconą przez Firebase Auth. Nie przekierowuje do
`continueUrl` i nie pokazuje kodów ani parametrów technicznych.

## Obsługiwane operacje

- `verifyEmail` — sprawdza kod i dopiero po kliknięciu potwierdza adres.
- `resetPassword` — sprawdza kod przez `verifyPasswordResetCode()`, wymaga
  zgodnych haseł spełniających politykę projektu i zapisuje je przez
  `confirmPasswordReset()`; nie loguje automatycznie.
- `verifyAndChangeEmail` — sprawdza typ kodu i dopiero po kliknięciu potwierdza
  zmianę adresu zainicjowaną przez `verifyBeforeUpdateEmail()`.
- `recoverEmail` — samo otwarcie tylko sprawdza kod; przywrócenie poprzedniego
  adresu wymaga świadomego kliknięcia i nie wysyła automatycznie kolejnej
  wiadomości.

`emailSignIn`, `revertSecondFactorAddition` i nieznane tryby nie są wykonywane.

## Dlaczego handler musi być wspólny

Ustawienie „Customize action URL” w Firebase Authentication jest wspólne dla
szablonów wiadomości danego projektu. Nie wolno wskazywać strony obsługującej
wyłącznie `verifyEmail`, ponieważ przerwałoby to reset hasła, potwierdzenie
zmiany e-maila i cofnięcie nieautoryzowanej zmiany adresu.

## Test lokalny w Emulatorze

1. Uruchom Emulatory wyłącznie dla `demo-gastromanager`:

   ```text
   npm.cmd run emulators
   ```

2. Uruchom aplikację:

   ```text
   npm.cmd run dev:emulators
   ```

3. Wywołaj badaną operację na fikcyjnym koncie.
4. Otwórz lokalną wiadomość w Authentication Emulator UI. Nie zapisuj jej kodu
   w repozytorium ani logach.
5. Wiadomość powinna prowadzić do:

   ```text
   http://localhost:5173/akcja-konta
   ```

6. Sprawdź osobno potwierdzenie adresu, reset hasła, potwierdzenie zmiany adresu
   i cofnięcie zmiany adresu.

## Przyszła konfiguracja domeny testowej

Najpierw aplikacja musi zostać udostępniona pod wskazanym adresem, serwer musi
obsługiwać routing SPA dla `/akcja-konta`, a domena musi znajdować się na liście
autoryzowanych domen Authentication. Dopiero po pełnym teście wszystkich
czterech operacji można ustawić wspólny Action URL:

```text
https://<domena-testowa>/akcja-konta
```

Zmianę wykonuje się w Firebase Console w konfiguracji szablonów wiadomości.
Samo dodanie trasy w kodzie nie zmienia adresu używanego w wiadomościach.

## Przyszła konfiguracja produkcyjna

Nie wolno ustawiać produkcyjnego Action URL, dopóki ta wersja aplikacji nie
zostanie osobno zatwierdzona, wdrożona pod docelową domeną i dokładnie
przetestowana dla wszystkich operacji. Docelowy format to:

```text
https://<domena-produkcyjna>/akcja-konta
```

Konfiguracja produkcyjna wymaga osobnego polecenia i zgody. Lokalne testy ani
samo wdrożenie kodu nie upoważniają do zmiany Firebase Console.

Dokumentacja Firebase:

- https://firebase.google.com/docs/auth/custom-email-handler
- https://firebase.google.com/docs/reference/js/auth.actioncodeinfo
- https://firebase.google.com/docs/reference/js/auth.actioncodeoperation
- https://firebase.google.com/docs/reference/js/auth
