# GastroManager — zasady pracy

- Projekt: GastroManager, Vue 3 + Vite, JavaScript bez TypeScriptu, Pinia, Vue Router i Firebase.
- Teksty interfejsu mają być po polsku.
- Interfejs projektuj mobile-first, czytelny na smartfonie, w dotychczasowym stylu iOS aplikacji.
- Zachowuj istniejący styl kodu i strukturę projektu.
- Przed zmianą zawsze sprawdzaj powiązane widoki, store’y, router i reguły Firestore.
- Wprowadzaj małe, możliwe do osobnego przetestowania etapy.
- Po zmianach uruchamiaj odpowiednie testy lub `npm run build`.
- Nie usuwaj ani nie migruj istniejących danych bez wyraźnego polecenia.
- Nie zmieniaj plików niezwiązanych z zadaniem.
- Nie wykonuj `git commit` ani `git push` bez wyraźnego polecenia.
- Obiekty zapisywane w Firestore powinny mieć trwałe identyfikatory.
- W module grafiku manager ma „God Mode”: system ostrzega o ograniczeniach, ale ręczna decyzja managera może je pominąć.
- Grafiki robocze mają być zapisywane w Firebase i pozostawać edytowalne.
- Jeżeli wymaganie jest niejednoznaczne, najpierw zapytaj zamiast przyjmować istotne założenie.
