# Retencja danych GastroManagera

Dokument opisuje stan po drugim etapie tożsamości pracowników. Nie jest zgodą
na masowe usuwanie danych trwałych. Każde przyszłe automatyczne czyszczenie ma
być ograniczone do konkretnej kolekcji i restauracji oraz otrzymać osobne testy.

## Rejestr

| Kolekcja / miejsce | Rodzaj danych | Trwałe | Okres przechowywania | Zdarzenie usuwające | Mechanizm awaryjny | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `restaurants/{restaurantId}/invitations` | Zaproszenia do kont pracowników | Nie | Do przyjęcia, anulowania albo wygaśnięcia; obecnie zaproszenie wygasa po 7 dniach | Przyjęcie usuwa dokument w tej samej transakcji, która tworzy członkostwo; anulowanie usuwa wskazany dokument | Uprawniony manager usuwa wygasłe dokumenty partiami po maks. 450 przy wejściu do zespołu i przed tworzeniem zaproszenia | Poprawione w tym etapie |
| `pairing_codes` | Przejściowe kody starego parowania PIN | Nie | 3 minuty | Stary ekran próbuje usunąć kod po użyciu albo po wykryciu wygaśnięcia | Uprawniony manager usuwa wygasłe kody swojej restauracji partiami po maks. 450 | Częściowo poprawione; stary niezalogowany ekran jest blokowany przez nowe reguły i zostanie usunięty wraz z legacy PIN |
| `users/{restaurantId}/grafik_dyspozycyjnosc` | Wpisy dyspozycji pracowników i managera | Tak, do odrębnej decyzji retencyjnej | Bezterminowo na tym etapie | Usunięcie konkretnego wpisu przez uprawnionego użytkownika; przy usunięciu pracownika usuwane są jego wpisy | Brak automatycznego czyszczenia | Decyzja odłożona; nie usuwać starych wpisów automatycznie |
| `users/{restaurantId}/grafik_dyspozycyjnosc_wersje` | Liczniki wersji dni dyspozycji | Tak | Bezterminowo razem z historią dyspozycji | Tylko jawna operacja managera | Brak | Decyzja odłożona |
| `users/{restaurantId}/grafik_okresy_dyspozycji` | Okresy zbierania dyspozycji | Tak | Bezterminowo | Jawne usunięcie okresu zgodnie z logiką widoku; nie usuwa automatycznie samych wpisów dyspozycji | Brak | Wdrożone wcześniej; okres i wpisy pozostają niezależne |
| `users/{restaurantId}/dyspozycje_dni` | Dane dnia używane przy tworzeniu grafiku | Tak | Bezterminowo | Wyłącznie jawna operacja managera | Brak | Decyzja odłożona |
| `users/{restaurantId}/grafiki` | Nagłówki edytowalnych grafików | Tak | Do jawnego usunięcia dozwolonego grafiku | `deleteSchedule` usuwa tylko wskazany, gotowy i nieopublikowany grafik | Transakcja przerywa całość przy błędzie lub obcym dokumencie | Wdrożone wcześniej; nie czyścić automatycznie |
| `users/{restaurantId}/grafik_dni` | Dni i zmiany grafiku, w tym snapshoty nazw | Tak | Jak grafik | Usunięcie wskazanego grafiku; historia pracownika nie jest usuwana przy usunięciu pracownika | Sprawdzenie `scheduleId` i transakcja | Wdrożone wcześniej; nie czyścić automatycznie |
| `users/{restaurantId}/grafik_aktualizacje` | Aktualizacje, historia publikacji i snapshot planowania (`recordType: planning_context`) | Tak | Jak grafik | Usunięcie wskazanego, nieopublikowanego grafiku usuwa dokumenty o tym samym `scheduleId` | Sprawdzenie właściciela danych i transakcja | Wdrożone wcześniej; nie czyścić automatycznie |
| `users/{restaurantId}/grafiki_opublikowane` | Bezpieczne publiczne nagłówki grafików | Tak | Jak historia publikacji | Wycofanie publikacji lub dozwolone usunięcie wskazanego grafiku | Transakcja i kontrola `scheduleId` | Wdrożone wcześniej; nie czyścić automatycznie |
| `users/{restaurantId}/grafik_opublikowane_dni` | Odchudzone opublikowane dni i zmiany | Tak | Jak historia publikacji | Wycofanie publikacji lub dozwolone usunięcie wskazanego grafiku | Transakcja i kontrola `scheduleId` | Wdrożone wcześniej; nie czyścić automatycznie |
| `localStorage: gm_local_pin_v1:{authUid}` | Sól, weryfikator PBKDF2, licznik prób i czas blokady lokalnego PIN-u | Nie, dane urządzenia | Do wylogowania konta z urządzenia | `logoutCurrentDevice` usuwa rekord danego `authUid` | Ręczne wyczyszczenie danych witryny | Wdrożone; jawny PIN nie jest zapisywany |
| `localStorage: gm_saved_*`, `gm_emp_id`, `gm_rest_id`, `gm_failed_attempts` | Dane starszego logowania i parowania PIN | Przejściowe | Do resetu/wylogowania starej sesji; część kluczy może pozostać po przejściu na nowe konto | Stare widoki usuwają wybrane klucze; nowe wylogowanie usuwa większość kontekstu | Ręczne wyczyszczenie danych witryny | Do usunięcia po zakończeniu testów prawdziwego Firebase |
| Firebase Authentication | Konto logowania pracownika | Tak | Do jawnej decyzji administratora | Usunięcie dokumentu pracownika nie usuwa konta Auth | Ręczne zarządzanie w Firebase Console; docelowo zaufane środowisko administracyjne | Decyzja odłożona; klient nie może bezpiecznie usuwać cudzych kont Auth |
| `restaurants/{restaurantId}/members` | Powiązanie konta Auth z restauracją, pracownikiem i profilem | Tak | Do blokady albo jawnego usunięcia dostępu | Manager może zablokować lub usunąć cudze członkostwo; pracownik nie zmienia własnego statusu/profilu | Reguły odcinają zablokowane członkostwo przy aktywnej sesji | Wdrożone częściowo; polityka usuwania pracownika i całej restauracji wymaga osobnej decyzji |

## Zachowanie nowych operacji czyszczenia

- Czyszczenie zaproszeń działa tylko w
  `restaurants/{restaurantId}/invitations` i ponownie porównuje
  `restaurantId` każdego dokumentu.
- Czyszczenie kodów działa tylko w `pairing_codes`, wymaga filtra
  `companyUid == restaurantId` i ponownie porównuje właściciela dokumentu.
- Obie operacje używają partii po 450 zapisów, czyli pozostawiają zapas względem
  limitu 500 operacji Firestore.
- Błąd kolejnej partii zwraca wynik częściowy i nie blokuje otwarcia formularza
  ani utworzenia nowego zaproszenia. Kolejne wejście może bezpiecznie wznowić
  czyszczenie.
- Operacje nie mają ścieżki do grafików, dyspozycji ani członkostw.

## Firestore TTL a czyszczenie przez aplikację

Firestore TTL usuwa dokumenty w tle na podstawie pola czasu; usunięcie nie jest
natychmiastowe i zwykle następuje w ciągu 24 godzin po wygaśnięciu. TTL wymaga
włączenia polityki w projekcie, a operacje TTL są rozliczane jako usunięcia i
nie mają bezpłatnego użycia. Z tego powodu TTL nie został włączony.

Aktualne czyszczenie aplikacyjne działa bez dodatkowej konfiguracji projektu i
pozwala natychmiast usuwać dokumenty przy konkretnym zdarzeniu. Nie zapewnia
jednak sprzątania, jeśli żaden uprawniony manager nie otworzy odpowiedniego
widoku. Po wyborze planu Firebase można rozważyć TTL jako awaryjną warstwę dla
`expiresAt`, pozostawiając walidację wygaśnięcia w regułach niezależnie od
fizycznego usunięcia dokumentu.

## Podział decyzji

### Już prawidłowo usuwane

- przyjęte zaproszenie wraz z atomowym utworzeniem członkostwa;
- wskazany nieopublikowany grafik wraz z należącymi do niego dniami,
  aktualizacjami i ewentualną projekcją publiczną;
- lokalny weryfikator PIN nowego konta podczas wylogowania z urządzenia.

### Poprawione w tym etapie

- anulowanie zaproszenia przez fizyczne usunięcie;
- partiowe sprzątanie wygasłych zaproszeń;
- partiowe sprzątanie wygasłych kodów parowania właściwej restauracji;
- reguły i testy uniemożliwiające zwykłemu pracownikowi cudze usunięcia.

### Wymagające osobnej decyzji

- retencja starych dyspozycji, wersji i okresów;
- cykl życia konta Firebase Auth po usunięciu pracownika;
- usunięcie albo zachowanie członkostw po usunięciu pracownika/restauracji;
- pełne wycofanie starego parowania i kluczy `gm_saved_*`;
- ewentualne włączenie TTL po decyzji o planie i kosztach.

### Dane, których nie wolno usuwać automatycznie

- grafiki robocze i historyczne, dni grafików, aktualizacje oraz historia
  publikacji;
- snapshoty nazw pracowników i planowania zachowujące kontekst historyczny;
- dyspozycje do czasu przyjęcia osobnej polityki retencji;
- członkostwa i konta Auth bez jawnej decyzji administratora.
