# Вступительный комикс: раскадровка и промты

Комикс-предыстория показывается перед самым первым забегом и по кнопке «Предыстория» в главном меню: 12 кадров во весь экран, подпись внизу (RU/EN), дальше — клик, пробел или →, назад — ←, пропустить — ESC. Код — `src/comic.js`, сюжет — по [LORE.md](LORE.md).

Кадр 9 представляет **Золотого Мясника** — босса первого уровня. Боссов следующих уровней будем представлять отдельно, при переходе на эти уровни.

**Готовые кадры** — `assets/comic/intro_01.webp` … `intro_12.webp` (1920×1072, WebP). Оригиналы 2752×1536 лежат локально в `blender_assets/comic_concepts/` и в git не попадают. Лист персонажа Василия, по которому рисовались кадры, — `docs/comic_refs/vasiliy_comic_sheet.webp`.

**Как делали:** Gemini, модель 3.1 Pro, режим «Создание изображений», формат 16:9. Все кадры — в одном чате: сначала лист Василия, потом кадры по порядку; к кадрам с жабами, ларьком и Мясником прикладывались их концепты.

---

## Как генерировать

1. **Сначала — листы персонажей** (раздел «Персонажи»): Василий сегодня, молодой Василий и три жабы. В каждом кадре прикладывайте лист тех, кто в нём есть, как референс:
   - ChatGPT / Gemini — прикрепить картинку;
   - Midjourney — `--cref` / `--oref`.

   Для жаб уже есть хорошие концепты: `assets/enemies/toad_grunt_concept.jpg`, `toad_sniper_concept.png`, `toad_brute_concept.jpg`. Для Василия концепт пиксельный (`blender_assets/vasiliy_for_3d_clean.png`), поэтому лучше сначала сделать по нему лист в стиле комикса.
2. **Формат — 16:9**, лучше 1920×1080. В Midjourney добавить `--ar 16:9`.
3. **Без текста.** Подписи кладёт игра, а генераторы портят кириллицу. В каждом промте уже есть запрет на надписи. Нижняя пятая часть кадра — потемнее и попроще: там будет подпись.
4. **Один стиль на все кадры.** Блок «Стиль» дописывается в конец каждого промта: в промтах кадров он обозначен как `[STYLE]`. Метки `[VASILIY]`, `[TOAD GRUNT]` и т.п. заменяются описаниями из раздела «Персонажи» (или оставляются как есть, если приложен референс).
5. **Новый кадр** сожмите до 1920 px по ширине в WebP (качество ~80) и положите в `assets/comic/`, подпись допишите в `FRAMES` в `src/comic.js`.

---

## Стиль

```
Gritty graphic novel illustration, bold black ink outlines, hand-painted textures, muted desaturated palette of grey concrete, rust and olive green, toxic acid-green alien glow as the only bright accent, post-Soviet dieselpunk, dark humor tone, cinematic composition, painterly style inspired by Darkest Dungeon and Disco Elysium, widescreen 16:9, the lower fifth of the image darker and uncluttered for subtitles, no text, no letters, no captions, no speech bubbles, no watermark
```

---

## Персонажи

**[VASILIY] — Василий сегодня**
```
Vasiliy, a heavyset Russian homeless man in his early sixties, broad weathered ruddy face, grey stubble, tired but stubborn eyes, grey fur ushanka hat with ear flaps and a small red Soviet star badge, dirty padded olive-green camouflage winter jacket, dark olive padded trousers, worn black army boots, a canvas shoulder bag stuffed with empty glass bottles
```

**[YOUNG VASILIY] — Василий в 1980-х (кадр 2)**
```
young Vasiliy, a Soviet engineer in his late twenties with the same broad face and heavy build, clean-shaven, neat dark hair, horn-rimmed glasses, white lab coat over a shirt and narrow tie, pencil behind his ear
```

**[TOAD GRUNT] — жаба-пехотинец**
```
a muscular humanoid alien toad soldier, dark olive warty skin, wide grin full of sharp teeth, one yellow slit-pupil eye and one glowing cyan cybernetic monocle implant with wires, chest armor made from a dented red-and-white triangular road sign, leather harness straps, belt with pouches and glowing green acid canisters, torn military trousers, webbed feet, holding a rusty acid blaster built from pipes with pressure gauges and a gas tank
```

**[TOAD SNIPER] — жаба-снайпер**
```
a tall lanky alien toad sniper, long thin spotted olive legs and webbed feet, ragged ghillie-suit hood and cloak made of netting and rags, a night-vision monocular with a green glow strapped to its head, chest rig with pouches, long bolt-action sniper rifle with a green-glowing scope
```

**[TOAD BRUTE] — жаба-громила**
```
a massive obese hulking alien toad, dark green skin with glowing acid-yellow pustules on the head and shoulders, angry glowing yellow eyes, small tusks, rusty riveted scrap-iron shoulder pauldrons, a heavy iron collar plate, chains and leather harness across the belly, rebar bracers on the wrists
```

**[EMPEROR KVAKULA] — Император (только силуэт)**
```
a colossal bloated toad emperor shown only as a massive dark silhouette, a crude jagged crown, two huge glowing acid-green eyes, thin wisps of slime dripping from its jaws
```

**[KIOSK] — ларёк Михалыча** (референс: `blender_assets/cat3_concepts/mikhalyh_shop_clean.png`)
```
a small rusty teal-blue metal street kiosk with barred windows and a tiny serving hatch, sandbags piled around the base, a stovepipe chimney, an empty rusty sign frame on the roof, covered by a translucent glowing green energy dome
```

---

## Кадры

### 01. Город

> **RU:** Новохмуринск. Город, о котором забыли все.
> **EN:** Novokhmurinsk. A town everyone has forgotten.

```
Wide establishing shot of a dying post-Soviet industrial monotown at grey autumn dusk: rows of crumbling five-storey Khrushchyovka and nine-storey Brezhnevka panel blocks with a few lit windows, above-ground heating pipes wrapped in torn insulation releasing steam, a closed factory with cold smokestacks, a grim Soviet research institute building, concrete fences and rusty garages, a dark abandoned shopping mall on the edge of town, low heavy clouds, crows on power lines, melancholic calm before the storm. [STYLE]
```

### 02. НИИ (воспоминание)

> **RU:** Когда-то Василий был инженером НИИ. Он чертил будущее.
> **EN:** Once, Vasiliy was an engineer at a research institute. He drew the future.

```
Flashback in warm faded sepia tones: a 1980s Soviet research institute design bureau, [YOUNG VASILIY] leaning over a large drafting board covered with blueprints of a strange steam-powered machine, rows of drafting tables, colleagues in lab coats, a propaganda poster about progress on the wall, sunlight through tall windows, proud hopeful atmosphere. [STYLE]
```

### 03. НИИ закрыт

> **RU:** Потом будущее закрыли на замок. Вместе с НИИ.
> **EN:** Then the future was locked away. Along with the institute.

```
Rainy grey day in the 1990s: the entrance of the Soviet research institute boarded up with planks, a heavy chain and padlock on the door, a torn notice pinned to it; Vasiliy in his forties (same broad face and heavy build, worn coat, cracked horn-rimmed glasses) walking away in the rain carrying a cardboard box with rolled blueprints and a desk lamp, puddles reflecting the dead building, gloomy desaturated colors. [STYLE]
```

### 04. Теплотрасса

> **RU:** Тридцать лет спустя у него остались ушанка, теплотрасса и мешок стеклотары.
> **EN:** Thirty years later, all he had left was an ushanka, a heating main and a bag of empty bottles.

```
Night, present day: [VASILIY] sitting on a warm above-ground heating pipe wrapped in torn insulation, steam rising around him, his bag full of empty glass bottles beside him, an old blanket and a dented thermos, a makeshift cardboard shelter under the pipes, a stray dog asleep nearby, panel blocks with a few lit windows in the background, warm orange street-lamp light against cold blue night, sad but cozy. [STYLE]
```

### 05. Метеоритный дождь

> **RU:** А однажды осенью с неба посыпались звёзды.
> **EN:** Then one autumn night, the stars started falling.

```
Night sky over the panel blocks torn by dozens of falling meteors burning with toxic acid-green fire and long smoke trails; [VASILIY] on the heating pipe seen from a low angle, looking up, a bottle frozen halfway to his mouth; green light reflecting on wet rooftops and steam; awe and dread. [STYLE]
```

### 06. Капсула

> **RU:** Это были не звёзды. Это были десантные капсулы Болотной Империи Квак'Тулху.
> **EN:** They weren't stars. They were landing pods of the Swamp Empire of Kvak'Tulhu.

```
A crashed alien landing pod in a smoking crater at the edge of town among broken concrete fences and garages: the pod looks like a giant slimy biomechanical egg fused with rusted metal plates and glowing acid-green veins, its hatch peeling open like a membrane and dripping glowing slime; three [TOAD GRUNT] soldiers climbing out, one raising its rusty acid blaster; mist, sparks, green glow. [STYLE]
```

### 07. Вторжение

> **RU:** Армия продержалась три дня. Кого не превратили в икру — разбежались.
> **EN:** The army held out for three days. Whoever wasn't turned into spawn ran away.

```
Chaotic street battle in the town: a huge [TOAD BRUTE] lifting and smashing an old Soviet UAZ ambulance van, a [TOAD SNIPER] aiming from a rooftop with a green laser sight, [TOAD GRUNT] soldiers spraying glowing green acid; fleeing Russian soldiers dropping their rifles, an overturned police car, a burning barricade of concrete blocks; paralyzed people wrapped in glistening green slime cocoons stuck to the walls like frog spawn; green and orange light, smoke. [STYLE]
```

### 08. Император

> **RU:** Флагман рухнул в заброшенный торговый центр. Там поселился Император Квакула.
> **EN:** The flagship crashed into the abandoned shopping mall. Emperor Kvakula made it his throne room.

```
Interior of a dark abandoned shopping mall: a giant biomechanical alien ship has crashed through the glass roof, slime dripping from broken escalators and dead shop fronts; in the center, on a throne built from shopping carts, mannequins and escalator parts, sits [EMPEROR KVAKULA]; at his feet a glowing pool of alien spawn eggs; rows of toad soldiers bowing; ominous, majestic and grotesque. [STYLE]
```

### 09. Золотой Мясник

> **RU:** А в северо-восточном гнезде жабы вывели на Земле кое-что пострашнее себя. Золотого Мясника.
> **EN:** And in the north-eastern nest, the toads bred something on Earth scarier than themselves. The Golden Butcher.

**[GOLDEN BUTCHER]** (референс: `blender_assets/boss_concepts/golden_brute_concept.png`)
```
a towering hulking man-like experimental warrior whose skin is entirely metallic gold, short golden hair and beard, cold emotionless face, bare chest crossed by chains and leather straps, one spiked rusty shoulder pauldron, leather bracers and fingerless gloves, camouflage cargo pants with knee pads, chains hanging from the belt, heavy combat boots, a huge rusty serrated cleaver-sword
```

```
Reveal shot deep inside a toad nest: [GOLDEN BUTCHER] stepping out of a burst glowing incubation pod, slime and steam pouring off his golden skin, dragging his huge cleaver-sword; rows of other incubation pods with dark shapes inside, toad scientists with cybernetic eyes recoiling in the background; menacing low angle, acid-green and gold light. [STYLE]
```

### 10. Яд не берёт

> **RU:** Жабий яд валил с ног любого. Но не того, кто тридцать лет пил «Тройной» одеколон.
> **EN:** Toad venom brought down anyone. Anyone but a man who'd been drinking cheap cologne for thirty years.

```
Dark comedy moment on the heating main at night: a [TOAD GRUNT] blasting a cloud of glowing green paralytic gas straight into the face of [VASILIY]; Vasiliy stands completely unbothered, squinting, waving the gas away with one hand and coughing, a bottle in the other hand; the toad's cybernetic eye wide in shock, its jaw dropped; steam and green haze. [STYLE]
```

### 11. Ларёк Михалыча

> **RU:** У Михалыча нашёлся дедовский обрез. А у Василия — инженерная голова.
> **EN:** Mikhalych had an old sawed-off shotgun. Vasiliy had an engineer's head.

```
Night at an empty crossroads: the [KIOSK] glowing inside its translucent green energy dome, glowing toad eyes watching from the darkness beyond the dome but not daring to come closer; through the small serving hatch an old man's hand in a fingerless wool glove (only the hand and forearm visible) passes a double-barreled sawed-off shotgun to [VASILIY]; warm yellow light spilling from the hatch. [STYLE]
```

### 12. Хозяин теплотрассы

> **RU:** Новохмуринск ещё не сдался. Пока жив хозяин теплотрассы.
> **EN:** Novokhmurinsk hasn't given up yet. Not while the master of the heating main still lives.

```
Heroic low-angle shot: [VASILIY] standing on top of a steaming heating pipe, a double-barreled sawed-off shotgun resting on his shoulder and a nail-studded wooden bat hanging from his belt, ushanka ear flaps fluttering, a stubborn grin; behind him the silhouettes of panel blocks under a sky lit by green alien glow; dozens of glowing toad eyes in the darkness below; dramatic rim light; empty dark sky in the upper third for the game title. [STYLE]
```

