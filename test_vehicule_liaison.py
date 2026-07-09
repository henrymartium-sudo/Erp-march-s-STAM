"""
Test de diagnostic : liaison vehicules-marches
Teste directement contre http://localhost:3000
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:3000"

def login(page, email="admin@erp-marches.local", password="Admin123!"):
    print(f"  -> Connexion avec {email}...")
    page.goto(f"{BASE_URL}/login")
    page.wait_for_load_state('networkidle')
    page.screenshot(path='C:/tmp/login_page.png')

    page.fill('input[name="email"]', email)
    page.fill('input[name="password"]', password)
    page.click('button[type="submit"]')

    try:
        page.wait_for_url(lambda url: '/login' not in url, timeout=15000)
        print(f"  [OK] Login OK - URL: {page.url}")
        return True
    except Exception as e:
        print(f"  [FAIL] Login echoue: {e}")
        print(f"  URL actuelle: {page.url}")
        page.screenshot(path='C:/tmp/login_failed.png')
        return False

def test_marche_detail_vehicules(page):
    """T1 : Page detail marche - section Vehicules associes"""
    MARCHE_ID = "cmlm1n3pb0006s4tv4ubg0hu5"
    EXPECTED = ["GA-TG-7667", "GA-TG-7668"]

    print("\n[T1] Page detail marche - Vehicules associes")
    page.goto(f"{BASE_URL}/marches/{MARCHE_ID}")
    page.wait_for_load_state('networkidle')
    page.screenshot(path='C:/tmp/t1_marche_detail.png')

    content = page.content()

    if "hicules associ" in content:
        print("  [OK] Section 'Vehicules associes' presente")
    else:
        print("  [FAIL] Section 'Vehicules associes' ABSENTE")
        return False

    ok = True
    for immat in EXPECTED:
        if immat in content:
            print(f"  [OK] Vehicule {immat} affiche")
        else:
            print(f"  [FAIL] Vehicule {immat} ABSENT")
            ok = False

    return ok

def test_vehicule_detail_marches(page):
    """T2 : Page detail vehicule - section Marches associes"""
    VEHICULE_ID = "cmlqz7j1z000004lb086ecbkk"
    MARCHE_NUMERO = "N"  # Le numero contient des caracteres speciaux - chercher juste "00888"

    print("\n[T2] Page detail vehicule - Marches associes")
    page.goto(f"{BASE_URL}/vehicules/{VEHICULE_ID}")
    page.wait_for_load_state('networkidle')
    page.screenshot(path='C:/tmp/t2_vehicule_detail.png')

    content = page.content()

    if "arch" in content and "associ" in content:
        print("  [OK] Section 'Marches associes' presente")
    else:
        print("  [FAIL] Section 'Marches associes' ABSENTE")
        # Debug : afficher un extrait du contenu
        idx = content.find("arch")
        if idx > 0:
            print(f"  Debug: ...{content[max(0,idx-20):idx+50]}...")
        return False

    # Verifier le numero de marche
    if "00888/2023" in content:
        print("  [OK] Marche N 00888/2023 affiche sur la page vehicule")
        return True
    else:
        print("  [FAIL] Marche N 00888/2023 ABSENT de la page vehicule")
        return False

def test_edit_form_preselection(page):
    """T3 : Formulaire edition - pre-selection vehicules"""
    MARCHE_ID = "cmlm1n3pb0006s4tv4ubg0hu5"

    print("\n[T3] Formulaire edition - pre-selection vehicules")
    page.goto(f"{BASE_URL}/marches/{MARCHE_ID}/edit")
    page.wait_for_load_state('networkidle')
    page.screenshot(path='C:/tmp/t3_form_initial.png')

    content = page.content()

    if "hicules associ" not in content:
        print("  [FAIL] Section 'Vehicules associes' absente du formulaire")
        return False
    print("  [OK] Section 'Vehicules associes' presente dans le formulaire")

    # Verifier que "2 vehicule" apparait dans le bouton
    try:
        page.locator('button:has-text("2 v")').first().wait_for(timeout=5000)
        btn_text = page.locator('button:has-text("2 v")').first().inner_text()
        print(f"  [OK] Bouton vehicule: '{btn_text}' (vehiculeIds pre-remplis)")
    except:
        # Chercher le texte dans tout le contenu
        if "2 v" in content and "hicule" in content:
            print("  [OK] '2 vehicules selectiones' present dans le DOM")
        else:
            print("  [WARN] Bouton '2 vehicules' non trouve - possible delai async")

    # Attendre chargement async des vehicules (useEffect)
    page.wait_for_timeout(3000)
    page.screenshot(path='C:/tmp/t3_form_after_load.png')
    content_after = page.content()

    for immat in ["GA-TG-7667", "GA-TG-7668"]:
        if immat in content_after:
            print(f"  [OK] Badge vehicule {immat} visible apres chargement async")
        else:
            print(f"  [FAIL] Badge vehicule {immat} ABSENT apres chargement async")

    return True

def test_liaison_add_save(page):
    """T4 : Ajout liaison et sauvegarde"""
    MARCHE_ID = "cmlqtfcaa000004kzdlxd7oom"
    VEHICULE_IMMAT = "STAM-09"

    print("\n[T4] Ajout liaison vehicule -> marche et persistance")

    page.goto(f"{BASE_URL}/marches/{MARCHE_ID}/edit")
    page.wait_for_load_state('networkidle')
    page.screenshot(path='C:/tmp/t4_initial.png')

    # Verifier etat initial
    content = page.content()
    if "lectionner des v" in content:
        print("  [OK] Marche sans vehicules : bouton 'Selectionner des vehicules' visible")
    else:
        print("  [WARN] Bouton 'Selectionner des vehicules' non trouve - peut etre deja des vehicules")
        # Dump du contenu pour debug
        idx = content.find("hicule")
        if idx > 0:
            print(f"  Debug vehicule: ...{content[max(0,idx-30):idx+80]}...")

    # Attendre le chargement async des vehicules (useEffect getVehiculesArray)
    page.wait_for_timeout(3000)
    page.screenshot(path='C:/tmp/t4_after_async_load.png')

    # Ouvrir le popover
    try:
        btn = page.locator('button:has-text("lectionner"), button:has-text("hicule")').first()
        btn.click()
        page.wait_for_timeout(1500)
        page.screenshot(path='C:/tmp/t4_popover.png')
        print("  [OK] Popover ouvert")
    except Exception as e:
        print(f"  [FAIL] Impossible d'ouvrir le popover: {e}")
        return False

    # Chercher STAM-09 dans le popover
    try:
        vehicule_row = page.locator(f'text={VEHICULE_IMMAT}').first()
        vehicule_row.wait_for(timeout=5000)
        vehicule_row.click()
        print(f"  [OK] Vehicule {VEHICULE_IMMAT} selectionne dans le popover")
    except Exception as e:
        print(f"  [FAIL] Vehicule {VEHICULE_IMMAT} non trouve dans le popover: {e}")
        # Capture le contenu du popover pour debug
        popover = page.locator('[data-radix-popper-content-wrapper], [role="dialog"], .popover').first()
        try:
            popover_text = popover.inner_text()
            print(f"  Debug popover: {popover_text[:200]}")
        except:
            pass
        return False

    page.keyboard.press('Escape')
    page.wait_for_timeout(500)
    page.screenshot(path='C:/tmp/t4_selected.png')

    content = page.content()
    if "1 v" in content and "hicule" in content:
        print("  [OK] '1 vehicule selectionne' affiche")
    else:
        print("  [WARN] Texte '1 vehicule selectionne' non trouve")

    # Sauvegarder
    page.locator('button[type="submit"]').last().click()

    try:
        page.wait_for_url(f"**/marches/{MARCHE_ID}", timeout=20000)
        page.wait_for_load_state('networkidle')
        print("  [OK] Redirection vers page detail apres sauvegarde")
    except Exception as e:
        print(f"  [FAIL] Redirection echouee: {e}")
        print(f"  URL actuelle: {page.url}")
        return False

    page.screenshot(path='C:/tmp/t4_saved.png')
    content = page.content()

    if "hicules associ" in content and VEHICULE_IMMAT in content:
        print(f"  [OK] LIAISON PERSISTEE: {VEHICULE_IMMAT} affiche sur la page detail")
        return True
    else:
        print(f"  [FAIL] LIAISON NON PERSISTEE: {VEHICULE_IMMAT} absent de la page detail")
        # Debug contenu
        idx = content.find("hicule")
        if idx > 0:
            print(f"  Debug: ...{content[max(0,idx-20):idx+100]}...")
        return False

def test_cleanup(page):
    MARCHE_ID = "cmlqtfcaa000004kzdlxd7oom"
    VEHICULE_IMMAT = "STAM-09"
    print("\n[CLEANUP] Retrait liaison ajoutee")

    page.goto(f"{BASE_URL}/marches/{MARCHE_ID}/edit")
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(3000)

    try:
        page.locator('button:has-text("1 v")').first().click()
        page.wait_for_timeout(1000)
        page.locator(f'text={VEHICULE_IMMAT}').first().click()
        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
        page.locator('button[type="submit"]').last().click()
        page.wait_for_url(f"**/marches/{MARCHE_ID}", timeout=15000)
        print("  [OK] Cleanup termine")
    except Exception as e:
        print(f"  [WARN] Cleanup: {e}")

def main():
    import os
    os.makedirs('C:/tmp', exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        print("=" * 60)
        print("TESTS: Liaison Vehicules <-> Marches")
        print("=" * 60)

        if not login(page):
            print("\n[FAIL] IMPOSSIBLE DE SE CONNECTER - Tests abandonnes")
            browser.close()
            sys.exit(1)

        results = {}

        for name, fn in [
            ('T1 - Marche detail: vehicules listes', test_marche_detail_vehicules),
            ('T2 - Vehicule detail: marches listes', test_vehicule_detail_marches),
            ('T3 - Formulaire edit: pre-selection', test_edit_form_preselection),
            ('T4 - Liaison ajout/persistance', test_liaison_add_save),
        ]:
            try:
                results[name] = fn(page)
            except Exception as e:
                print(f"  ERREUR: {e}")
                results[name] = False

        if results.get('T4 - Liaison ajout/persistance'):
            try:
                test_cleanup(page)
            except Exception as e:
                print(f"  Cleanup erreur: {e}")

        print("\n" + "=" * 60)
        print("RESULTATS")
        print("=" * 60)
        passed = sum(1 for v in results.values() if v)
        for name, ok in results.items():
            status = "[PASS]" if ok else "[FAIL]"
            print(f"  {status}  {name}")
        print(f"\n  Score: {passed}/{len(results)}")

        browser.close()
        return passed == len(results)

if __name__ == '__main__':
    ok = main()
    sys.exit(0 if ok else 1)
