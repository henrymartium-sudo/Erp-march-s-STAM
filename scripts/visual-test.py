"""
Visual test -- Refonte Frontend STAM C8
Captures screenshots des pages cles apres connexion.
"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from playwright.sync_api import sync_playwright
import os

BASE = "http://localhost:3000"
OUT  = "screenshots-refonte"
os.makedirs(OUT, exist_ok=True)

def screenshot(page, name, full=True):
    path = f"{OUT}/{name}.png"
    page.screenshot(path=path, full_page=full)
    print(f"  OK {name}.png")
    return path

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # -- 1. Page Login
    print("\n[1] Login page")
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    # Timeout long : Next.js compile au premier acces (peut prendre 30-60s)
    page.set_default_timeout(90000)
    page.goto(f"{BASE}/login", wait_until="load", timeout=90000)
    screenshot(page, "01-login-desktop")

    page.set_viewport_size({"width": 375, "height": 812})
    page.goto(f"{BASE}/login", wait_until="load")
    screenshot(page, "01-login-mobile")
    page.set_viewport_size({"width": 1440, "height": 900})

    # -- 2. Connexion
    print("\n[2] Connexion admin")
    page.goto(f"{BASE}/login", wait_until="load")
    page.fill('input[name="email"]', "admin@erp-marches.local")
    page.fill('input[name="password"]', "Admin123!")
    page.click('button[type="submit"]')
    page.wait_for_url(f"{BASE}/", timeout=15000)
    page.wait_for_load_state("networkidle")
    print("  -> Connecte !")

    # -- 3. Dashboard
    print("\n[3] Dashboard")
    screenshot(page, "02-dashboard-desktop")

    page.set_viewport_size({"width": 768, "height": 1024})
    page.wait_for_timeout(400)
    screenshot(page, "02-dashboard-tablet-768", full=False)

    page.set_viewport_size({"width": 375, "height": 812})
    page.wait_for_timeout(400)
    screenshot(page, "02-dashboard-mobile-375", full=False)
    page.set_viewport_size({"width": 1440, "height": 900})

    # -- 4. Marches
    print("\n[4] Marches")
    page.goto(f"{BASE}/marches", wait_until="load")
    screenshot(page, "03-marches-desktop")

    page.set_viewport_size({"width": 768, "height": 1024})
    page.wait_for_timeout(400)
    screenshot(page, "03-marches-tablet-768", full=False)
    page.set_viewport_size({"width": 1440, "height": 900})

    # -- 5. Vehicules
    print("\n[5] Vehicules")
    page.goto(f"{BASE}/vehicules", wait_until="load")
    screenshot(page, "04-vehicules-desktop")

    # -- 6. Documents (liste -> grille)
    print("\n[6] Documents")
    page.goto(f"{BASE}/documents", wait_until="load")
    screenshot(page, "05-documents-liste")

    grille_btn = page.get_by_label("Vue grille")
    if grille_btn.count() > 0:
        grille_btn.click()
        page.wait_for_timeout(400)
        screenshot(page, "05-documents-grille")
        page.get_by_label("Vue liste").click()
        page.wait_for_timeout(200)

    # -- 7. Cautions
    print("\n[7] Cautions")
    page.goto(f"{BASE}/cautions", wait_until="load")
    screenshot(page, "06-cautions-desktop")

    # -- 8. Alertes timeline
    print("\n[8] Alertes timeline")
    page.goto(f"{BASE}/admin/alertes", wait_until="load")
    screenshot(page, "07-alertes-timeline")

    # -- 9. Detail marche
    print("\n[9] Detail marche")
    page.goto(f"{BASE}/marches", wait_until="load")
    first_link = page.locator('a[href^="/marches/"]').first
    if first_link.count() > 0:
        href = first_link.get_attribute("href")
        page.goto(f"{BASE}{href}", wait_until="load")
        screenshot(page, "08-marche-detail")

    # -- 10. Mobile sidebar hamburger
    print("\n[10] Mobile sidebar hamburger")
    page.goto(f"{BASE}/marches", wait_until="load")
    page.set_viewport_size({"width": 375, "height": 812})
    page.wait_for_timeout(300)
    screenshot(page, "09-mobile-closed", full=False)
    hamburger = page.get_by_role("button", name="Menu")
    if hamburger.count() > 0:
        hamburger.click()
        page.wait_for_timeout(400)
        screenshot(page, "09-mobile-sidebar-open", full=False)

    browser.close()

count = len(os.listdir(OUT))
print(f"\nTermine -- {count} captures dans ./{OUT}/")
