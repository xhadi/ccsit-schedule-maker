
export interface ScheduleSlot {
  day: string;
  time: string;
}

export interface Section {
  crn: string;
  sectionId: string;
  sectionType: string;
  status: string;
  instructor: string;
  schedule: ScheduleSlot[];
  course: Course;
}

export interface Course {
  courseCode: string;
  courseName: string;
  creditHours: string;
  sections: Section[];
}

export type Schedule = Section[];

export type Gender = 'male' | 'female';

export interface Filters {
    daysOff: string[];
    instructors: string[];
    crns: string[];
}
