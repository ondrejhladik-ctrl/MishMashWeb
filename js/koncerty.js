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

   Když nebude žádný koncert, web ukáže „Nové koncerty brzy oznámíme“ + odkaz na Instagram. */

window.MM_KONCERTY = [
    { datum: '2026-12-05', cas: '19:00', mesto: 'Praha', misto: 'Křest EP – Kampus Hybernská', pozn: 'Info brzy' },
    // ZATÍM NEZVEŘEJŇOVAT – až bude možné, smaž „//“ na začátku řádku:
    // { datum: '2027-01-09', mesto: '', misto: 'Support na křtu kapely Finers', pozn: 'Info brzy' },
];
