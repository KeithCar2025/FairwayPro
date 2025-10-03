import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin } from "lucide-react";
import { Coach } from "./CoachCard";

interface BookingModalProps {
  coach: Coach | null;
  isOpen: boolean;
  onClose: () => void;
}

export interface BookingData {
  coachId: string;
  date: Date;
  time: string;
  duration: string;
  lessonType: string;
  location: string;
  notes: string;
  studentInfo: {
    name: string;
    email: string;
    phone: string;
    skillLevel: string;
  };
}

export default function BookingModal({ coach, isOpen, onClose }: BookingModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [lessonType, setLessonType] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [studentInfo, setStudentInfo] = useState({
    name: "",
    email: "",
    phone: "",
    skillLevel: ""
  });
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [errorTimes, setErrorTimes] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    if (!coach || !selectedDate) {
      setAvailableTimes([]);
      setErrorTimes(null);
      return;
    }

    async function fetchTimes() {
      setLoadingTimes(true);
      setErrorTimes(null);
      try {
        const res = await fetch(
          `/api/coaches/${coach.id}/available-times?date=${selectedDate.toISOString().substring(0, 10)}`
        );
        if (res.ok) {
          const data = await res.json();
          setAvailableTimes(data.times || []);
        } else {
          setAvailableTimes([]);
          setErrorTimes("Could not load available times.");
        }
      } catch (error) {
        setAvailableTimes([]);
        setErrorTimes("Failed to fetch available times.");
      } finally {
        setLoadingTimes(false);
      }
    }

    fetchTimes();
  }, [coach, selectedDate]);

  if (!coach) return null;

  const lessonTypes = [
    { value: "individual", label: "Individual Lesson", price: coach.pricePerHour },
    { value: "group", label: "Small Group (2-3)", price: Math.round(coach.pricePerHour * 0.7) },
    { value: "playing", label: "Playing Lesson", price: coach.pricePerHour + 30 }
  ];

  const calculateTotal = () => {
    const selectedLessonType = lessonTypes.find(t => t.value === lessonType);
    if (!selectedLessonType) return 0;
    const hours = parseInt(duration) / 60;
    return Math.round(selectedLessonType.price * hours);
  };

  // Helper to parse "1:00 PM" etc. into a Date object on selectedDate
  function getDateTime(date: Date, timeStr: string): Date {
    // timeStr format: "1:00 PM"
    const [time, meridian] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (meridian === "PM" && hours !== 12) hours += 12;
    if (meridian === "AM" && hours === 12) hours = 0;
    const dt = new Date(date);
    dt.setHours(hours, minutes, 0, 0);
    return dt;
  }

  const handleBook = async () => {
    setBookingError(null);
    setBookingSuccess(false);
    if (!selectedDate || !selectedTime || !lessonType || !studentInfo.name || !studentInfo.email) {
      setBookingError("Please fill in all required fields");
      return;
    }
    setIsBooking(true);

    try {
      // 1. App-side booking
      const bookingData = {
        coachId: coach.id,
        date: selectedDate, // Date object
        time: selectedTime,
        duration: Number(duration),
        lesson_type: lessonType,
        location: location || coach.location,
        notes,
        totalAmount: String(calculateTotal()),
        studentInfo
      };
      await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(bookingData),
      });

      // 2. Create Google Calendar event
      const startDateTime = getDateTime(selectedDate, selectedTime);
      const endDateTime = new Date(startDateTime.getTime() + parseInt(duration) * 60000);

      const eventRes = await fetch('/api/google/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
		coachUserId: coach.userId,
          summary: `Lesson with ${studentInfo.name}`,
          description: `Lesson type: ${lessonType}\nStudent: ${studentInfo.name}\nEmail: ${studentInfo.email}\nPhone: ${studentInfo.phone}\nSkill Level: ${studentInfo.skillLevel}\nNotes: ${notes}`,
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString(),
        }),
      });

      if (!eventRes.ok) {
        // Try to parse JSON error, fallback to text
        let msg = "Failed to add event to coach's Google Calendar.";
        try {
          const data = await eventRes.json();
          if (data.error) msg += "\n" + data.error;
          if (data.details) msg += "\n" + data.details;
          if (data.google) msg += "\n" + JSON.stringify(data.google);
        } catch {
          msg += "\n" + await eventRes.text();
        }
        throw new Error(msg);
      }

      setBookingSuccess(true);
      setTimeout(() => {
        setIsBooking(false);
        onClose();
      }, 1500);

    } catch (error) {
      setBookingError(error.message || "Booking failed.");
      setIsBooking(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={coach.image} alt={coach.name} />
              <AvatarFallback>
                {coach.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            Book a lesson with {coach.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Coach Info Summary */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{coach.location}</span>
              </div>
              <Badge variant="outline">{coach.rating} ⭐ ({coach.reviewCount})</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{coach.bio}</p>
          </div>

          {/* Lesson Type Selection */}
          <div>
            <Label className="text-base font-medium">Lesson Type *</Label>
            <div className="grid gap-3 mt-2">
              {lessonTypes.map((type) => (
                <div 
                  key={type.value}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    lessonType === type.value 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setLessonType(type.value)}
                  data-testid={`select-lesson-type-${type.value}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{type.label}</span>
                    <span className="text-primary font-bold">${type.price}/hr</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Date & Time Selection */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label className="text-base font-medium">Select Date *</Label>
              <div className="mt-2">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date() || date.getDay() === 0}
                  className="rounded-md border"
                  data-testid="calendar-date-selection"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Available Times *</Label>
                {loadingTimes && (
                  <div className="text-sm text-muted-foreground">Loading...</div>
                )}
                {errorTimes && (
                  <div className="text-sm text-destructive">{errorTimes}</div>
                )}
                {!loadingTimes && !errorTimes && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {availableTimes.length > 0 ? (
                      availableTimes.map((time) => (
                        <Button
                          key={time}
                          variant={selectedTime === time ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedTime(time)}
                          data-testid={`button-time-${time.replace(/[: ]/g, '-')}`}
                        >
                          {time}
                        </Button>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-sm">No available times</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="duration" className="text-base font-medium">Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="mt-2" data-testid="select-duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Student Information */}
          <div>
            <Label className="text-base font-medium mb-3 block">Student Information</Label>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={studentInfo.name}
                  onChange={(e) => setStudentInfo({...studentInfo, name: e.target.value})}
                  placeholder="Enter your full name"
                  className="mt-1"
                  data-testid="input-student-name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={studentInfo.email}
                  onChange={(e) => setStudentInfo({...studentInfo, email: e.target.value})}
                  placeholder="Enter your email"
                  className="mt-1"
                  data-testid="input-student-email"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={studentInfo.phone}
                  onChange={(e) => setStudentInfo({...studentInfo, phone: e.target.value})}
                  placeholder="Enter your phone"
                  className="mt-1"
                  data-testid="input-student-phone"
                />
              </div>
              <div>
                <Label htmlFor="skill-level">Skill Level</Label>
                <Select 
                  value={studentInfo.skillLevel} 
                  onValueChange={(value) => setStudentInfo({...studentInfo, skillLevel: value})}
                >
                  <SelectTrigger className="mt-1" data-testid="select-skill-level">
                    <SelectValue placeholder="Select skill level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Location & Notes */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="location">Preferred Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={`Default: ${coach.location}`}
                className="mt-1"
                data-testid="input-lesson-location"
              />
            </div>
            <div>
              <Label htmlFor="notes">Special Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any specific goals or requirements for the lesson?"
                className="mt-1"
                data-testid="textarea-lesson-notes"
              />
            </div>
          </div>

          {/* Booking Summary */}
          {lessonType && selectedDate && selectedTime && (
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Booking Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>{selectedDate.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time:</span>
                  <span>{selectedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span>{parseInt(duration) === 60 ? '1 hour' : `${duration} minutes`}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-2 border-t">
                  <span>Total:</span>
                  <span className="text-primary">${calculateTotal()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Booking Feedback */}
          {bookingError && (
            <div className="text-red-600 text-sm font-medium">{bookingError}</div>
          )}
          {bookingSuccess && (
            <div className="text-green-600 text-sm font-medium">Booking successful! Added to calendar.</div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleBook}
              disabled={
                !selectedDate || !selectedTime || !lessonType ||
                !studentInfo.name || !studentInfo.email || isBooking
              }
              className="flex-1"
              data-testid="button-confirm-booking"
            >
              {isBooking ? "Booking..." : `Book Lesson - $${calculateTotal()}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}