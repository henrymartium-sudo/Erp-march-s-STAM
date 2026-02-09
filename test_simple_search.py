"""
Test simple manuel de la recherche - suppose que l'utilisateur est deja connecte
"""
from playwright.sync_api import sync_playwright
import time

def test_simple():
    with sync_playwright() as p:
        # Lancer navigateur NON headless pour voir ce qui se passe
        browser = p.chromium.launch(headless=False, slow_mo=500)
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = context.new_page()

        print("[INFO] Ouvrir http://localhost:3000/marches")
        print("[INFO] Veuillez vous connecter manuellement si necessaire...")
        page.goto('http://localhost:3000/marches')

        # Attendre que l'utilisateur se connecte manuellement
        input("[PAUSE] Appuyez sur Entree une fois connecte et sur la page /marches...")

        page.wait_for_load_state('networkidle')
        time.sleep(1)

        # Screenshot initial
        page.screenshot(path='simple_1_initial.png', full_page=True)
        print("[SCREENSHOT] simple_1_initial.png")

        # Chercher l'input de recherche
        print("\n[TEST] Recherche input de recherche...")
        search_input = page.locator('input[placeholder*="march"]')

        if not search_input.is_visible():
            print("[ERROR] Input de recherche non visible!")
            print("[DEBUG] Voici tous les inputs sur la page:")
            for inp in page.locator('input').all():
                print(f"  - {inp.get_attribute('placeholder') or inp.get_attribute('type')}")
            browser.close()
            return

        print("[OK] Input de recherche trouve!")

        # Test recherche
        print("\n[TEST] Saisie 'STAM'...")
        search_input.fill('STAM')
        time.sleep(1)  # Attendre debounce
        page.wait_for_load_state('networkidle')

        page.screenshot(path='simple_2_search_stam.png', full_page=True)
        print("[SCREENSHOT] simple_2_search_stam.png")
        print(f"[INFO] URL: {page.url}")

        # Verifier compteur
        compteur = page.locator('text=/resultat/i').first
        if compteur.is_visible():
            print(f"[OK] Compteur: {compteur.text_content()}")
        else:
            print("[WARN] Compteur non visible")

        # Test clear
        print("\n[TEST] Clic sur bouton clear...")
        # Le bouton X est dans le parent de l'input
        clear_btns = page.locator('button').filter(has=page.locator('svg')).all()
        for btn in clear_btns:
            if btn.is_visible():
                btn_text = btn.inner_text()
                if 'X' in btn_text or not btn_text:  # Bouton vide avec icone
                    btn.click()
                    time.sleep(0.5)
                    break

        page.screenshot(path='simple_3_after_clear.png', full_page=True)
        print("[SCREENSHOT] simple_3_after_clear.png")

        # Test recherche sans resultat
        print("\n[TEST] Recherche sans resultat...")
        search_input.fill('XYZXYZXYZ')
        time.sleep(1)
        page.wait_for_load_state('networkidle')

        page.screenshot(path='simple_4_no_result.png', full_page=True)
        print("[SCREENSHOT] simple_4_no_result.png")

        no_result = page.locator('text=/aucun/i').first
        if no_result.is_visible():
            print(f"[OK] Message: {no_result.text_content()}")
        else:
            print("[WARN] Message 'Aucun resultat' non visible")

        print("\n[SUCCESS] Tests termines!")
        print("Screenshots generes:")
        print("  - simple_1_initial.png")
        print("  - simple_2_search_stam.png")
        print("  - simple_3_after_clear.png")
        print("  - simple_4_no_result.png")

        input("\n[PAUSE] Appuyez sur Entree pour fermer le navigateur...")
        browser.close()

if __name__ == '__main__':
    test_simple()
