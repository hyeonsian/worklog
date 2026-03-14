"use client";

import ReactCalendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

interface CalendarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export default function Calendar({ selectedDate, onDateChange }: CalendarProps) {
  return (
    <div className="px-2">
      <ReactCalendar
        value={selectedDate}
        onChange={(value) => {
          if (value instanceof Date) {
            onDateChange(value);
          }
        }}
        locale="ko-KR"
        calendarType="gregory"
        formatDay={(locale, date) => date.getDate().toString()}
      />
    </div>
  );
}
