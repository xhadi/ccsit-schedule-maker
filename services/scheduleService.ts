import { Course, Section, ScheduleSlot, Schedule } from '../types';
import { arabicDayMap } from '../constants';
import * as XLSX from 'xlsx';

export const parseExcelFile = async (arrayBuffer: ArrayBuffer): Promise<Course[]> => {
  try {
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const json: any[] = XLSX.utils.sheet_to_json(worksheet);
    
    const courses: { [key: string]: Course } = {};
    
    json.forEach(row => {
      // Skip rows where status is 'غير متاحه'
      if (row['حالة الشعبة'] === 'غير متاحه') {
        return;
      }

      const courseCode = row['رقم المقرر'];
      const courseName = row['اسم المقرر'];
      const creditHours = String(row['ساعات']);
      
      const crn = String(row['CRN']);
      const sectionId = String(row['الشعبة']);
      const sectionType = row['النشاط'];
      const status = row['حالة الشعبة'];
      const instructor = row['مدرس المادة'] || "Unknown";
      
      const days = String(row['الأيام'] || '').split(' ').filter(d => d.trim() !== '');
      const timeSlot = row['الوقت'];
      
      if (!courseCode || !crn || !timeSlot) return;

      if (!courses[courseCode]) {
        courses[courseCode] = {
          courseCode,
          courseName,
          creditHours,
          sections: [],
        };
      }
      const course = courses[courseCode];

      let section = course.sections.find(s => s.crn === crn && s.sectionId === sectionId);
      if (!section) {
        section = {
          crn,
          sectionId,
          sectionType,
          status,
          instructor,
          schedule: [],
          course,
        };
        course.sections.push(section);
      }
      
      days.forEach(day => {
        section!.schedule.push({ day: day.trim(), time: timeSlot });
      });
    });
    
    return Object.values(courses);
  } catch (e) {
    console.error("Error parsing Excel file:", e);
    throw new Error("Failed to parse the Excel file data.");
  }
};

const parseTime = (timeStr: string): [number, number] => {
  const parts = timeStr.split(' - ');
  const start = parseInt(parts[0].slice(0, 2)) * 60 + parseInt(parts[0].slice(2));
  const end = parseInt(parts[1].slice(0, 2)) * 60 + parseInt(parts[1].slice(2));
  return [start, end];
};

const hasTimeConflict = (sections: Section[]): boolean => {
  const allSlots: ScheduleSlot[] = sections.flatMap(s => s.schedule);
  for (let i = 0; i < allSlots.length; i++) {
    const s1 = allSlots[i];
    const day1 = s1.day;
    const [start1, end1] = parseTime(s1.time);
    for (let j = i + 1; j < allSlots.length; j++) {
      const s2 = allSlots[j];
      if (s2.day !== day1) continue;
      const [start2, end2] = parseTime(s2.time);
      if (start1 < end2 && start2 < end1) {
        return true;
      }
    }
  }
  return false;
};

const generateCourseOptions = (course: Course): Section[][] => {
  const options: Section[][] = [];
  if (course.creditHours === '4') {
    const sectionsById: { [key: string]: Section } = {};
    course.sections.forEach(s => sectionsById[s.sectionId] = s);

    course.sections.forEach(section => {
      if (section.sectionType !== 'نظري' || !/^\d+$/.test(section.sectionId)) return;
      
      const theoreticalId = parseInt(section.sectionId, 10);
      const practicalId = theoreticalId + 40;
      const practicalSection = sectionsById[String(practicalId)];
      
      if (practicalSection && practicalSection.sectionType === 'عملي') {
        options.push([section, practicalSection]);
      }
    });
  } else {
    course.sections.forEach(section => options.push([section]));
  }
  return options;
};

const cartesianProduct = <T,>(...arrays: T[][]): T[][] => {
  return arrays.reduce<T[][]>(
    (acc, val) => acc.flatMap(a => val.map(v => [...a, v])),
    [[]]
  );
};

export const generateValidSchedules = (courses: Course[]): Schedule[] => {
  const allCourseOptions = courses
    .map(generateCourseOptions)
    .filter(options => options.length > 0);

  if (allCourseOptions.length !== courses.length) {
    // A course had no valid options, so no schedules are possible.
    return [];
  }

  if (allCourseOptions.length === 0) {
    return [];
  }
  
  const allCombinations = cartesianProduct(...allCourseOptions);
  
  const validSchedules: Schedule[] = [];
  for (const combo of allCombinations) {
    const sections = combo.flat();
    if (!hasTimeConflict(sections)) {
      validSchedules.push(sections);
    }
  }
  
  return validSchedules;
};