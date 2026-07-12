const fs = require('fs');

// We simulate what PermanentEventsManager does
function calculateComplexEventExpiry(event, referenceDate) {
    const findNextStartDay = (days, currentDay) => {
      for (let i = 0; i < days.length; i++) {
        if (days[i] > currentDay) {
          return i;
        }
      }
      return 0;
    };

    const now = new Date(referenceDate);
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const [startHourServer, startMinuteServer] = event.start_time.split(":").map(Number);
    const [endHourServer, endMinuteServer] = event.end_time.split(":").map(Number);

    const timezoneAdjustment = 2; // Simulate Bucharest +2 over server +1

    let startDayShift = 0;
    if (startHourServer + timezoneAdjustment >= 24) startDayShift = 1;
    else if (startHourServer + timezoneAdjustment < 0) startDayShift = -1;

    let endDayShift = 0;
    if (endHourServer + timezoneAdjustment >= 24) endDayShift = 1;
    else if (endHourServer + timezoneAdjustment < 0) endDayShift = -1;

    const startHour = (startHourServer + timezoneAdjustment + 24) % 24;
    const startMinute = startMinuteServer;
    const endHour = (endHourServer + timezoneAdjustment + 24) % 24;
    const endMinute = endMinuteServer;

    const eventStartTime = startHour * 60 + startMinute;
    const eventEndTime = endHour * 60 + endMinute;

    const startDays = (event.start_days || []).map(day => (day + startDayShift + 7) % 7);
    const endDays = (event.end_days || []).map(day => (day + endDayShift + 7) % 7);

    const isMultiDayEvent = startDays.some((startDay, index) => startDay !== endDays[index]);
    const crossesMidnight = !isMultiDayEvent && (endHourServer + timezoneAdjustment >= 24 || eventEndTime < eventStartTime);

    if (startDays.includes(currentDay)) {
      if (currentTime < eventStartTime) {
        const nextStart = new Date(now);
        nextStart.setHours(startHour, startMinute, 0, 0);
        event.status = "upcoming";
        return nextStart;
      }
      if (!isMultiDayEvent && !crossesMidnight) {
        if (currentTime >= eventStartTime && currentTime < eventEndTime) {
          const nextEnd = new Date(now);
          nextEnd.setHours(endHour, endMinute, 0, 0);
          event.status = "ongoing";
          return nextEnd;
        }
        if (currentTime >= eventEndTime) {
          const nextStartDayIndex = findNextStartDay(startDays, currentDay);
          const daysUntilNextStart = (startDays[nextStartDayIndex] - currentDay + 7) % 7 || 7;
          const nextStart = new Date(now);
          nextStart.setDate(now.getDate() + daysUntilNextStart);
          nextStart.setHours(startHour, startMinute, 0, 0);
          event.status = "upcoming";
          return nextStart;
        }
      } else {
        if (currentTime >= eventStartTime) {
          const startDayIndex = startDays.findIndex(day => day === currentDay);
          if (startDayIndex !== -1 && startDayIndex < endDays.length) {
            const correspondingEndDay = endDays[startDayIndex];
            const nextEnd = new Date(now);
            let daysUntilEnd = (correspondingEndDay - currentDay + 7) % 7;
            if (daysUntilEnd === 0 && correspondingEndDay !== currentDay) {
              daysUntilEnd = 7;
            }
            nextEnd.setDate(now.getDate() + daysUntilEnd);
            nextEnd.setHours(endHour, endMinute, 0, 0);
            event.status = "ongoing";
            return nextEnd;
          }
        }
      }
    }

    if (endDays.includes(currentDay) && !startDays.includes(currentDay)) {
      if (currentTime < eventEndTime) {
        const nextEnd = new Date(now);
        nextEnd.setHours(endHour, endMinute, 0, 0);
        event.status = "ongoing";
        return nextEnd;
      }
      if (currentTime >= eventEndTime) {
        const nextStartDayIndex = findNextStartDay(startDays, currentDay);
        const daysUntilNextStart = (startDays[nextStartDayIndex] - currentDay + 7) % 7 || 7;
        const nextStart = new Date(now);
        nextStart.setDate(now.getDate() + daysUntilNextStart);
        nextStart.setHours(startHour, startMinute, 0, 0);
        event.status = "upcoming";
        return nextStart;
      }
    }

    if (isMultiDayEvent && !startDays.includes(currentDay) && !endDays.includes(currentDay)) {
      for (let i = 0; i < startDays.length; i++) {
        const startDay = startDays[i];
        const endDay = endDays[i];
        if (startDay < endDay) {
          if (currentDay > startDay && currentDay < endDay) {
            const nextEnd = new Date(now);
            const daysUntilEnd = endDay - currentDay;
            nextEnd.setDate(now.getDate() + daysUntilEnd);
            nextEnd.setHours(endHour, endMinute, 0, 0);
            event.status = "ongoing";
            return nextEnd;
          }
        } else if (startDay > endDay) {
          if (currentDay > startDay || currentDay < endDay) {
            const nextEnd = new Date(now);
            let daysUntilEnd;
            if (currentDay < endDay) {
              daysUntilEnd = endDay - currentDay;
            } else {
              daysUntilEnd = 7 - currentDay + endDay;
            }
            nextEnd.setDate(now.getDate() + daysUntilEnd);
            nextEnd.setHours(endHour, endMinute, 0, 0);
            event.status = "ongoing";
            return nextEnd;
          }
        }
      }
    }

    if (!startDays.includes(currentDay) && !endDays.includes(currentDay)) {
      const nextStartDayIndex = findNextStartDay(startDays, currentDay);
      const daysUntilNextStart = (startDays[nextStartDayIndex] - currentDay + 7) % 7 || 7;
      const nextStart = new Date(now);
      nextStart.setDate(now.getDate() + daysUntilNextStart);
      nextStart.setHours(startHour, startMinute, 0, 0);
      event.status = "upcoming";
      return nextStart;
    }

    const fallback = new Date(now);
    fallback.setDate(now.getDate() + 1);
    fallback.setHours(startHour, startMinute, 0, 0);
    event.status = "upcoming";
    return fallback;
}

const event = {
    start_days: [2, 5],
    start_time: "15:00",
    end_time: "22:00",
    end_days: [4, 0],
};

const datesToTest = [
    new Date('2026-07-10T16:00:00'), // Friday before start
    new Date('2026-07-10T18:00:00'), // Friday after start
    new Date('2026-07-11T12:00:00'), // Saturday
    new Date('2026-07-12T12:00:00'), // Sunday
    new Date('2026-07-13T00:30:00'), // Monday after end
];

for (const d of datesToTest) {
    const res = calculateComplexEventExpiry(event, d);
    console.log(`Now: ${d.toLocaleString('en-US', {weekday: 'long', hour12: false, hour: '2-digit', minute: '2-digit'})} | Status: ${event.status} | Next: ${res.toLocaleString('en-US', {weekday: 'long', hour12: false, hour: '2-digit', minute: '2-digit'})}`);
}
