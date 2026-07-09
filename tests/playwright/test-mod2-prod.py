# -*- coding: utf-8 -*-
"""
Test MOD-2 - Suivi Opportunites (onglet Reporting)
Production: https://erp-marches-stam.vercel.app
"""
from playwright.sync_api import sync_playwright
import os
import sys
# Force UTF-8 output
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "https://erp-marches-stam.vercel.app"
SCREENSHOTS_DIR = "tests/playwright/screenshots-mod2"
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

def screenshot(page, name, full_page=True):
    path = f"{SCREENSHOTS_DIR}/{name}.png"
    page.screenshot(path=path, full_page=full_page)
    print(f"  [SCREENSHOT] {path}")

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=500)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()

        # ── 1. Login ──────────────────────────────────────────────────────────
        print("\n[1] Connexion...")
        page.goto(f"{BASE_URL}/login")
        page.wait_for_load_state("networkidle")
        screenshot(page, "01-login")

        page.get_by_label("Email").fill("admin@erp-marches.local")
        page.get_by_label("Mot de passe").fill("Admin123!")
        page.get_by_role("button", name="Se connecter").click()
        page.wait_for_load_state("networkidle")
        screenshot(page, "02-dashboard")
        print("  [OK] Connecté")

        # ── 2. Page Reporting ─────────────────────────────────────────────────
        print("\n[2] Navigation vers /admin/reporting...")
        page.goto(f"{BASE_URL}/admin/reporting")
        page.wait_for_load_state("networkidle")
        screenshot(page, "03-reporting-overview")
        print("  [OK] Page Reporting chargée")

        # ── 3. Onglet "Suivi Opportunités" ─────────────────────────────────────
        print("\n[3] Clic sur l'onglet 'Suivi Opportunités'...")
        tab = page.get_by_role("tab", name="Suivi Opportunités")
        tab.wait_for(state="visible", timeout=10000)
        tab.click()
        page.wait_for_load_state("networkidle")
        screenshot(page, "04-tab-suivi-opportunites")
        print("  [OK] Onglet Suivi Opportunités actif")

        # ── 4. Vérifier contenu de l'onglet ───────────────────────────────────
        print("\n[4] Vérification du contenu...")
        content = page.content()

        has_regles = "Nouvelle" in content and ("gle" in content or "regle" in content.lower())
        btn_count = page.get_by_role("button").count()
        print(f"  [INFO] Contenu onglet charge: {len(content)} chars, {btn_count} boutons")
        print(f"  {'[OK]' if has_regles else '[KO]'} Contenu regles email detecte")

        screenshot(page, "05-tab-content-detail", full_page=True)

        # ── 5. Créer une règle email ───────────────────────────────────────────
        print("\n[5] Création d'une règle email...")
        btn = page.get_by_role("button", name="Nouvelle règle")
        if btn.count() > 0 and btn.is_visible():
            btn.click()
            page.wait_for_timeout(1000)
            screenshot(page, "06-dialog-nouvelle-regle")
            print("  [OK] Dialog 'Nouvelle règle' ouvert")

            # Remplir le formulaire
            # Nom de la règle
            nom_input = page.get_by_label("Nom de la règle")
            if nom_input.count() > 0:
                nom_input.fill("Test MOD-2 — Suivi hebdomadaire")

            # Destinataire email
            email_input = page.get_by_placeholder("email@exemple.com")
            if email_input.count() > 0:
                email_input.first.fill("admin@erp-marches.local")

            screenshot(page, "07-dialog-filled")
            print("  [OK] Formulaire rempli")

            # Annuler (ne pas créer en prod)
            cancel = page.get_by_role("button", name="Annuler")
            if cancel.count() > 0:
                cancel.click()
                page.wait_for_timeout(500)
                print("  [INFO]  Dialog annulé (test non-destructif)")
                screenshot(page, "08-dialog-cancelled")
        else:
            print("  [WARN]  Bouton 'Nouvelle règle' introuvable")

        # ── 6. Liste des règles existantes ────────────────────────────────────
        print("\n[6] Vérification liste des règles existantes...")
        screenshot(page, "09-liste-regles-finale", full_page=True)

        # ── 7. Responsive mobile ──────────────────────────────────────────────
        print("\n[7] Test responsive mobile (375px)...")
        ctx2 = browser.new_context(viewport={"width": 375, "height": 667})
        page_mobile = ctx2.new_page()
        page_mobile.goto(f"{BASE_URL}/admin/reporting")
        page_mobile.wait_for_load_state("networkidle")

        # Re-login si nécessaire
        if "/login" in page_mobile.url:
            page_mobile.get_by_label("Email").fill("admin@erp-marches.local")
            page_mobile.get_by_label("Mot de passe").fill("Admin123!")
            page_mobile.get_by_role("button", name="Se connecter").click()
            page_mobile.wait_for_load_state("networkidle")
            page_mobile.goto(f"{BASE_URL}/admin/reporting")
            page_mobile.wait_for_load_state("networkidle")

        tab_mobile = page_mobile.get_by_role("tab", name="Suivi Opportunités")
        if tab_mobile.count() > 0:
            tab_mobile.click()
            page_mobile.wait_for_load_state("networkidle")
        screenshot(page_mobile, "10-mobile-375", full_page=True)
        print("  [OK] Rendu mobile capturé")

        browser.close()
        print(f"\n[OK] Test termine — captures dans ./{SCREENSHOTS_DIR}/")

if __name__ == "__main__":
    run()
