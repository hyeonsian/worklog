import { createDAVClient, DAVCalendar, DAVObject } from "tsdav";

export interface CalDAVCredentials {
  serverUrl: string;
  username: string;
  password: string;
}

export interface CalendarInfo {
  url: string;
  displayName: string;
  ctag?: string;
  description?: string;
  color?: string;
}

export interface CalendarEvent {
  uid: string;
  url: string;
  etag: string;
  title: string;
  description?: string;
  location?: string;
  start: string; // ISO datetime
  end: string;   // ISO datetime
  allDay: boolean;
  color?: string;
}

/**
 * Parse VCALENDAR ICS data and extract VEVENT properties.
 * Handles both date-time (DTSTART;TZID=...) and date-only (DTSTART;VALUE=DATE) formats.
 */
function parseICSEvent(icsData: string, calendarColor?: string): CalendarEvent | null {
  // Extract VEVENT block
  const veventMatch = icsData.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/);
  if (!veventMatch) return null;
  const vevent = veventMatch[0];

  const getField = (name: string): string | undefined => {
    // Match field with possible parameters (e.g., DTSTART;TZID=Asia/Seoul:20260101T090000)
    const regex = new RegExp(`^${name}[;:](.*)$`, "m");
    const match = vevent.match(regex);
    if (!match) return undefined;
    // If there are parameters, the value is after the last colon
    const raw = match[1];
    const colonIdx = raw.lastIndexOf(":");
    return colonIdx >= 0 ? raw.substring(colonIdx + 1) : raw;
  };

  const uid = getField("UID");
  const summary = getField("SUMMARY");
  const description = getField("DESCRIPTION");
  const location = getField("LOCATION");
  const dtstart = getField("DTSTART");
  const dtend = getField("DTEND");

  if (!uid || !dtstart) return null;

  // Detect all-day events (VALUE=DATE format: YYYYMMDD, 8 chars)
  const allDay = dtstart.length === 8;

  const parseDateTime = (dt: string): string => {
    if (dt.length === 8) {
      // Date only: YYYYMMDD
      return `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}T00:00:00`;
    }
    // DateTime: YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
    const d = dt.replace("Z", "");
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${d.slice(9, 11)}:${d.slice(11, 13)}:${d.slice(13, 15)}`;
  };

  return {
    uid,
    url: "",
    etag: "",
    title: summary || "(제목 없음)",
    description: description?.replace(/\\n/g, "\n").replace(/\\,/g, ","),
    location: location?.replace(/\\,/g, ","),
    start: parseDateTime(dtstart),
    end: dtend ? parseDateTime(dtend) : parseDateTime(dtstart),
    allDay,
    color: calendarColor,
  };
}

/**
 * Create a CalDAV client connected to iCloud.
 */
async function getClient(credentials: CalDAVCredentials) {
  const client = await createDAVClient({
    serverUrl: credentials.serverUrl,
    credentials: {
      username: credentials.username,
      password: credentials.password,
    },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });
  return client;
}

/**
 * List all calendars available in the account.
 */
export async function listCalendars(
  credentials: CalDAVCredentials
): Promise<CalendarInfo[]> {
  const client = await getClient(credentials);
  const calendars = await client.fetchCalendars();

  return calendars.map((cal: DAVCalendar) => ({
    url: cal.url,
    displayName: typeof cal.displayName === "string" ? cal.displayName : "Unnamed",
    ctag: cal.ctag,
    description: cal.description,
    color: typeof cal.calendarColor === "string" ? cal.calendarColor : undefined,
  }));
}

/**
 * Fetch events from a specific calendar within a date range.
 */
export async function fetchEvents(
  credentials: CalDAVCredentials,
  calendarUrl: string,
  start: Date,
  end: Date,
  calendarColor?: string
): Promise<CalendarEvent[]> {
  const client = await getClient(credentials);

  const calendarObjects = await client.fetchCalendarObjects({
    calendar: {
      url: calendarUrl,
    } as DAVCalendar,
    timeRange: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
  });

  const events: CalendarEvent[] = [];
  for (const obj of calendarObjects) {
    if (!obj.data) continue;
    const event = parseICSEvent(obj.data as string, calendarColor);
    if (event) {
      event.url = obj.url;
      event.etag = obj.etag || "";
      events.push(event);
    }
  }

  return events.sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );
}

/**
 * Build ICS data for a new event.
 */
function buildICS(event: {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  start: string; // ISO
  end: string;   // ISO
  allDay?: boolean;
}): string {
  const now = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d+/, "");

  const formatDT = (iso: string, allDay?: boolean) => {
    if (allDay) {
      return iso.replace(/-/g, "").slice(0, 8);
    }
    return iso.replace(/[-:]/g, "").replace(/\.\d+/, "");
  };

  const dtPrefix = event.allDay ? ";VALUE=DATE" : "";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Worklog//CalDAV//EN",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${now}`,
    `DTSTART${dtPrefix}:${formatDT(event.start, event.allDay)}`,
    `DTEND${dtPrefix}:${formatDT(event.end, event.allDay)}`,
    `SUMMARY:${event.title.replace(/,/g, "\\,").replace(/\n/g, "\\n")}`,
  ];

  if (event.description) {
    lines.push(
      `DESCRIPTION:${event.description.replace(/,/g, "\\,").replace(/\n/g, "\\n")}`
    );
  }
  if (event.location) {
    lines.push(
      `LOCATION:${event.location.replace(/,/g, "\\,").replace(/\n/g, "\\n")}`
    );
  }

  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

/**
 * Create a new event in the specified calendar.
 */
export async function createEvent(
  credentials: CalDAVCredentials,
  calendarUrl: string,
  event: {
    title: string;
    description?: string;
    location?: string;
    start: string;
    end: string;
    allDay?: boolean;
  }
): Promise<{ uid: string }> {
  const client = await getClient(credentials);
  const uid = `worklog-${Date.now()}-${Math.random().toString(36).slice(2)}@worklog`;

  const icsData = buildICS({ ...event, uid });

  await client.createCalendarObject({
    calendar: { url: calendarUrl } as DAVCalendar,
    filename: `${uid}.ics`,
    iCalString: icsData,
  });

  return { uid };
}

/**
 * Delete an event from the calendar.
 */
export async function deleteEvent(
  credentials: CalDAVCredentials,
  eventUrl: string,
  etag: string
): Promise<void> {
  const client = await getClient(credentials);
  await client.deleteCalendarObject({
    calendarObject: {
      url: eventUrl,
      etag,
    } as DAVObject,
  });
}
