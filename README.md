# Calories

A personal calorie and macro tracker that runs as a home-screen app (PWA) on iPhone.
No account, no server: everything is stored on the phone.

- Scan a barcode with the camera, product data comes from [Open Food Facts](https://world.openfoodfacts.org)
- Every scanned product is cached, so re-scanning is instant and works offline
- Search Open Food Facts by name (Dutch products first), or enter a food manually
- Scan a nutrition label: photograph the table and the values are read on the phone itself
  (Tesseract.js, Dutch + English), then shown for you to check before anything is saved
- Meals (breakfast, lunch, dinner, snacks) with subtotals; tap an entry to edit or delete it
- Recents, favourites, saved meals and "copy yesterday's meal" for fast logging
- History tab: week/month calorie chart, daily averages, protein streak, weight log with 7-day average
- Fibre, sugar and salt next to calories and macros, with a daily fibre target
- Meal prep: build a dish from ingredients, weigh it after cooking, log it by portion or by grams
- Onboarding with a calorie and macro calculator (Mifflin-St Jeor), target weight and pace
- Backups through the iOS share sheet, with a reminder, and import that can merge or replace
- Barcode scanner with a flashlight button and a sharper camera picture
- Daily targets, JSON backup export and import

## Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Open the address it prints (usually http://localhost:5173). The camera works on `localhost`,
and in the scanner you can also type a barcode by hand, e.g. `3017620422003` (Nutella).

`npm test` runs the unit tests: the calorie calculator, the nutrition label parser,
the meal prep maths and the backup reading and merging.

`npm run build` makes the production version in `dist/`, and `npm run preview` serves it
(this is the version that includes the offline service worker).

## Put it on your iPhone (GitHub Pages)

The camera only works over HTTPS, so the app is hosted for free on GitHub Pages.
The file `.github/workflows/deploy.yml` builds and publishes it on every push to `main`.

One-time setup:

1. On GitHub, open the repository, then **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
   (On a free GitHub account the repository must be public for Pages to work.)
3. Get the code onto the `main` branch (merge the pull request / branch).
4. Open the **Actions** tab and wait for "Deploy to GitHub Pages" to get a green tick (about a minute).
5. The app is now at `https://<your-username>.github.io/<repository-name>/`.

Add it to the home screen:

1. Open that address in **Safari** on the iPhone.
2. Tap the **Share** button, then **Add to Home Screen**, then **Add**.
3. Open the app from the home screen icon. The first time you tap **Scan**, allow camera access.

Updates: push to `main`, wait for the green tick, then close and reopen the app (sometimes twice;
the first open downloads the new version in the background).

## Good to know

- The home-screen app has its own storage, separate from Safari. Data entered in a Safari tab
  will not appear in the home-screen app. Use the home-screen app from the start.
- Deleting the app from the home screen deletes its data. Use **Settings → Export backup**
  now and then and keep the file in iCloud Drive.

## How the code is organised

```
index.html                 the single HTML page
vite.config.ts             build setup + PWA manifest and service worker
scripts/copy-tesseract.mjs copies the OCR engine into public/ before dev and build
src/
  main.tsx                 starts React
  App.tsx                  which tab is open, which day and meal are selected, onboarding
  theme.css                design tokens: every colour, radius, spacing step, font size
  styles.css               component styles, built only from the tokens in theme.css
  types.ts                 the shapes of the data: Product, Entry, SavedMeal, WeightEntry, Profile
  db.ts                    the local database (Dexie / IndexedDB), its versions and helper functions
  api.ts                   barcode lookup and name search (local cache first, then Open Food Facts)
  calculator.ts            calorie and macro suggestion from your profile, pace options, goal date
  mealPrep.ts              meal prep maths: totals, per 100 g of the cooked dish, per portion
  backupData.ts            checks backup files from every version, and works out what a merge adds
  *.test.ts                unit tests, next to the file they test
  labelParser.ts           turns OCR text from a nutrition label into per-100g values
  image.ts                 crops a photo and prepares it for OCR (resize, grayscale, contrast)
  ocr.ts                   runs Tesseract.js; only loaded on the first label scan
  backup.ts                saving a backup file, and replacing or merging from one
  utils.ts                 small helpers: dates, meals, macro maths, number parsing
  components/
    Button.tsx             the one button: variants, sizes and layouts
    Icon.tsx               the one icon set
    Segmented.tsx          "pick one of these" control
    Sheet.tsx              glass panel that slides up from the bottom
    MealPicker.tsx  MacroTiles.tsx  MacroBar.tsx  CalorieRing.tsx  TabBar.tsx   small building blocks
    TodayScreen.tsx        ring, macro bars, the four meals, day navigation
    EntrySheet.tsx         edit or delete a logged food
    AddScreen.tsx          meal picker, the product picker, saved meals, "log again" from yesterday
    ProductPicker.tsx      Scan / Search / Manual, recents and favourites; also used by the meal prep editor
    MealPrepScreen.tsx     the list of meal preps, with log / edit / duplicate / delete
    MealPrepEditor.tsx     name, ingredients, cooked weight and portions
    AmountSheet.tsx        how many grams of an ingredient
    DayDetails.tsx         all totals of a day, including sugar and salt
    BackupBanner.tsx       the reminder on Today when the last backup is over a week old
    ExtrasLine.tsx         one line with the known fibre, sugar and salt
    Scanner.tsx            the barcode camera view (@zxing/browser), with the flashlight
    SearchSheet.tsx        search by name
    LabelScanner.tsx       label photo: crop, read, "nothing readable" (loaded on demand)
    CropBox.tsx            the draggable crop rectangle
    ProductSheet.tsx       product details, grams, meal, "Add to today"
    ManualForm.tsx         form for a custom food; also the review screen after a label scan
    SavedMeals.tsx         saved meals list + "save as meal" sheet
    HistoryScreen.tsx      week/month view, averages, protein streak
    BarChart.tsx           the daily calories chart (plain HTML + CSS)
    WeightCard.tsx         weight entry + line chart; offers new targets when your weight changes
    SettingsScreen.tsx     profile, daily targets and backup
    Onboarding.tsx         first-launch questions and the suggested targets
    Choices.tsx            a list of options to pick one from
    PacePicker.tsx         the pace options, each with its daily calories and estimated date
    GoalSheet.tsx          target weight and pace on one sheet (the prompt, and from Settings)
    GoalProgress.tsx       start, now and target weight with a progress bar
```

## The design system

Everything visual is built from two files and four components:

- `src/theme.css` holds the tokens: colours for light and dark mode, corner radii, spacing
  steps, font sizes and animation curves. To change a colour, change it there and nowhere else.
- `src/styles.css` holds the component styles. It never uses a raw colour, only tokens.
- `Button`, `Icon`, `Segmented` and `Sheet` are used on every screen. A new screen should be
  built from these plus the shared classes `card`, `row`, `input`, `field`, `tiles` and `label`,
  not from new one-off styles.

Some colours come in two versions, for example `--accent` and `--accent-text`. The first is for
shapes (the ring, bars, fills). The second is darker in light mode, so that small text in that
colour stays readable.

## How the calorie suggestion works

`src/calculator.ts` does this, in order:

1. BMR (calories at rest) with the Mifflin-St Jeor formula.
2. Times an activity factor (1.2 to 1.9) gives maintenance calories.
3. Adjust for the goal, using the pace you chose: one kg of body fat is about 7700 kcal, so
   0.5 kg a week is 550 kcal a day less (losing weight, recomposition) or more (building
   muscle). Staying healthy uses maintenance.
4. Protein from body weight (1.6 to 2.2 g per kg), fat 25-30% of calories, carbs the rest.

Safety rules: calories never go below the BMR, so a pace that would do that is shown as not
available, and no deficit is applied under 18. The estimated date is simply the kilograms to go
divided by the weekly change, counted from your latest weigh-in. All of it is an estimate,
not medical advice.

How data flows: screens read from the database with `useLiveQuery`, which re-renders them
automatically whenever the data changes. To change something, a component calls a function
from `db.ts` (for example `addEntry`). There is no other global state.
