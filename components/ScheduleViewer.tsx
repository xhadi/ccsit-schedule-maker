
import React, { useMemo } from 'react';
import { Schedule } from '../types';
import { arabicDayMap, daysOfWeek } from '../constants';

interface ScheduleViewerProps {
  schedule: Schedule;
  scheduleId: number;
}

const convertTo12Hour = (time24: string): string => {
    if (!time24 || time24.length !== 4) return "N/A";
    const hours24 = parseInt(time24.substring(0, 2), 10);
    const minutes = time24.substring(2, 4);
    const ampm = hours24 >= 12 ? 'PM' : 'AM';
    let hours12 = hours24 % 12;
    if (hours12 === 0) {
        hours12 = 12; // Handle midnight and noon
    }
    return `${hours12}:${minutes} ${ampm}`;
};


const formatTime = (timeStr: string): string => {
  if (!timeStr || timeStr.length < 11) return "Invalid Time";
  const [start, end] = timeStr.split(' - ');
  return `${convertTo12Hour(start)} - ${convertTo12Hour(end)}`;
};

const parseStartTime = (timeStr: string): number => {
    const parts = timeStr.split(' - ');
    return parseInt(parts[0].slice(0, 2)) * 60 + parseInt(parts[0].slice(2));
};

const ScheduleViewer: React.FC<ScheduleViewerProps> = ({ schedule, scheduleId }) => {
  const { timeSlots, scheduleData, crns } = useMemo(() => {
    const slots = new Map<string, number>();
    const data: { [day: string]: { [time: string]: any[] } } = {};
    daysOfWeek.forEach(day => data[day] = {});

    const scheduleCrns = schedule.map(section => section.crn).sort();

    schedule.forEach(section => {
      section.schedule.forEach(slot => {
        const day = arabicDayMap[slot.day] || slot.day;
        if (daysOfWeek.includes(day)) {
          if (!data[day][slot.time]) {
            data[day][slot.time] = [];
          }
          data[day][slot.time].push({
            code: section.course.courseCode,
            name: section.course.courseName,
            sectionId: section.sectionId,
            type: section.sectionType,
            instructor: section.instructor,
            crn: section.crn,
          });
          if (!slots.has(slot.time)) {
              slots.set(slot.time, parseStartTime(slot.time));
          }
        }
      });
    });

    const sortedTimeSlots = Array.from(slots.keys()).sort((a, b) => slots.get(a)! - slots.get(b)!);
    
    return { timeSlots: sortedTimeSlots, scheduleData: data, crns: scheduleCrns.join(', ') };
  }, [schedule]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-8 p-6 border border-gray-200 dark:border-gray-700">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white">
          Schedule #{scheduleId}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
            CRNs: {crns}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 border-collapse">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-300">
            <tr>
              <th scope="col" className="px-6 py-3 w-48 font-semibold">Time</th>
              {daysOfWeek.map(day => (
                <th key={day} scope="col" className="px-6 py-3 font-semibold text-center">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map(time => (
              <tr key={time} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                <td className="px-6 py-4 font-mono font-medium text-gray-900 dark:text-white whitespace-nowrap">
                  {formatTime(time)}
                </td>
                {daysOfWeek.map(day => (
                  <td key={day} className="px-2 py-2 align-top">
                    {scheduleData[day][time]?.map((course, index) => (
                      <div key={index} className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 p-2 rounded-md mb-2 shadow-sm text-xs">
                        <p className="font-bold">{course.code} ({course.sectionId})</p>
                        <p>{course.name}</p>
                        <p className="italic text-gray-600 dark:text-gray-400">{course.type}</p>
                        <p><strong>CRN:</strong> {course.crn}</p>
                        <p><strong>Instr:</strong> {course.instructor}</p>
                      </div>
                    ))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ScheduleViewer;
