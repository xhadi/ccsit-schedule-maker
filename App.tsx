import React, { useState, useMemo, useCallback } from 'react';
import { Course, Schedule, Gender, Filters } from './types';
import { parseExcelFile, generateValidSchedules } from './services/scheduleService';
import ScheduleViewer from './components/ScheduleViewer';
import Spinner from './components/Spinner';
import { daysOfWeek } from './constants';

type AppStep = 'gender_select' | 'select_courses' | 'generating' | 'results' | 'error';

const App: React.FC = () => {
    const [step, setStep] = useState<AppStep>('gender_select');
    const [gender, setGender] = useState<Gender | null>(null);
    const [allCourses, setAllCourses] = useState<Course[]>([]);
    const [selectedCourseCodes, setSelectedCourseCodes] = useState<string>('');
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [error, setError] = useState<string>('');
    const [filters, setFilters] = useState<Filters>({ daysOff: [], instructors: [], crns: [] });
    const [loadingMessage, setLoadingMessage] = useState<string>('');

    const handleGenderSelect = async (selectedGender: Gender) => {
        setGender(selectedGender);
        setStep('generating');
        setLoadingMessage(`Loading ${selectedGender} course data...`);

        try {
            const fileName = selectedGender === 'male' ? 'kfu_male_courses.xlsx' : 'kfu_female_courses.xlsx';
            const response = await fetch(fileName);

            if (!response.ok) {
                throw new Error(`Could not fetch course file. Status: ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const courses = await parseExcelFile(arrayBuffer);
            
            setAllCourses(courses);
            setStep('select_courses');
        } catch (err) {
            console.error(err);
            setError(`Failed to load courses for ${selectedGender} campus. Please ensure the course file is available and try again.`);
            setStep('error');
        } finally {
            setLoadingMessage('');
        }
    };
    
    const handleGenerateSchedules = () => {
        const codes = selectedCourseCodes.split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
        if (codes.length === 0) {
            setError('Please enter at least one course code.');
            return;
        }

        const selectedCourses = allCourses.filter(c => codes.includes(c.courseCode.toUpperCase()));
        const notFoundCodes = codes.filter(code => !allCourses.some(c => c.courseCode.toUpperCase() === code));

        if (notFoundCodes.length > 0) {
             setError(`The following course codes were not found: ${notFoundCodes.join(', ')}. Please check the codes and try again.`);
             return;
        }

        setError('');
        setStep('generating');
        setLoadingMessage('Generating all possible schedules...');
        setTimeout(() => { // Gives browser time to render loading state
            try {
                const validSchedules = generateValidSchedules(selectedCourses);
                setSchedules(validSchedules);
                setStep('results');
            } catch (e) {
                setError('An error occurred during schedule generation.');
                setStep('error');
            } finally {
                setLoadingMessage('');
            }
        }, 100);
    };

    const handleFilterChange = useCallback((filterType: keyof Filters, value: string[]) => {
        setFilters(prev => ({ ...prev, [filterType]: value }));
    }, []);

    const filteredSchedules = useMemo(() => {
        return schedules.filter(schedule => {
            const scheduleDays = new Set(schedule.flatMap(s => s.schedule.map(slot => slot.day)));
            const scheduleInstructors = new Set(schedule.map(s => s.instructor));
            const scheduleCRNs = new Set(schedule.map(s => s.crn));

            if (filters.daysOff.length > 0) {
                const hasDayOff = filters.daysOff.every(day => !scheduleDays.has(day.charAt(0).toLowerCase()));
                if (!hasDayOff) return false;
            }
            if (filters.instructors.length > 0 && !filters.instructors.some(inst => scheduleInstructors.has(inst))) {
                return false;
            }
            if (filters.crns.length > 0 && !filters.crns.some(crn => scheduleCRNs.has(crn))) {
                return false;
            }
            return true;
        });
    }, [schedules, filters]);
    
    const { uniqueInstructors, uniqueCRNs } = useMemo(() => {
        const instructors = new Set<string>();
        const crns = new Set<string>();
        schedules.forEach(schedule => {
            schedule.forEach(section => {
                instructors.add(section.instructor);
                crns.add(section.crn);
            });
        });
        return { 
            uniqueInstructors: Array.from(instructors).sort(),
            uniqueCRNs: Array.from(crns).sort()
        };
    }, [schedules]);

    const reset = () => {
        setStep('gender_select');
        setGender(null);
        setAllCourses([]);
        setSelectedCourseCodes('');
        setSchedules([]);
        setError('');
        setFilters({ daysOff: [], instructors: [], crns: [] });
        setLoadingMessage('');
    };

    const renderContent = () => {
        switch (step) {
            case 'gender_select':
                return (
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Select Your Campus</h2>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => handleGenderSelect('male')} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition-colors">Male</button>
                            <button onClick={() => handleGenderSelect('female')} className="px-8 py-3 bg-pink-500 text-white font-semibold rounded-lg shadow-md hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-opacity-75 transition-colors">Female</button>
                        </div>
                    </div>
                );
            case 'select_courses':
                 return (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Select Your Courses</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">Enter course codes separated by commas (e.g., 0901-204, 0911-221).</p>
                        {error && <p className="text-red-500 mb-4">{error}</p>}
                        <textarea
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            placeholder="Enter course codes..."
                            value={selectedCourseCodes}
                            onChange={(e) => setSelectedCourseCodes(e.target.value)}
                        />
                        <button onClick={handleGenerateSchedules} className="mt-4 w-full px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center">Generate Schedules</button>
                         <div className="mt-6">
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">Available Courses ({allCourses.length})</h3>
                            <div className="h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-gray-100 dark:bg-gray-800">
                                <ul className="text-sm text-gray-600 dark:text-gray-400">
                                    {allCourses.map(course => (
                                        <li key={course.courseCode} className="p-1">{course.courseCode} - {course.courseName}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                );
            case 'generating':
                return (
                    <div className="text-center flex flex-col items-center justify-center min-h-[200px]">
                        <Spinner />
                        <p className="text-gray-700 dark:text-gray-200 mt-4 text-lg">
                            {loadingMessage || 'Processing...'}
                        </p>
                    </div>
                );
            case 'results':
                return (
                    <div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 sticky top-4 z-10 border dark:border-gray-700">
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Filter Schedules</h2>
                            <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">Found {schedules.length} possible schedules. Displaying {filteredSchedules.length}.</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Days Off</label>
                                    <select multiple value={filters.daysOff} onChange={e => handleFilterChange('daysOff', Array.from(e.target.selectedOptions, option => option.value))} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                                        {daysOfWeek.map(day => <option key={day} value={day}>{day}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Instructors</label>
                                    <select multiple value={filters.instructors} onChange={e => handleFilterChange('instructors', Array.from(e.target.selectedOptions, option => option.value))} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                                        {uniqueInstructors.map(inst => <option key={inst} value={inst}>{inst}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CRNs</label>
                                    <select multiple value={filters.crns} onChange={e => handleFilterChange('crns', Array.from(e.target.selectedOptions, option => option.value))} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white">
                                        {uniqueCRNs.map(crn => <option key={crn} value={crn}>{crn}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {filteredSchedules.length > 0 ? (
                            filteredSchedules.map((schedule, index) => (
                                <ScheduleViewer key={index} schedule={schedule} scheduleId={schedules.indexOf(schedule) + 1} />
                            ))
                        ) : (
                            <p className="text-center text-gray-600 dark:text-gray-300 mt-8">No schedules match the current filters.</p>
                        )}
                    </div>
                );
             case 'error':
                 return (
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">An Error Occurred</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
                        <button onClick={reset} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">Start Over</button>
                    </div>
                 );
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-white">KFU Course Scheduler</h1>
                    {(step !== 'gender_select') && <button onClick={reset} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm">Start Over</button>}
                </header>
                <main>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 lg:p-10 border border-gray-200 dark:border-gray-700">
                        {renderContent()}
                    </div>
                </main>
                <footer className="text-center mt-8 text-gray-500 dark:text-gray-400 text-sm">
                    <p>Built for educational purposes. Always verify schedules with official university sources.</p>
                </footer>
            </div>
        </div>
    );
};

export default App;