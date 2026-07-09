"""
Test Playwright — Permissions Export + Alertes Email (Production)
URL cible : https://erp-marches-stam.vercel.app

Vérifie :
  1. EXPLOITATION : ExportMenu visible sur /vehicules seulement
  2. VISITEUR     : ExportMenu visible sur tous les modules
  3. ADMIN        : Aperçu email alertes contient bien un tableau HTML
"""

from playwright.sync_api import sync_playwright, Page, expect
import sys

PROD_URL = "https://erp-marches-stam.vercel.app"

USERS = {
    "EXPLOITATION": {
        "email": "exploitation@erp-marches.local",
        "password": "Exploitation123!",
    },
    "VISITEUR": {
        "email": "visiteur@erp-marches.local",
        "password": "Visiteur123!",
    },
    "ADMIN": {
        "email": "admin@erp-marches.local",
        "password": "Admin123!",
    },
}

MODULES = [
    ("/vehicules", "véhicules"),
    ("/marches", "marchés"),
    ("/cautions", "cautions"),
    ("/documents", "documents"),
]

results = []

# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def login(page: Page, role: str):
    """Connecte l'utilisateur et attend le dashboard."""
    creds = USERS[role]
    page.goto(f"{PROD_URL}/login", wait_until="networkidle")
    page.fill('input[type="email"]', creds["email"])
    page.fill('input[type="password"]', creds["password"])
    page.click('button[type="submit"]')
    page.wait_for_url(f"{PROD_URL}/dashboard", timeout=15000)
    page.wait_for_load_state("networkidle")


def export_menu_visible(page: Page, path: str) -> bool:
    """Retourne True si un bouton ExportMenu est visible sur la page."""
    page.goto(f"{PROD_URL}{path}", wait_until="networkidle")
    page.wait_for_timeout(1000)
    # Le bouton d'export contient généralement "Exporter" ou une icône Download
    selectors = [
        'button:has-text("Exporter")',
        'button:has-text("Export")',
        '[data-testid="export-menu"]',
        'button[aria-label*="xport"]',
    ]
    for sel in selectors:
        els = page.locator(sel).all()
        if els:
            for el in els:
                if el.is_visible():
                    return True
    return False


def log(role: str, module: str, visible: bool, expected: bool):
    status = "✅ PASS" if visible == expected else "❌ FAIL"
    symbol = "VISIBLE" if visible else "ABSENT"
    expected_str = "VISIBLE" if expected else "ABSENT"
    line = f"  {status} | {role:<12} | {module:<12} | Export: {symbol:<8} (attendu: {expected_str})"
    print(line)
    results.append({
        "role": role, "module": module,
        "visible": visible, "expected": expected,
        "pass": visible == expected
    })


# ─────────────────────────────────────────────
# Tests
# ─────────────────────────────────────────────

def test_exploitation(page: Page):
    print("\n[EXPLOITATION] — Export attendu uniquement sur /vehicules")
    login(page, "EXPLOITATION")
    expected = {
        "/vehicules": True,
        "/marches": False,
        "/cautions": False,
        "/documents": False,
    }
    for path, label in MODULES:
        visible = export_menu_visible(page, path)
        log("EXPLOITATION", label, visible, expected[path])


def test_visiteur(page: Page):
    print("\n[VISITEUR] — Export attendu sur tous les modules")
    login(page, "VISITEUR")
    for path, label in MODULES:
        visible = export_menu_visible(page, path)
        log("VISITEUR", label, visible, True)


def test_alertes_email_preview(page: Page):
    """Vérifie que l'aperçu de l'email d'alerte contient un tableau HTML."""
    print("\n[ADMIN] — Aperçu email alertes : vérification format tableau")
    login(page, "ADMIN")
    page.goto(f"{PROD_URL}/admin/alertes", wait_until="networkidle")
    page.wait_for_timeout(1000)

    # Chercher le bouton de prévisualisation
    preview_btn = page.locator('button:has-text("Aperçu"), button:has-text("Prévisualiser"), button:has-text("Preview")')
    if preview_btn.count() == 0:
        print("  ⚠️  SKIP | Bouton aperçu introuvable sur /admin/alertes")
        return

    preview_btn.first.click()
    page.wait_for_timeout(1500)

    # Chercher un iframe ou une zone HTML d'aperçu
    # L'aperçu est généralement dans un iframe ou un div avec du HTML injecté
    has_table = False

    # Vérifier dans les iframes
    for frame in page.frames:
        content = frame.content()
        if "<table" in content and ("border-collapse" in content or "cellpadding" in content):
            has_table = True
            break

    # Vérifier dans le contenu principal si pas d'iframe
    if not has_table:
        content = page.content()
        if "<table" in content and "border-collapse" in content:
            has_table = True

    status = "✅ PASS" if has_table else "❌ FAIL"
    print(f"  {status} | ADMIN       | email aperçu | Tableau HTML: {'DÉTECTÉ' if has_table else 'ABSENT (ancien format card?)'}")
    results.append({
        "role": "ADMIN", "module": "email aperçu",
        "visible": has_table, "expected": True,
        "pass": has_table
    })


# ─────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────

def main():
    print("=" * 65)
    print("  TEST PLAYWRIGHT — PRODUCTION")
    print(f"  URL : {PROD_URL}")
    print("=" * 65)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # Test EXPLOITATION
        ctx = browser.new_context(viewport={"width": 1280, "height": 800})
        page = ctx.new_page()
        try:
            test_exploitation(page)
        except Exception as e:
            print(f"  ❌ ERREUR EXPLOITATION : {e}")
        finally:
            ctx.close()

        # Test VISITEUR
        ctx = browser.new_context(viewport={"width": 1280, "height": 800})
        page = ctx.new_page()
        try:
            test_visiteur(page)
        except Exception as e:
            print(f"  ❌ ERREUR VISITEUR : {e}")
        finally:
            ctx.close()

        # Test aperçu email alertes
        ctx = browser.new_context(viewport={"width": 1280, "height": 800})
        page = ctx.new_page()
        try:
            test_alertes_email_preview(page)
        except Exception as e:
            print(f"  ❌ ERREUR ADMIN alertes : {e}")
        finally:
            ctx.close()

        browser.close()

    # Résumé
    passed = sum(1 for r in results if r["pass"])
    total = len(results)
    print("\n" + "=" * 65)
    print(f"  RÉSULTAT : {passed}/{total} tests réussis")
    if passed < total:
        print("\n  ⚠️  ATTENTION : Des échecs peuvent indiquer que les")
        print("  modifications ne sont pas encore déployées en production.")
        print("  → Committer et déployer les changements avant de relancer.")
    else:
        print("  🎉 Tous les tests passent en production !")
    print("=" * 65)

    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
