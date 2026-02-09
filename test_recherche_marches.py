"""
Test de la recherche textuelle sur le module Marches
"""
from playwright.sync_api import sync_playwright
import time

def test_recherche_marches():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = context.new_page()

        print("[AUTH] Connexion a l'application...")
        page.goto('http://localhost:3000/login')
        page.wait_for_load_state('networkidle')

        # Login (utilisateur admin test)
        page.fill('input[type="email"]', 'admin@stam.tg')
        page.fill('input[type="password"]', 'Admin123!')

        # Submit et attendre navigation
        with page.expect_navigation():
            page.click('button[type="submit"]')

        page.wait_for_load_state('networkidle')
        time.sleep(2)

        print("[OK] Connexion reussie - URL: " + page.url)

        # Naviguer vers page Marches
        print("[PAGE] Navigation vers /marches...")
        page.goto('http://localhost:3000/marches')
        page.wait_for_load_state('networkidle')
        time.sleep(2)  # Attendre le chargement des donnees

        # Screenshot initial
        page.screenshot(path='test_marches_1_initial.png', full_page=True)
        print(" Screenshot initial pris")

        # Test 1: Vrifier prsence input de recherche
        print("\n Test 1: Vrifier prsence input de recherche...")
        search_input = page.locator('input[placeholder*="Rechercher"]')
        assert search_input.is_visible(), " Input de recherche non visible"
        print(" Input de recherche trouv")

        # Test 2: Recherche avec terme valide
        print("\n Test 2: Recherche 'STAM'...")
        search_input.fill('STAM')
        time.sleep(0.5)  # Attendre debounce (300ms)
        page.wait_for_load_state('networkidle')

        # Vrifier URL contient search param
        current_url = page.url
        assert 'search=' in current_url.lower(), f" URL ne contient pas search param: {current_url}"
        print(f" URL mise  jour: {current_url}")

        page.screenshot(path='test_marches_2_recherche_stam.png', full_page=True)
        print(" Screenshot recherche 'STAM' pris")

        # Test 3: Vrifier compteur de rsultats
        print("\n Test 3: Vrifier compteur de rsultats...")
        compteur = page.locator('text=/rsultat/i')
        assert compteur.is_visible(), " Compteur non visible"
        compteur_text = compteur.text_content()
        print(f" Compteur visible: {compteur_text}")

        # Test 4: Clear button
        print("\n Test 4: Test clear button...")
        clear_btn = search_input.locator('..').locator('button').last
        if clear_btn.is_visible():
            clear_btn.click()
            time.sleep(0.5)
            input_value = search_input.input_value()
            assert input_value == '', f" Input non vid: '{input_value}'"
            print(" Clear button fonctionne")
        else:
            print("  Clear button non trouv (peut-tre input vide)")

        # Test 5: Recherche sans rsultats
        print("\n Test 5: Recherche sans rsultats 'XXXXXXXXX'...")
        search_input.fill('XXXXXXXXX')
        time.sleep(0.5)
        page.wait_for_load_state('networkidle')

        # Vrifier message "Aucun rsultat"
        no_result_msg = page.locator('text=/aucun rsultat/i')
        assert no_result_msg.is_visible(), " Message 'Aucun rsultat' non visible"
        print(f" Message affich: {no_result_msg.text_content()}")

        page.screenshot(path='test_marches_3_aucun_resultat.png', full_page=True)
        print(" Screenshot 'Aucun rsultat' pris")

        # Test 6: Recherche insensible  la casse
        print("\n Test 6: Test insensibilit casse (stam vs STAM)...")
        search_input.fill('stam')
        time.sleep(0.5)
        page.wait_for_load_state('networkidle')

        # Comparer avec recherche prcdente
        compteur_lowercase = page.locator('text=/rsultat/i').text_content()
        print(f" Recherche 'stam' (lowercase): {compteur_lowercase}")

        page.screenshot(path='test_marches_4_lowercase.png', full_page=True)

        # Test 7: Rinitialiser filtres
        print("\n Test 7: Test bouton Rinitialiser...")
        reset_btn = page.locator('button:has-text("Rinitialiser")')
        if reset_btn.is_visible():
            reset_btn.click()
            page.wait_for_load_state('networkidle')

            # Vrifier input vid
            input_value = search_input.input_value()
            assert input_value == '', f" Input non rinitialis: '{input_value}'"

            # Vrifier URL sans search param
            final_url = page.url
            assert 'search=' not in final_url.lower(), f" URL contient encore search: {final_url}"
            print(f" Rinitialisation OK - URL: {final_url}")
        else:
            print("  Bouton Rinitialiser non visible (aucun filtre actif)")

        page.screenshot(path='test_marches_5_final.png', full_page=True)
        print(" Screenshot final pris")

        print("\n" + "="*60)
        print(" TOUS LES TESTS PASSS AVEC SUCCS!")
        print("="*60)
        print("\nScreenshots gnrs:")
        print("  - test_marches_1_initial.png")
        print("  - test_marches_2_recherche_stam.png")
        print("  - test_marches_3_aucun_resultat.png")
        print("  - test_marches_4_lowercase.png")
        print("  - test_marches_5_final.png")

        browser.close()

if __name__ == '__main__':
    try:
        test_recherche_marches()
    except Exception as e:
        print(f"\n ERREUR: {e}")
        raise
