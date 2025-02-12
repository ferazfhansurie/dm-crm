export const validateCalendarId = (calendarId: string | null | undefined) => {
  if (!calendarId || calendarId.trim() === '') {
    return true;
  }
  
  const regex = /^[\w.-]+[#]?[\w.-]*@[\w.-]+\.(calendar\.google\.com|gmail\.com)$/;
  return regex.test(calendarId.trim());
};

export const testGoogleCalendarConnection = async (calendarId: string) => {
  try {
    if (!validateCalendarId(calendarId)) {
      console.log('Invalid calendar ID format');
      return false;
    }

    const encodedCalendarId = encodeURIComponent(calendarId.trim());
    const apiKey = import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY;
    
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodedCalendarId}/events?key=${apiKey}&maxResults=1`;
    console.log('Making request to:', url);

    const response = await fetch(url);
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.log('Full error response:', errorData);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Connection test error:', error);
    return false;
  }
}; 