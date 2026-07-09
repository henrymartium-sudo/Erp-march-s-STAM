"""Debug des 2 echecs : Top10 AC et Dashboard SVG"""
import sys
from playwright.sync_api import sync_playwright

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_URL = "https://erp-marches-stam.vercel.app"
EMAIL = "admin@erp-marches.local"
PASSWORD = "Admin123!"


def login(page):
    page.goto(f"{BASE_URL}/login")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)
    page.locator('input[type="email"]').first.fill(EMAIL)
    page.locator('input[type="password"]').first.fill(PASSWORD)
    page.locator('button[type="submit"]').click()
    page.wait_for_timeout(5000)
    if "/dashboard" not in page.url:
        page.goto(f"{BASE_URL}/dashboard")
        page.wait_for_load_state("networkidle")
    print(f"[LOGIN] OK - url: {page.url}")


def debug_reporting(page):
    print("\n=== DEBUG REPORTING ===")
    page.goto(f"{BASE_URL}/admin/reporting")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(5000)
    page.screenshot(path="/tmp/reporting_debug.png", full_page=True)

    # Chercher Top 10 avec variantes
    content = page.content()
    searches = ["Top 10", "Top10", "top-10", "TOP 10", "Autorit", "contractante", "AC"]
    for term in searches:
        if term in content:
            print(f"  Trouve: '{term}'")
        else:
            print(f"  ABSENT: '{term}'")

    # Chercher les headings h1/h2/h3
    headings = page.locator("h1, h2, h3, h4").all_text_contents()
    print(f"  Headings trouves: {headings}")

    # SVG count
    svg_count = page.locator("svg").count()
    print(f"  SVG count: {svg_count}")


def debug_dashboard(page):
    print("\n=== DEBUG DASHBOARD ===")
    page.goto(f"{BASE_URL}/dashboard")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(5000)
    page.screenshot(path="/tmp/dashboard_debug.png", full_page=True)

    # SVG count
    svg_count = page.locator("svg").count()
    print(f"  SVG count (apres 5s): {svg_count}")

    # Attendre davantage
    page.wait_for_timeout(3000)
    svg_count2 = page.locator("svg").count()
    print(f"  SVG count (apres 8s): {svg_count2}")

    # Recharts specifiques
    recharts = page.locator("[class*='recharts']").count()
    print(f"  Elements recharts: {recharts}")

    # Headings
    headings = page.locator("h1, h2, h3, h4").all_text_contents()
    print(f"  Headings: {headings}")

    # Canvas (alternative au SVG)
    canvas_count = page.locator("canvas").count()
    print(f"  Canvas count: {canvas_count}")

    # Scroll et screenshot
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    page.wait_for_timeout(2000)
    page.screenshot(path="/tmp/dashboard_scrolled.png", full_page=True)
    svg_after_scroll = page.locator("svg").count()
    print(f"  SVG count apres scroll: {svg_after_scroll}")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        try:
            login(page)
            debug_reporting(page)
            debug_dashboard(page)
        finally:
            browser.close()

    print("\nScreenshots: /tmp/reporting_debug.png, /tmp/dashboard_debug.png, /tmp/dashboard_scrolled.png")


if __name__ == "__main__":
    main()
