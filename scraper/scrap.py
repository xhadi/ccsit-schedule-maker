from bs4 import BeautifulSoup
import pandas as pd
from playwright.sync_api import sync_playwright
import os
import time

TERM_CODE = "144810"
BASE_URL = "https://ssb-ar.kfu.edu.sa/PROD_ar/ws"

COL_CODE = "09"

CSV_COLUMNS = [
    "Course",
    "CRN",
    "Division",
    "Availability",
    "CourseTitle",
    "Hours",
    "Days",
    "Activity",
    "Time",
    "Teacher",
]


def fetch_html(sex_code: str) -> str:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(
            f"{BASE_URL}?p_trm_code={TERM_CODE}&p_col_code={COL_CODE}&p_sex_code={sex_code}",
            wait_until="networkidle",
            timeout=60000,
        )
        html = page.content()
        browser.close()
    return html


def parse_courses(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    tables = soup.find_all("table", class_="normaltxt")

    courses = []
    for table in tables[1:]:
        rows = table.find_all("tr")
        if not rows:
            continue
        cells = rows[0].find_all("td")
        if len(cells) < 10:
            continue

        first_cell = cells[0].get_text(strip=True)
        if first_cell == "رقم المقرر":
            continue

        course = {
            "Course": cells[0].get_text(strip=True),
            "CRN": cells[1].get_text(strip=True),
            "Division": cells[2].get_text(strip=True),
            "Availability": cells[3].get_text(strip=True),
            "CourseTitle": cells[4].get_text(strip=True),
            "Hours": cells[5].get_text(strip=True),
            "Days": cells[6].get_text(strip=True),
            "Activity": cells[7].get_text(strip=True),
            "Time": cells[8].get_text(strip=True),
            "Teacher": cells[9].get_text(strip=True),
        }
        courses.append(course)

    return courses


def save_csv(courses: list[dict], filename: str):
    if not courses:
        print(f"No data found for {filename}, skipping.")
        return

    if not os.path.exists("public"):
        os.makedirs("public")

    df = pd.DataFrame(courses)
    df = df[CSV_COLUMNS]
    filepath = os.path.join("public", filename)
    df.to_csv(filepath, index=False, encoding="utf-8-sig")
    print(f"Saved: {filepath} ({len(df)} rows)")


def main():
    print("Fetching male courses...")
    male_html = fetch_html("11")
    time.sleep(1)
    print("Fetching female courses...")
    female_html = fetch_html("12")

    male_courses = parse_courses(male_html)
    female_courses = parse_courses(female_html)

    save_csv(male_courses, "ccsit_male_courses.csv")
    save_csv(female_courses, "ccsit_female_courses.csv")

    print("Done!")


if __name__ == "__main__":
    main()