from requests import Session
import requests 
import pandas as pd
import os
import time

def fetchCourses():
    maleCoursesJson = []
    femaleCoursesJson = []
    
    # Create the session once
    session = Session()
    
    api_url = 'https://www.kfu.edu.sa/_vti_bin/StudySchedules/StudySchedules.svc/GetCoursesByDept'

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json;odata=verbose',
        'Referer': 'https://www.kfu.edu.sa/ar/Deans/AdmissionRecordsDeanship/Pages/SSMain.aspx',
        'X-Requested-With': 'XMLHttpRequest',
    }

    deptid = ["0901", "0911", "0921", "0902", "0912", "0922", "0903", "0913", "0923", "0904", "0914", "0924"]
    stdGnr = ["11", "12"]

    try:
        for gndr in stdGnr:
            for dept in deptid:
                params = {
                    'deptid': dept,
                    'stdGnr': gndr
                }

                try:
                    response = session.get(api_url, params=params, headers=headers)
                    gender = "Male" if gndr == "11" else "Female"
                    
                    if response.status_code != 200:
                        print(f"Failed to fetch {dept} {gender}: {response.status_code}")
                        continue
                    
                    data = response.json()

                    if isinstance(data, list):
                        if gndr == "11":
                            maleCoursesJson.extend(data)
                        else:
                            femaleCoursesJson.extend(data)
                        print(f"Fetched {dept} ({gender})") # Helpful log
                        
                except Exception as e:
                    print(f"Error fetching {dept} ({gender}): {e}")
                    continue
                
                # Be polite to the server
                time.sleep(1) 
                
    finally:
        # Close the session after ALL loops are done
        session.close()
            
    return maleCoursesJson, femaleCoursesJson

def convertJsonToCsv(maleCoursesJson, femaleCoursesJson):
    # Ensure public directory exists
    if not os.path.exists("public"):
        os.makedirs("public")

    gndrs = ["male", "female"]
    for gndr in gndrs:
        data = maleCoursesJson if gndr == "male" else femaleCoursesJson
        
        if not data:
            print(f"No data found for {gndr}, skipping CSV generation.")
            continue

        df = pd.DataFrame(data)
        
        # Select columns if they exist
        cols = ["Course", "CRN", "Division", "Availability", "CourseTitle", "Activity", "Hours", "Days", "Time", "Teacher"]
        # Filter to only keep columns that are actually in the data (avoids errors if API changes)
        existing_cols = [c for c in cols if c in df.columns]
        df = df[existing_cols]

        fileName = f"ccsit_{gndr}_courses.csv"
        # Saves to public/filename.csv
        filePath = os.path.join("public", fileName)
        
        df.to_csv(filePath, index=False, encoding="utf-8-sig")
        print(f"Saved: {filePath}")

if __name__ == "__main__":
    male, female = fetchCourses()
    convertJsonToCsv(male, female)