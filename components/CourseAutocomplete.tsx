import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Course } from '../types';

interface CourseAutocompleteProps {
    courses: Course[];
    selectedCourses: string[];
    onSelect: (courseCode: string) => void;
    onRemove: (courseCode: string) => void;
}

const CourseAutocomplete: React.FC<CourseAutocompleteProps> = ({
    courses,
    selectedCourses,
    onSelect,
    onRemove,
}) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [inputValue, setInputValue] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const filteredCourses = useMemo(() => {
        if (!query || query.length < 1) return [];
        
        const lowerQuery = query.toLowerCase();
        return courses
            .filter(course => {
                const codeMatch = course.courseCode.toLowerCase().includes(lowerQuery);
                const notSelected = !selectedCourses.includes(course.courseCode);
                return codeMatch && notSelected;
            })
            .slice(0, 8);
    }, [courses, query, selectedCourses]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setShowSuggestions(false);
                setHighlightedIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);
        setQuery(value);
        setShowSuggestions(value.length > 0);
        setHighlightedIndex(-1);
    };

    const handleFocus = () => {
        if (inputValue.length > 0) {
            setShowSuggestions(true);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showSuggestions || filteredCourses.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev => 
                    prev < filteredCourses.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => 
                    prev > 0 ? prev - 1 : filteredCourses.length - 1
                );
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < filteredCourses.length) {
                    handleSelect(filteredCourses[highlightedIndex].courseCode);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setShowSuggestions(false);
                setHighlightedIndex(-1);
                break;
        }
    };

    const handleSelect = (courseCode: string) => {
        onSelect(courseCode);
        setInputValue('');
        setQuery('');
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        inputRef.current?.focus();
    };

    return (
        <div ref={wrapperRef} className="relative">
            <input
                ref={inputRef}
                type="text"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 transition-colors"
                placeholder="Enter course code and press Enter (e.g. 0901-204)"
                value={inputValue}
                onChange={handleInputChange}
                onFocus={handleFocus}
                onKeyDown={handleKeyDown}
            />

            {showSuggestions && filteredCourses.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {filteredCourses.map((course, index) => (
                        <div
                            key={course.courseCode}
                            className={`p-2 cursor-pointer border-b border-gray-100 dark:border-gray-600 last:border-b-0 ${
                                index === highlightedIndex
                                    ? 'bg-blue-100 dark:bg-blue-900'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                            }`}
                            onClick={() => handleSelect(course.courseCode)}
                        >
                            <span className="font-semibold text-gray-800 dark:text-white">
                                {course.courseCode}
                            </span>
                            <span className="text-gray-600 dark:text-gray-300 text-sm ml-2">
                                - {course.courseName}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {showSuggestions && filteredCourses.length === 0 && inputValue.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2 text-center text-gray-500 dark:text-gray-400">
                    No courses found
                </div>
            )}

            {selectedCourses.length > 0 && (
                <div className="mt-4 min-h-[80px] max-h-[200px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                    <div className="flex flex-wrap gap-2">
                        {selectedCourses.map(code => {
                            const course = courses.find(c => c.courseCode === code);
                            return (
                                <span key={code} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                                    <span className="font-semibold">{code}</span>
                                    <span className="text-xs text-blue-600 dark:text-blue-300 truncate max-w-[200px]">
                                        - {course?.courseName || ''}
                                    </span>
                                    <button
                                        onClick={() => onRemove(code)}
                                        className="ml-1 text-blue-600 dark:text-blue-300 hover:text-red-500 font-bold"
                                        aria-label={`Remove ${code}`}
                                    >
                                        ×
                                    </button>
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}

            {selectedCourses.length === 0 && (
                <div className="mt-4 min-h-[80px] max-h-[200px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
                    <p className="text-gray-400 dark:text-gray-500 text-sm text-center">No courses selected yet</p>
                </div>
            )}
        </div>
    );
};

export default CourseAutocomplete;