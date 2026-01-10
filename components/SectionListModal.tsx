import React, { useMemo } from 'react';
import { Course, Section } from '../types';

interface SectionListModalProps {
    isOpen: boolean;
    onClose: () => void;
    courses: Course[];
}

const SectionListModal: React.FC<SectionListModalProps> = ({ isOpen, onClose, courses }) => {
    if (!isOpen) return null;

    const sections = useMemo(() => {
        const allSections: Section[] = [];
        courses.forEach(c => {
            c.sections.forEach(s => {
                allSections.push(s);
            });
        });
        // Sort by course code
        return allSections.sort((a, b) => a.course.courseCode.localeCompare(b.course.courseCode));
    }, [courses]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">All Sections of Courses</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <span className="text-2xl">&times;</span>
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-4">
                    <table className="min-w-full text-right border-collapse" dir="rtl">
                        <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                            <tr>
                                <th className="px-4 py-2 border dark:border-gray-600 text-gray-800 dark:text-gray-200">رمز المقرر</th>
                                <th className="px-4 py-2 border dark:border-gray-600 text-gray-800 dark:text-gray-200">CRN</th>
                                <th className="px-4 py-2 border dark:border-gray-600 text-gray-800 dark:text-gray-200">الشعبة</th>
                                <th className="px-4 py-2 border dark:border-gray-600 text-gray-800 dark:text-gray-200">الحالة</th>
                                <th className="px-4 py-2 border dark:border-gray-600 text-gray-800 dark:text-gray-200">الايام</th>
                                <th className="px-4 py-2 border dark:border-gray-600 text-gray-800 dark:text-gray-200">الوقت</th>
                                <th className="px-4 py-2 border dark:border-gray-600 text-gray-800 dark:text-gray-200">اسم المقرر</th>
                                <th className="px-4 py-2 border dark:border-gray-600 text-gray-800 dark:text-gray-200">الساعات</th>
                                <th className="px-4 py-2 border dark:border-gray-600 text-gray-800 dark:text-gray-200">النشاط</th>
                                <th className="px-4 py-2 border dark:border-gray-600 text-gray-800 dark:text-gray-200">مدرس الماده</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            {sections.map((section, idx) => {
                                // Extract unique days and times
                                const uniqueDays = Array.from(new Set(section.schedule.map(s => s.day))).join(' ');
                                const uniqueTimes = Array.from(new Set(section.schedule.map(s => s.time))).join(' ');
                                
                                return (
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-4 py-2 border dark:border-gray-600">{section.course.courseCode}</td>
                                        <td className="px-4 py-2 border dark:border-gray-600">{section.crn}</td>
                                        <td className="px-4 py-2 border dark:border-gray-600">{section.sectionId}</td>
                                        <td className={`px-4 py-2 border dark:border-gray-600 font-semibold ${section.status === 'متاحة' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {section.status}
                                        </td>
                                        <td className="px-4 py-2 border dark:border-gray-600">{uniqueDays}</td>
                                        <td className="px-4 py-2 border dark:border-gray-600">{uniqueTimes}</td>
                                        <td className="px-4 py-2 border dark:border-gray-600">{section.course.courseName}</td>
                                        <td className="px-4 py-2 border dark:border-gray-600">{section.course.creditHours}</td>
                                        <td className="px-4 py-2 border dark:border-gray-600">{section.sectionType}</td>
                                        <td className="px-4 py-2 border dark:border-gray-600">{section.instructor}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SectionListModal;
