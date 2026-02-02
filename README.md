# CCSIT Schedule Maker

![Schedule Update Status](https://github.com/xhadi/ccsit-schedule-maker/actions/workflows/update_schedule.yml/badge.svg)

A simple and fast web application that generates all possible course schedules for CCSIT students. Just provide your desired course codes, and the app will find and display all non-conflicting schedules.

## Live Demo

**View the live project here:** **[https://xhadi.github.io/ccsit-schedule-maker/](https://xhadi.github.io/ccsit-schedule-maker/)**

---

## Features

* **Schedule Generation:** Instantly generates all possible schedule combinations from a list of course codes.
* **Organized Display:** Shows generated schedules in a clean, easy-to-read table format.
* **Day-Off Filter:** Easily filter schedules to find ones that have specific days off (e.g., "no classes on Thursday").

## Tech Stack

* **Front End:** React
* **Language:** TypeScript
* **Styling:** Tailwind CSS

## Getting Started (Local Development)

To run this project locally on your machine:

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/xhadi/ccsit-schedule-maker.git
    cd ccsit-schedule-maker
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

3.  **Run the development server:**
    ```sh
    npm run dev
    ```

4.  Open [http://localhost:5173](http://localhost:5173) (or the URL shown in your terminal) to view it in your browser.

## Updating Course Data

The application uses course data stored in `public/ccsit_male_courses.csv` and `public/ccsit_female_courses.csv`. To update these with the latest data from KFU:

1.  **Install Python dependencies:**
    ```sh
    pip install -r scraper/requirements.txt
    ```

2.  **Run the scraper:**
    ```sh
    python scraper/main.py
    ```
    This script fetches the latest study schedules and updates the CSV files in the `public` folder.
