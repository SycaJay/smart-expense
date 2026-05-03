/**
 * After Vite build: populate `server/` as a deployable document root
 * (dist files at root; PHP under backend/; paths in index.php adjusted).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const SERVER = path.join(ROOT, 'server')
const DIST = path.join(ROOT, 'dist')

function copyDir(src, dest, { ignoreDirNames = new Set() } = {}) {
  fs.mkdirSync(dest, { recursive: true })
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    if (ent.isDirectory() && ignoreDirNames.has(ent.name)) {
      continue
    }
    const from = path.join(src, ent.name)
    const to = path.join(dest, ent.name)
    if (ent.isDirectory()) {
      copyDir(from, to, { ignoreDirNames })
    } else {
      fs.copyFileSync(from, to)
    }
  }
}

function copyDirContents(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Missing folder: ${src}`)
  }
  fs.mkdirSync(dest, { recursive: true })
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, ent.name)
    const to = path.join(dest, ent.name)
    if (ent.isDirectory()) {
      copyDir(from, to)
    } else {
      fs.copyFileSync(from, to)
    }
  }
}

fs.rmSync(SERVER, { recursive: true, force: true })
fs.mkdirSync(SERVER, { recursive: true })

// 1) Frontend: contents of dist/ at server root (not server/dist/)
copyDirContents(DIST, SERVER)

// 2) PHP application (same layout names as repo so bootstrap paths resolve)
const backendDest = path.join(SERVER, 'backend')
copyDir(path.join(ROOT, 'backend', 'api'), path.join(backendDest, 'api'))
copyDir(path.join(ROOT, 'backend', 'lib'), path.join(backendDest, 'lib'))

const configSrc = path.join(ROOT, 'backend', 'config')
if (fs.existsSync(configSrc)) {
  const files = fs.readdirSync(configSrc)
  if (files.length > 0) {
    fs.mkdirSync(path.join(backendDest, 'config'), { recursive: true })
    for (const name of files) {
      fs.copyFileSync(path.join(configSrc, name), path.join(backendDest, 'config', name))
    }
  }
}

// 3) Composer deps (mailer expects server/vendor when lib lives under server/backend/lib)
const vendorSrc = path.join(ROOT, 'vendor')
if (fs.existsSync(vendorSrc)) {
  copyDir(vendorSrc, path.join(SERVER, 'vendor'), { ignoreDirNames: new Set(['.git']) })
} else {
  console.warn('pack-server: no vendor/ — run `composer install` at repo root so email works on the server.')
}
for (const name of ['composer.json', 'composer.lock']) {
  const p = path.join(ROOT, name)
  if (fs.existsSync(p)) {
    fs.copyFileSync(p, path.join(SERVER, name))
  }
}

// 4) Entry router at document root — paths point into server/backend/
const indexSrc = path.join(ROOT, 'backend', 'public', 'index.php')
let indexPhp = fs.readFileSync(indexSrc, 'utf8')
const FROM = "dirname(__DIR__) . '/"
const TO = "__DIR__ . '/backend/"
if (!indexPhp.includes(FROM)) {
  throw new Error(
    'pack-server: backend/public/index.php no longer uses the expected path pattern; update scripts/pack-server.mjs',
  )
}
indexPhp = indexPhp.replaceAll(FROM, TO)
if (indexPhp.includes('dirname(__DIR__)')) {
  throw new Error('pack-server: stray dirname(__DIR__) in packed index.php after transform')
}
fs.writeFileSync(path.join(SERVER, 'index.php'), indexPhp, 'utf8')

// 5) Apache: prefer SPA for "/"; real files/dirs pass through; /api → PHP; else SPA
const htaccess = `# Document root bundle — upload these files into public_html (not a subfolder of this name).
DirectoryIndex index.html

<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]
RewriteRule ^api/ index.php [L,QSA]
RewriteRule ^ index.html [L]
</IfModule>
`
fs.writeFileSync(path.join(SERVER, '.htaccess'), htaccess, 'utf8')

// 6) Verify layout (fail build instead of shipping a broken public_html)
const required = [
  path.join(SERVER, 'index.html'),
  path.join(SERVER, 'index.php'),
  path.join(SERVER, '.htaccess'),
  path.join(SERVER, 'backend', 'lib', 'bootstrap.php'),
  path.join(SERVER, 'backend', 'lib', 'Database.php'),
  path.join(SERVER, 'backend', 'lib', 'Http.php'),
]
for (const p of required) {
  if (!fs.existsSync(p)) {
    throw new Error(`pack-server: missing required file: ${path.relative(ROOT, p)}`)
  }
}

const routeTargets = [...indexPhp.matchAll(/__DIR__\s*\.\s*'\/backend\/([^']+)'/g)].map((m) => m[1])
if (routeTargets.length === 0) {
  throw new Error('pack-server: no route targets found in packed index.php')
}
for (const rel of routeTargets) {
  const abs = path.join(SERVER, 'backend', rel)
  if (!fs.existsSync(abs)) {
    throw new Error(`pack-server: route target missing: backend/${rel}`)
  }
}

const vendorAutoload = path.join(SERVER, 'vendor', 'autoload.php')
if (!fs.existsSync(vendorAutoload)) {
  console.warn('pack-server: vendor/autoload.php missing — run `composer install` at repo root before build.')
}

console.log('pack-server: wrote', SERVER)
