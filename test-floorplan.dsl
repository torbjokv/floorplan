grid 1000

room Entre1 "Entré/hall" 4100x3300 at soverom3:top-right
    door 900 outwards-left at top (2000)
    door 800 at left (3600)
    part Entre1Part1 1700x1400 at Entre1:bottom-left

room Stue1 "Stue" 3500x6300 at entre1:top-right

room BadVask1 "Bad/vaskerom" 2400x2300 top-right at entre1

room Kjokken1 "Kjøkken" 2900x3900 at stuespis1:top-right

room Tvstue1 "TV-stue" 2900x3400 at kjokken1:bottom-left

room Gang1 "Garderobe" 1700x2200 bottom-left at entre2
    door 800 opening at left (100)
    object square "Garderobe" 2500x600 #b5835a at bottom-left
    part Gang1Part1 2400x1300 bottom-left at Gang1

room Stuespis1 "Stue/spisestue" 4400x7300 at entre2:bottom-left

room Soverom1 "Soverom 13.5" 3700x3600 bottom-right at stuespis1:bottom-left
    door 800 outwards-right at bottom (2200)

room Gang2 "Gang (2.2)" 1200x2200 at bad2:top-right

room Bad2 "Bad" 2500x2200 at soverom2:bottom-left

room Soverom2 "Soverom 8.4" 3700x2300 top-right at stuespis1:top-left

room Entre2 "Entré" 3200x4400 at soverom3:bottom-left
    window 800 at left (500)
    door 800 outwards-left at left (2500)
    door 800 opening at bottom (2200)
    object square "Trapp ned" 2000x1000 #8ff0a4 at bottom-left
    object square "Lav vegg" 2000x150 #b5835a at top-left (0, 2200)
    object square "Trapp opp" 1000x1000 #8ff0a4 at top-left (1000, 2400)
    object square "Skrivebord" 2000x1000 #b5835a at top-left (150, 0)

room Soverom3 "Soverom 13" 3200x2500 at zeropoint:top-left
    window 1200 at top (1200)
    door 800 at bottom (2200)
