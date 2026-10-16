/* ─── KONCERTY MISH MASH ───
   Jediné místo, kde se koncerty upravují. Web je sám seřadí podle data,
   nejbližší zvýrazní (blikající tečka) a po datu je automaticky přesune do „Odehráno“.
   Na úvodní stránce se ukazují 3 nejbližší.

   Jeden koncert = jeden řádek { … }:
     datum:    'RRRR-MM-DD'      povinné
     cas:      '20:00'           nepovinné
     mesto:    'Praha'
     misto:    'Název klubu / akce'
     odkaz:    'https://…'       vstupenky nebo událost (GoOut, Facebook…) – nepovinné
     tlacitko: 'Vstupenky'       text tlačítka u odkazu – nepovinné
     pozn:     'Vstup zdarma'    ukáže se místo tlačítka, když není odkaz – nepovinné
     ukazka:   true              jen pro ukázková data (zobrazí štítek „ukázka“) – u skutečných koncertů vynech

   !!! NÍŽE JSOU UKÁZKOVÁ DATA – přepiš je skutečnými koncerty (nebo je smaž) !!!
   Když nebude žádný koncert, web ukáže „Nové koncerty brzy oznámíme“ + odkaz na Instagram. */

window.MM_KONCERTY = [
    { datum: '2026-11-13', cas: '20:00', mesto: 'Město', misto: 'Název klubu', pozn: 'Vstupenky brzy', ukazka: true },
    { datum: '2026-11-28', cas: '21:00', mesto: 'Město', misto: 'Název klubu', pozn: 'Info brzy', ukazka: true },
    { datum: '2026-12-12', cas: '19:30', mesto: 'Město', misto: 'Název akce', pozn: 'Vstup zdarma', ukazka: true },
    { datum: '2026-09-19', cas: '20:00', mesto: 'Město', misto: 'Název klubu', ukazka: true },
    { datum: '2026-06-20', cas: '18:00', mesto: 'Město', misto: 'Název festivalu', ukazka: true }
];
