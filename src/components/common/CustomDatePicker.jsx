import React, { useState, useEffect, useRef } from 'react';
import { CaretLeft, CaretRight, Calendar as CalendarIcon } from '@phosphor-icons/react';
import { getHolidayName } from '../../utils/holidays';

const CustomDatePicker = ({ value, onChange, placeholder = "날짜 선택" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(new Date());
    const containerRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggle = () => {
        const nextOpen = !isOpen;
        if (nextOpen && value) {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                setViewDate(date);
            }
        }
        setIsOpen(nextOpen);
    };

    const handlePrevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const handleYearChange = (e) => {
        setViewDate(new Date(parseInt(e.target.value), viewDate.getMonth(), 1));
    };

    const handleMonthChange = (e) => {
        setViewDate(new Date(viewDate.getFullYear(), parseInt(e.target.value), 1));
    };

    const handleDateClick = (date) => {
        // Format YYYY-MM-DD manually to avoid timezone issues with toISOString
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        onChange(`${year}-${month}-${day}`);
        setIsOpen(false);
    };

    const renderCalendar = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

        const weeks = [];
        let week = [];
        days.forEach((day, index) => {
            week.push(day);
            if ((index + 1) % 7 === 0 || index === days.length - 1) {
                if (week.length < 7) {
                    for (let i = week.length; i < 7; i++) week.push(null);
                }
                weeks.push(week);
                week = [];
            }
        });

        return (
            <div style={{ padding: '10px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <button onClick={handlePrevMonth} style={navBtnStyle}><CaretLeft /></button>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        <select
                            value={year}
                            onChange={handleYearChange}
                            style={headerSelectStyle}
                            onClick={e => e.stopPropagation()}
                        >
                            {Array.from({ length: 21 }, (_, i) => year - 10 + i).map(y => (
                                <option key={y} value={y}>{y}년</option>
                            ))}
                        </select>
                        <select
                            value={month}
                            onChange={handleMonthChange}
                            style={headerSelectStyle}
                            onClick={e => e.stopPropagation()}
                        >
                            {Array.from({ length: 12 }, (_, i) => i).map(m => (
                                <option key={m} value={m}>{m + 1}월</option>
                            ))}
                        </select>
                    </div>
                    <button onClick={handleNextMonth} style={navBtnStyle}><CaretRight /></button>
                </div>

                {/* Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center' }}>
                    {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                        <div key={d} style={{ fontSize: '0.8rem', fontWeight: 'bold', color: i === 0 ? '#ef4444' : '#a1a1aa', padding: '5px 0' }}>{d}</div>
                    ))}
                    {weeks.map((week, wIdx) => (
                        week.map((date, dIdx) => {
                            if (!date) return <div key={`${wIdx}-${dIdx}`} />;

                            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                            const isSelected = value === dateStr;
                            const isToday = date.toDateString() === new Date().toDateString();
                            const holiday = getHolidayName(dateStr);
                            const isSunday = date.getDay() === 0;
                            const isRed = isSunday || holiday;

                            return (
                                <div
                                    key={dateStr}
                                    onClick={() => handleDateClick(date)}
                                    style={{
                                        padding: '8px 0',
                                        fontSize: '0.9rem',
                                        cursor: 'pointer',
                                        borderRadius: '6px',
                                        backgroundColor: isSelected ? 'var(--primary-gold)' : (isToday ? 'rgba(255,255,255,0.1)' : 'transparent'),
                                        color: isSelected ? 'black' : (isRed ? '#ef4444' : 'var(--text-primary)'),
                                        fontWeight: isSelected || isToday ? 'bold' : 'normal',
                                        position: 'relative',
                                        border: isToday && !isSelected ? '1px solid var(--primary-gold)' : 'none'
                                    }}
                                >
                                    {date.getDate()}
                                    {holiday && (
                                        <div style={{ fontSize: '0.6rem', position: 'absolute', bottom: '-2px', left: 0, right: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: isSelected ? 'black' : '#ef4444' }}>
                                            .
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ))}
                </div>
                {/* Holiday Name Display for Selected Month (Optional, but user asked for holiday display) 
                    Let's just show it in the day cell if space permits, or standard pattern.*/}
            </div>
        );
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            <div
                onClick={handleToggle}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '1rem',
                    cursor: 'pointer', fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif'
                }}
            >
                <span>{value || placeholder}</span>
                <CalendarIcon size={20} color="#a1a1aa" />
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, zIndex: 1200,
                    marginTop: '5px', background: '#18181b', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                    width: '300px', padding: '10px'
                }}>
                    {renderCalendar()}
                    {/* Holiday Legend for current view if needed */}
                </div>
            )}
        </div>
    );
};

const navBtnStyle = {
    background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '5px', display: 'flex', alignItems: 'center'
};

const headerSelectStyle = {
    background: '#27272a', color: 'white', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '4px', padding: '2px 5px', fontSize: '0.9rem', cursor: 'pointer'
};

export default CustomDatePicker;
