import React, { useState, useMemo, useCallback } from 'react';
import { Course, Schedule, Gender, Filters } from './types';
import { parseCSVFile, generateValidSchedules } from './services/scheduleService';
import ScheduleViewer from './components/ScheduleViewer';
import Spinner from './components/Spinner';
import { daysOfWeek, arabicDayMap } from './constants';

type AppStep = 'gender_select' | 'select_courses' | 'generating' | 'results' | 'error';

const App: React.FC = () => {
    const [step, setStep] = useState<AppStep>('gender_select');
    const [gender, setGender] = useState<Gender | null>(null);
    const [allCourses, setAllCourses] = useState<Course[]>([]);
    const [selectedCourseCodes, setSelectedCourseCodes] = useState<string>('');
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [error, setError] = useState<string>('');
    const [filters, setFilters] = useState<Filters>({ daysOff: [], instructors: [], crns: [] });
    const [crnSearch, setCrnSearch] = useState<string>('');
    const [instructorSearch, setInstructorSearch] = useState<string>('');
    const [loadingMessage, setLoadingMessage] = useState<string>('');

    const handleGenderSelect = async (selectedGender: Gender) => {
        setGender(selectedGender);
        setStep('generating');
        setLoadingMessage(`Loading ${selectedGender} course data...`);

        try {
            const fileName = selectedGender === 'male' ? 'ccsit_male_courses.csv' : 'ccsit_female_courses.csv';
            const response = await fetch(`${import.meta.env.BASE_URL}${fileName}`);

            if (!response.ok) {
                throw new Error(`Could not fetch course file. Status: ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const courses = await parseCSVFile(arrayBuffer);
            
            setAllCourses(courses);
            setStep('select_courses');
        } catch (err) {
            console.error(err);
            setError(`Failed to load courses for ${selectedGender} gender. Please ensure the course file is available and try again.`);
            setStep('error');
        } finally {
            setLoadingMessage('');
        }
    };

    const clearFilters = () => setFilters({ daysOff: [], instructors: [], crns: [] });

    const handleFilterChange = useCallback((filterType: keyof Filters, value: string[]) => {
        setFilters(prev => ({ ...prev, [filterType]: value }));
    }, []);

    const handleGenerateSchedules = () => {
        const codes = selectedCourseCodes.split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
        if (codes.length === 0) {
            setError('Please enter at least one course code.');
            return;
        }
        
        const selectedCourses = allCourses.filter(c => codes.includes(c.courseCode.toUpperCase()));
        const notFoundCodes = codes.filter(code => 
            !allCourses.some(c => c.courseCode.toUpperCase() === code)
        );
        
        if (notFoundCodes.length > 0) {
            setError(`The following course codes were not found: ${notFoundCodes.join(', ')}`);
            return;
        }

        setError('');
        setStep('generating');
        setLoadingMessage('Generating schedules...');
        
        setTimeout(() => {
            try {
                const validSchedules = generateValidSchedules(selectedCourses);
                setSchedules(validSchedules);
                setStep('results');
            } catch (e) {
                console.error(e);
                setError('Schedule generation failed.');
                setStep('error');
            } finally {
                setLoadingMessage('');
            }
        }, 100);
    };

    const filteredSchedules = useMemo(() => {
        return schedules.filter(schedule => {
            const scheduleDays = new Set(schedule.flatMap(s => s.schedule.map(slot => arabicDayMap[slot.day] || slot.day)));
            const scheduleInstructors = new Set(schedule.map(s => s.instructor));
            const scheduleCRNs = new Set(schedule.map(s => s.crn));

            if (filters.daysOff.length > 0) {
                const hasForbiddenDay = filters.daysOff.some(day => scheduleDays.has(day));
                if (hasForbiddenDay) return false;
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
        setCrnSearch('');
        setInstructorSearch('');
        setLoadingMessage('');
    };

    const renderContent = () => {
        switch (step) {
            case 'gender_select':
                return (
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Select Your Gender</h2>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => handleGenderSelect('male')} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">Male</button>
                            <button onClick={() => handleGenderSelect('female')} className="px-8 py-3 bg-pink-500 text-white font-semibold rounded-lg shadow-md hover:bg-pink-600">Female</button>
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
                        <button 
                            onClick={handleGenerateSchedules} 
                            className="mt-4 w-full px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                        >
                            Generate Schedules
                        </button>
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
                        <div className="mb-2 text-sm text-gray-600 dark:text-gray-300">
                            Found {schedules.length} possible schedules. Displaying {filteredSchedules.length}.
                        </div>

                        {filteredSchedules.length > 0 ? (
                            filteredSchedules.map((schedule, index) => (
                                <ScheduleViewer 
                                    key={index} 
                                    schedule={schedule} 
                                    scheduleId={schedules.indexOf(schedule) + 1} 
                                />
                            ))
                        ) : (
                            <p className="text-center text-red-600 dark:text-red-400 font-bold mt-10">
                                No Schedule Matches Found with Current Filters.
                            </p>
                        )}
                    </div>
                );
            case 'error':
                return (
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">An Error Occurred</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
                        <button 
                            onClick={reset} 
                            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Start Over
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-white">CCSIT Course Scheduler</h1>
                    {(step !== 'gender_select') && (
                        <button 
                            onClick={reset} 
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
                        >
                            Start Over
                        </button>
                    )}
                </header>

                {step === 'results' && (
                    <React.Fragment>
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700 my-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="text-sm text-gray-600 dark:text-gray-300">Select filters to narrow schedules</div>
                                        <button onClick={clearFilters} className="px-3 py-1 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 transition-colors">
                                            Clear Filters
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Days Off</label>
                                            <div className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 h-64 flex flex-col overflow-y-auto">
                                                {daysOfWeek.map(day => (
                                                    <div key={day} className="flex items-center mb-1">
                                                        <input
                                                            type="checkbox"
                                                            id={`day-${day}`}
                                                            checked={filters.daysOff.includes(day)}
                                                            onChange={e => {
                                                                const newDays = e.target.checked
                                                                    ? [...filters.daysOff, day]
                                                                    : filters.daysOff.filter(d => d !== day);
                                                                handleFilterChange('daysOff', newDays);
                                                            }}
                                                            className="mr-2"
                                                        />
                                                        <label htmlFor={`day-${day}`} className="text-gray-700 dark:text-gray-300 cursor-pointer">
                                                            {day}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Instructors (Must Include)</label>
                                            <div className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 h-64 flex flex-col">
                                                <input
                                                    type="text"
                                                    placeholder="Search Instructors..."
                                                    value={instructorSearch}
                                                    onChange={e => setInstructorSearch(e.target.value)}
                                                    className="w-full mb-2 p-1 text-sm border-b border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none"
                                                />
                                                <div className="flex-1 overflow-y-auto">
                                                    {uniqueInstructors
                                                        .filter(inst => inst.toLowerCase().includes(instructorSearch.toLowerCase()))
                                                        .map(inst => (
                                                        <div key={inst} className="flex items-center mb-1">
                                                            <input
                                                                type="checkbox"
                                                                id={`inst-${inst}`}
                                                                checked={filters.instructors.includes(inst)}
                                                                onChange={e => {
                                                                    const newInsts = e.target.checked
                                                                        ? [...filters.instructors, inst]
                                                                        : filters.instructors.filter(i => i !== inst);
                                                                    handleFilterChange('instructors', newInsts);
                                                                }}
                                                                className="mr-2"
                                                            />
                                                            <label htmlFor={`inst-${inst}`} className="text-gray-700 dark:text-gray-300 truncate cursor-pointer">
                                                                {inst}
                                                            </label>
                                                        </div>
                                                    ))}
                                                    {uniqueInstructors.filter(inst => inst.toLowerCase().includes(instructorSearch.toLowerCase())).length === 0 && (
                                                        <div className="text-gray-500 text-center py-2">No Instructors found</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CRNs (Must Include)</label>
                                            <div className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 h-64 flex flex-col">
                                                <input
                                                    type="text"
                                                    placeholder="Search CRNs..."
                                                    value={crnSearch}
                                                    onChange={e => setCrnSearch(e.target.value)}
                                                    className="w-full mb-2 p-1 text-sm border-b border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none"
                                                />
                                                <div className="flex-1 overflow-y-auto">
                                                    {uniqueCRNs
                                                        .filter(crn => crn.includes(crnSearch))
                                                        .map(crn => (
                                                        <div key={crn} className="flex items-center mb-1">
                                                            <input
                                                                type="checkbox"
                                                                id={`crn-${crn}`}
                                                                checked={filters.crns.includes(crn)}
                                                                onChange={e => {
                                                                    const newCrns = e.target.checked
                                                                        ? [...filters.crns, crn]
                                                                        : filters.crns.filter(c => c !== crn);
                                                                    handleFilterChange('crns', newCrns);
                                                                }}
                                                                className="mr-2"
                                                            />
                                                            <label htmlFor={`crn-${crn}`} className="text-gray-700 dark:text-gray-300 truncate cursor-pointer">
                                                                {crn}
                                                            </label>
                                                        </div>
                                                    ))}
                                                    {uniqueCRNs.filter(crn => crn.includes(crnSearch)).length === 0 && (
                                                        <div className="text-gray-500 text-center py-2">No CRNs found</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                    </React.Fragment>
                )}

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