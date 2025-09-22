import { calendar_v3, google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { IStorage } from './storage';

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  status?: string;
}

export interface CalendarSyncResult {
  syncedEvents: number;
  errors: string[];
  lastSyncToken?: string;
}

export class GoogleCalendarService {
  private calendar: calendar_v3.Calendar;
  private oauth2Client: OAuth2Client;

  constructor() {
    // Initialize OAuth2 client with environment variables
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Get authorization URL for coaches to connect their Google Calendar
   */
  getAuthUrl(state?: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent to get refresh token
      state: state // CSRF protection
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<{ accessToken: string; refreshToken: string }> {
    const { tokens } = await this.oauth2Client.getToken(code);
    
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Failed to obtain access tokens from Google');
    }

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token
    };
  }

  /**
   * Set refresh token for a coach
   */
  setRefreshToken(refreshToken: string) {
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken
    });
  }

  /**
   * Get coach's primary calendar ID
   */
  async getPrimaryCalendarId(): Promise<string> {
    try {
      const response = await this.calendar.calendarList.list();
      const calendars = response.data.items || [];
      
      const primaryCalendar = calendars.find(cal => cal.primary);
      if (!primaryCalendar?.id) {
        throw new Error('No primary calendar found');
      }

      return primaryCalendar.id;
    } catch (error) {
      console.error('Error getting primary calendar:', error);
      throw new Error('Failed to access Google Calendar');
    }
  }

  /**
   * Check if a time slot is available in Google Calendar
   */
  async checkAvailability(
    calendarId: string,
    startDateTime: string,
    endDateTime: string
  ): Promise<boolean> {
    try {
      const response = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: startDateTime,
          timeMax: endDateTime,
          items: [{ id: calendarId }]
        }
      });

      const busyTimes = response.data.calendars?.[calendarId]?.busy || [];
      return busyTimes.length === 0;
    } catch (error) {
      console.error('Error checking calendar availability:', error);
      throw new Error('Failed to check calendar availability');
    }
  }

  /**
   * Create a booking event in Google Calendar
   */
  async createBookingEvent(
    calendarId: string,
    bookingData: {
      id: string;
      title: string;
      description: string;
      startDateTime: string;
      endDateTime: string;
      studentName: string;
      location: string;
    }
  ): Promise<string> {
    try {
      const event = await this.calendar.events.insert({
        calendarId,
        requestBody: {
          summary: bookingData.title,
          description: `${bookingData.description}\n\nStudent: ${bookingData.studentName}\nLocation: ${bookingData.location}`,
          start: {
            dateTime: bookingData.startDateTime,
            timeZone: 'America/New_York' // TODO: Make this configurable
          },
          end: {
            dateTime: bookingData.endDateTime,
            timeZone: 'America/New_York'
          },
          location: bookingData.location,
          // Store booking ID in extended properties for two-way sync
          extendedProperties: {
            private: {
              bookingId: bookingData.id,
              bookingSystem: 'golf-coach-platform'
            }
          }
        }
      });

      if (!event.data.id) {
        throw new Error('Failed to create calendar event');
      }

      return event.data.id;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw new Error('Failed to create calendar event');
    }
  }

  /**
   * Update a booking event in Google Calendar
   */
  async updateBookingEvent(
    calendarId: string,
    eventId: string,
    bookingData: {
      title: string;
      description: string;
      startDateTime: string;
      endDateTime: string;
      studentName: string;
      location: string;
    }
  ): Promise<void> {
    try {
      await this.calendar.events.update({
        calendarId,
        eventId,
        requestBody: {
          summary: bookingData.title,
          description: `${bookingData.description}\n\nStudent: ${bookingData.studentName}\nLocation: ${bookingData.location}`,
          start: {
            dateTime: bookingData.startDateTime,
            timeZone: 'America/New_York'
          },
          end: {
            dateTime: bookingData.endDateTime,
            timeZone: 'America/New_York'
          },
          location: bookingData.location
        }
      });
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw new Error('Failed to update calendar event');
    }
  }

  /**
   * Delete a booking event from Google Calendar
   */
  async deleteBookingEvent(calendarId: string, eventId: string): Promise<void> {
    try {
      await this.calendar.events.delete({
        calendarId,
        eventId
      });
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw new Error('Failed to delete calendar event');
    }
  }

  /**
   * Sync external calendar events to local database
   */
  async syncExternalEvents(
    storage: IStorage,
    coachId: string,
    calendarId: string,
    syncToken?: string
  ): Promise<CalendarSyncResult> {
    try {
      const response = await this.calendar.events.list({
        calendarId,
        syncToken,
        singleEvents: true,
        showDeleted: true,
        maxResults: 250
      });

      const events = response.data.items || [];
      const newSyncToken = response.data.nextSyncToken;
      let syncedEvents = 0;
      const errors: string[] = [];

      for (const event of events) {
        try {
          if (event.status === 'cancelled') {
            // Remove from local database if it exists
            if (event.id) {
              await storage.removeCoachBusyTime(coachId, event.id);
            }
          } else if (event.start?.dateTime && event.end?.dateTime) {
            // Skip events created by our booking system
            const isOurEvent = event.extendedProperties?.private?.bookingSystem === 'golf-coach-platform';
            if (!isOurEvent) {
              // Add/update busy time in local database
              await storage.updateCoachBusyTime({
                coachId,
                startDateTime: new Date(event.start.dateTime),
                endDateTime: new Date(event.end.dateTime),
                source: 'google_calendar',
                externalEventId: event.id || null,
                title: event.summary || 'Busy'
              });
              syncedEvents++;
            }
          }
        } catch (eventError) {
          console.error('Error processing event:', eventError);
          errors.push(`Failed to process event ${event.id}: ${eventError}`);
        }
      }

      return {
        syncedEvents,
        errors,
        lastSyncToken: newSyncToken || undefined
      };
    } catch (error) {
      console.error('Error syncing calendar events:', error);
      if ((error as any).code === 410) {
        // Sync token expired, need full sync
        return this.syncExternalEvents(storage, coachId, calendarId);
      }
      throw new Error('Failed to sync calendar events');
    }
  }

  /**
   * Set up webhook for real-time calendar updates
   */
  async setupWebhook(
    calendarId: string,
    webhookUrl: string,
    channelId: string
  ): Promise<{ channelId: string; resourceId: string; expiration: number }> {
    try {
      const response = await this.calendar.events.watch({
        calendarId,
        requestBody: {
          id: channelId,
          type: 'web_hook',
          address: webhookUrl,
          token: process.env.WEBHOOK_VERIFICATION_TOKEN || 'default-token'
        }
      });

      return {
        channelId: response.data.id || channelId,
        resourceId: response.data.resourceId || '',
        expiration: parseInt(response.data.expiration || '0')
      };
    } catch (error) {
      console.error('Error setting up webhook:', error);
      throw new Error('Failed to set up calendar webhook');
    }
  }

  /**
   * Stop webhook notifications
   */
  async stopWebhook(channelId: string, resourceId: string): Promise<void> {
    try {
      await this.calendar.channels.stop({
        requestBody: {
          id: channelId,
          resourceId: resourceId
        }
      });
    } catch (error) {
      console.error('Error stopping webhook:', error);
      throw new Error('Failed to stop calendar webhook');
    }
  }
}