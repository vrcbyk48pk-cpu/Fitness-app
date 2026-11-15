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
- Daily targets, JSON backup export and import

## Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Open the address it prints (usually http://localhost:5173). The camera works on `localhost`,
and in the scanner you can also type a barcode by hand, e.g. `3017620422003` (Nutella).

`npm test` runs the unit tests (the nutrition label parser).

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
src/
  main.tsx                 starts React
  App.tsx                  which tab is open, which day and meal are selected
  styles.css               all the styling (glass look, colours, dark mode)
  types.ts                 the shapes of the data: Product, Entry, SavedMeal, WeightEntry, Targets
  db.ts                    the local database (Dexie / IndexedDB), its versions and helper functions
  api.ts                   barcode lookup and name search (local cache first, then Open Food Facts)
  labelParser.ts           turns OCR text from a nutrition label into per-100g values
  labelParser.test.ts      unit tests for the parser (Dutch, English and messy OCR samples)
  image.ts                 crops a photo and prepares it for OCR (resize, grayscale, contrast)
  ocr.ts                   runs Tesseract.js; only loaded on the first label scan
  backup.ts                export / import of the JSON backup
  utils.ts                 small helpers: dates, meals, macro maths, number parsing
  components/
    TodayScreen.tsx        ring, macro bars, the four meals, day navigation
    EntrySheet.tsx         edit or delete a logged food
    AddScreen.tsx          meal picker, Scan / Search / manual, recents, favourites, saved meals
    Scanner.tsx            the camera view (@zxing/browser)
    SearchSheet.tsx        search by name
    LabelScanner.tsx       label photo: crop, read, "nothing readable" (loaded on demand)
    CropBox.tsx            the draggable crop rectangle
    ProductSheet.tsx       product details, grams, meal, "Add to today"
    ManualForm.tsx         form for a custom food; also the review screen after a label scan
    SavedMeals.tsx         saved meals list + "save as meal" sheet
    HistoryScreen.tsx      week/month view, averages, protein streak
    BarChart.tsx           the daily calories chart (plain HTML + CSS)
    WeightCard.tsx         weight entry + line chart (plain SVG)
    SettingsScreen.tsx     daily targets and backup
    CalorieRing.tsx  MacroBar.tsx  MealPicker.tsx  Sheet.tsx  TabBar.tsx   small building blocks
```

## How label scanning works

1. "Scan label" opens the camera through a hidden file input (the most reliable way on iOS).
2. You crop the photo to the nutrition table (`CropBox.tsx`).
3. `image.ts` resizes the crop, makes it grayscale and stretches the contrast.
4. `ocr.ts` reads the text with Tesseract.js, using Dutch and English.
5. `labelParser.ts` finds the energy, protein, carbohydrate and fat rows and takes the
   per-100g column. It allows for typos in the words, skips "waarvan / of which" rows,
   and repairs common OCR mistakes, such as the "g" after a number being read as a "9".
6. The form opens with the values filled in. Nothing is saved until you tap Save.

The Tesseract engine and language files (about 10 MB) are copied from `node_modules` into
`public/tesseract` by `scripts/copy-tesseract.mjs` when you run `npm run dev` or
`npm run build`, so the app serves them itself. They are only downloaded on the first label
scan and then kept on the phone, so later scans work offline.

If a label is read wrongly, the best fix is to add the text Tesseract produced as a new test
in `labelParser.test.ts`, then change the parser until `npm test` passes.

## Changing the database

The tables are declared in `src/db.ts`. Never edit an existing `this.version(n)` block:
phones that already have the app would not be upgraded. Instead add a new
`this.version(n + 1)` block with only the tables that change, plus an `.upgrade()` function
if existing rows need new values. Version 2 (meals, saved meals, weight) is the example to copy.

How data flows: screens read from the database with `useLiveQuery`, which re-renders them
automatically whenever the data changes. To change something, a component calls a function
from `db.ts` (for example `addEntry`). There is no other global state.
