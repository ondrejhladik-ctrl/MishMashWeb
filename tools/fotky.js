/* ─── FOTKY → WEBP (MISH MASH) ───
   Z velkých JPG udělá WebP ve 3 velikostech do img/foto/ (480, 960, 1600 px na šířku).
   Web si pak přes srcset sám vybere vhodnou velikost (mobil = menší soubor).

   Použití:
     npm install                          (jednou – nainstaluje sharp)
     node tools/fotky.js "C:/cesta/k/fotkam"            → zpracuje všechny JPG ve složce
     node tools/fotky.js "C:/cesta/IMG_1.jpg" "C:/cesta/IMG_2.jpg"   → jen vybrané soubory

   Název výstupu = číslo z názvu fotky (IMG_4126-2.jpg → 4126-480.webp, 4126-960.webp, 4126-1600.webp).
   Už existující soubory přeskočí. */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'img', 'foto');
const SIZES = [480, 960, 1600];
const QUALITY = 78;

function outName(file) {
  const base = path.basename(file, path.extname(file));
  const num = base.match(/(\d{3,})/);
  return (num ? num[1] : base).toLowerCase().replace(/[^a-z0-9-]+/g, '-');
}

function collect(args) {
  const files = [];
  args.forEach(function (a) {
    if (fs.existsSync(a) && fs.statSync(a).isDirectory()) {
      fs.readdirSync(a).filter(f => /\.jpe?g$/i.test(f)).forEach(f => files.push(path.join(a, f)));
    } else if (/\.jpe?g$/i.test(a)) {
      files.push(a);
    }
  });
  return files;
}

(async () => {
  const files = collect(process.argv.slice(2));
  if (!files.length) { console.log('Žádné JPG. Použití: node tools/fotky.js "C:/cesta/k/fotkam"'); return; }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const file of files) {
    const name = outName(file);
    const meta = await sharp(file).rotate().metadata();
    const portrait = (meta.orientation >= 5 ? meta.width > meta.height : meta.height > meta.width);
    process.stdout.write(`→ ${path.basename(file)}  (${name}, ${portrait ? 'na výšku' : 'na šířku'})  `);
    for (const w of SIZES) {
      const out = path.join(OUT_DIR, `${name}-${w}.webp`);
      if (fs.existsSync(out)) { process.stdout.write(`${w}✓ `); continue; }
      await sharp(file)
        .rotate()                                    // srovná podle EXIF
        .resize(w, null, { withoutEnlargement: true })
        .webp({ quality: QUALITY, effort: 5 })
        .toFile(out);
      process.stdout.write(`${w}:${Math.round(fs.statSync(out).size / 1024)}kB `);
    }
    process.stdout.write('\n');
  }
  console.log('\nHotovo → img/foto/');
})();
